import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../utils/api.js';
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

type ImportType = 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS' | 'INVENTORY';

interface DBField {
  key: string;
  label: string;
  required: boolean;
}

const REQUIRED_FIELDS: Record<ImportType, DBField[]> = {
  PRODUCTS: [
    { key: 'partNumber', label: 'Part Number / Order Code', required: true },
    { key: 'name', label: 'Product Name', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'brandName', label: 'Brand Name', required: false },
    { key: 'categoryName', label: 'Category Name', required: false },
    { key: 'manufacturer', label: 'Manufacturer', required: false },
    { key: 'purchasePrice', label: 'Purchase Price (RMB/PKR)', required: false },
    { key: 'sellingPrice', label: 'Selling Price (PKR)', required: false },
    { key: 'unit', label: 'Unit (UOM)', required: false },
    { key: 'quantity', label: 'Initial Quantity', required: false }
  ],
  CUSTOMERS: [
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'contactPerson', label: 'Contact Person Name', required: true },
    { key: 'email', label: 'Email Address', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'departmentName', label: 'Department Name', required: false },
    { key: 'address', label: 'Delivery Address', required: false },
    { key: 'projects', label: 'Projects Remarks', required: false }
  ],
  SUPPLIERS: [
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'contactName', label: 'Contact Name', required: true },
    { key: 'email', label: 'Email Address', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'address', label: 'Office Address', required: false },
    { key: 'country', label: 'Country of Operation', required: false }
  ],
  INVENTORY: [
    { key: 'partNumber', label: 'Part Number', required: true },
    { key: 'quantity', label: 'Current Quantity Level', required: true }
  ]
};

export default function ExcelWizard() {
  const [importType, setImportType] = useState<ImportType>('PRODUCTS');
  const [step, setStep] = useState<number>(1); // 1: Target, 2: Load File, 3: Column Map, 4: Preview & Validate, 5: Done
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // dbFieldKey -> fileHeader
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File loading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (data.length === 0) {
          throw new Error('This spreadsheet appears to be empty.');
        }

        const headers = data[0].map((h: any) => String(h || '').trim());
        setFileHeaders(headers);

        // Convert rows to objects
        const rows = data.slice(1).map((row: any) => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header: string, idx: number) => {
            rowObj[header] = row[idx];
          });
          return rowObj;
        });

        setSheetData(rows);

        // Auto-detect mapping
        const initialMappings: Record<string, string> = {};
        REQUIRED_FIELDS[importType].forEach((dbField) => {
          const matchedHeader = headers.find(
            (h: string) =>
              h.toLowerCase() === dbField.key.toLowerCase() ||
              h.toLowerCase().includes(dbField.label.toLowerCase()) ||
              dbField.label.toLowerCase().includes(h.toLowerCase())
          );
          if (matchedHeader) {
            initialMappings[dbField.key] = matchedHeader;
          }
        });

        setMappings(initialMappings);
        setStep(3);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to read spreadsheet file.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (dbKey: string, header: string) => {
    setMappings({ ...mappings, [dbKey]: header });
  };

  // Convert raw sheet data into target database fields structure
  const handleApplyMapping = () => {
    // Check if required fields are mapped
    const missingFields = REQUIRED_FIELDS[importType].filter(
      (f) => f.required && !mappings[f.key]
    );

    if (missingFields.length > 0) {
      setErrorMessage(
        `Please map the following required fields: ${missingFields
          .map((f) => f.label)
          .join(', ')}`
      );
      return;
    }

    const rows = sheetData.map((rawRow) => {
      const mapped: Record<string, any> = {};
      REQUIRED_FIELDS[importType].forEach((f) => {
        const fileHeader = mappings[f.key];
        mapped[f.key] = fileHeader !== undefined ? rawRow[fileHeader] : undefined;
      });
      return mapped;
    });

    setMappedRows(rows);
    setStep(4);
    setErrorMessage(null);
  };

  // Submit bulk imports
  const handleUploadImport = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    let endpoint = '';
    switch (importType) {
      case 'PRODUCTS':
        endpoint = '/api/import/bulk-products';
        break;
      case 'CUSTOMERS':
        endpoint = '/api/import/bulk-customers';
        break;
      case 'SUPPLIERS':
        endpoint = '/api/import/bulk-suppliers';
        break;
      case 'INVENTORY':
        endpoint = '/api/import/bulk-inventory';
        break;
    }

    try {
      const res = await api.post(endpoint, { rows: mappedRows });
      setUploadResult(res);
      setStep(5);
    } catch (err: any) {
      setErrorMessage(err.message || 'Bulk import failed. Please check rows data validity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-brand-900">Excel Import & Export Wizard</h2>
        <p className="text-sm text-corporate-muted mt-1">Map sheet columns, validate records, and bulk import catalogs seamlessly.</p>
      </div>

      {/* Progress tracker */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex justify-between text-center font-semibold text-[10px] text-corporate-muted uppercase">
        <div className={`flex-1 pb-1 border-b-2 ${step >= 1 ? 'border-brand-500 text-brand-500 font-bold' : 'border-transparent'}`}>1. Target Type</div>
        <div className={`flex-1 pb-1 border-b-2 ${step >= 2 ? 'border-brand-500 text-brand-500 font-bold' : 'border-transparent'}`}>2. Upload File</div>
        <div className={`flex-1 pb-1 border-b-2 ${step >= 3 ? 'border-brand-500 text-brand-500 font-bold' : 'border-transparent'}`}>3. Map Columns</div>
        <div className={`flex-1 pb-1 border-b-2 ${step >= 4 ? 'border-brand-500 text-brand-500 font-bold' : 'border-transparent'}`}>4. Review Preview</div>
        <div className={`flex-1 pb-1 border-b-2 ${step >= 5 ? 'border-brand-500 text-brand-500 font-bold' : 'border-transparent'}`}>5. Result Report</div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: TARGET */}
      {step === 1 && (
        <div className="bg-white border border-corporate-border rounded-lg p-6 shadow-dynamics text-center space-y-6">
          <h3 className="text-sm font-bold text-brand-900">What data class do you wish to bulk import?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div
              onClick={() => { setImportType('PRODUCTS'); setStep(2); }}
              className="border border-corporate-border p-6 rounded-lg hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer flex flex-col items-center space-y-3 transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              <div className="font-bold text-brand-900">Product Catalog</div>
              <div className="text-[10px] text-corporate-muted">Part codes, prices, descriptions, and categories.</div>
            </div>
            <div
              onClick={() => { setImportType('CUSTOMERS'); setStep(2); }}
              className="border border-corporate-border p-6 rounded-lg hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer flex flex-col items-center space-y-3 transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              <div className="font-bold text-brand-900">Customer Records</div>
              <div className="text-[10px] text-corporate-muted">Client names, billing addresses, NTN/STRN.</div>
            </div>
            <div
              onClick={() => { setImportType('SUPPLIERS'); setStep(2); }}
              className="border border-corporate-border p-6 rounded-lg hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer flex flex-col items-center space-y-3 transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              <div className="font-bold text-brand-900">Suppliers</div>
              <div className="text-[10px] text-corporate-muted">Vendor databases, phone details, addresses.</div>
            </div>
            <div
              onClick={() => { setImportType('INVENTORY'); setStep(2); }}
              className="border border-corporate-border p-6 rounded-lg hover:border-brand-500 hover:bg-brand-50/20 cursor-pointer flex flex-col items-center space-y-3 transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-brand-500" />
              <div className="font-bold text-brand-900">Inventory Logs</div>
              <div className="text-[10px] text-corporate-muted">Initial warehouse stock level counts.</div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: LOAD FILE */}
      {step === 2 && (
        <div className="bg-white border border-corporate-border rounded-lg p-8 shadow-dynamics text-center space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <Upload className="w-12 h-12 text-brand-500 mx-auto" />
            <h3 className="text-sm font-bold text-brand-900">Upload your Excel or CSV sheet for {importType}</h3>
            <p className="text-[11px] text-corporate-muted">Vite files reader supports .xlsx, .xls, and standard CSV formats.</p>
            <div className="border-2 border-dashed border-corporate-border rounded-lg p-6 hover:bg-brand-50/10 cursor-pointer relative transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span className="font-bold text-brand-700">Click to Browse spreadsheet files</span>
            </div>
            <button
              onClick={() => setStep(1)}
              className="py-1 px-3 border border-corporate-border rounded text-corporate-muted"
            >
              Back to Target
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MAPPING */}
      {step === 3 && (
        <div className="bg-white border border-corporate-border rounded-lg p-6 shadow-dynamics space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-corporate-border">
            <h3 className="text-sm font-bold text-brand-900">Map spreadsheet columns to Database fields</h3>
            <div className="text-corporate-muted font-mono">{sheetData.length} records parsed from file.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-corporate-title">Required Database Columns</h4>
              <div className="space-y-3">
                {REQUIRED_FIELDS[importType].map((field) => (
                  <div key={field.key} className="flex items-center justify-between border-b border-corporate-border/30 pb-2">
                    <div>
                      <span className="font-bold">{field.label}</span>
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <select
                      value={mappings[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className="w-48 text-[11px]"
                    >
                      <option value="">-- Do Not Import --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-corporate-bg/30 p-4 border border-corporate-border rounded-lg space-y-2 text-[11px] text-corporate-muted leading-relaxed">
              <div className="font-bold text-corporate-title mb-2">💡 Tips on column mapping</div>
              <p>1. The wizard automatically tries to auto-detect matching headers by keyword.</p>
              <p>2. Fields marked with <span className="text-red-500 font-bold">*</span> are required for a successful database insert.</p>
              <p>3. If your sheet lacks optional columns, select "-- Do Not Import --" and EIPMS will insert system defaults.</p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-corporate-border">
            <button onClick={() => setStep(2)} className="py-1.5 px-4 border border-corporate-border rounded font-bold">Back</button>
            <button onClick={handleApplyMapping} className="flex items-center space-x-1 py-1.5 px-4 bg-brand-500 text-white rounded font-bold">
              <span>Preview Sheet Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & VALIDATE */}
      {step === 4 && (
        <div className="bg-white border border-corporate-border rounded-lg p-6 shadow-dynamics space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-corporate-border">
            <h3 className="text-sm font-bold text-brand-900">Import Preview & Row validations</h3>
            <button
              onClick={handleUploadImport}
              disabled={isLoading}
              className="py-1.5 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow disabled:opacity-50"
            >
              {isLoading ? 'Importing database records...' : `Bulk Commit ${mappedRows.length} Rows`}
            </button>
          </div>

          {/* Table preview */}
          <div className="border border-corporate-border rounded overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10px] min-w-[700px]">
              <thead>
                <tr className="bg-corporate-bg text-corporate-muted font-bold border-b border-corporate-border uppercase tracking-wider">
                  <th className="p-2 w-10 text-center">Row</th>
                  {REQUIRED_FIELDS[importType]
                    .filter((f) => mappings[f.key])
                    .map((f) => (
                      <th key={f.key} className="p-2">
                        {f.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-corporate-border/30 bg-white">
                {mappedRows.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-brand-50/10">
                    <td className="p-2 text-center text-corporate-muted font-bold">{idx + 1}</td>
                    {REQUIRED_FIELDS[importType]
                      .filter((f) => mappings[f.key])
                      .map((f) => (
                        <td key={f.key} className="p-2 font-semibold">
                          {row[f.key] !== undefined ? String(row[f.key]) : <span className="text-gray-305 italic">NULL</span>}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mappedRows.length > 15 && (
            <div className="text-center font-semibold text-corporate-muted">
              ... and {mappedRows.length - 15} more rows parsed.
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-corporate-border">
            <button onClick={() => setStep(3)} className="py-1.5 px-4 border border-corporate-border rounded font-bold">Back to Mapping</button>
          </div>
        </div>
      )}

      {/* STEP 5: RESULTS REPORT */}
      {step === 5 && uploadResult && (
        <div className="bg-white border border-corporate-border rounded-lg p-8 shadow-dynamics text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-base font-bold text-brand-900">Bulk Import Operations Completed!</h3>
            <p className="text-corporate-muted max-w-md mx-auto">
              We have completed updating your EIPMS database context. Here is the operational import logs summary:
            </p>
          </div>

          {/* Results Summary Box */}
          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 border border-corporate-border p-4 rounded-lg bg-corporate-bg/10">
            <div className="border-r border-corporate-border pb-1">
              <div className="text-2xl font-bold text-green-600">{uploadResult.successCount}</div>
              <div className="text-[10px] text-corporate-muted uppercase tracking-wider font-semibold">Rows Upserted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-650">{uploadResult.errorCount}</div>
              <div className="text-[10px] text-corporate-muted uppercase tracking-wider font-semibold">Failed Rows</div>
            </div>
          </div>

          {uploadResult.errors?.length > 0 && (
            <div className="max-w-xl mx-auto text-left space-y-2">
              <h4 className="font-bold text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Validation Warnings ({uploadResult.errors.length})
              </h4>
              <div className="bg-red-50 border border-red-200 rounded p-4 max-h-48 overflow-y-auto divide-y divide-red-100 font-mono text-[9px] text-red-700">
                {uploadResult.errors.map((err: string, i: number) => (
                  <div key={i} className="py-1.5">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-corporate-border">
            <button
              onClick={() => {
                setStep(1);
                setUploadResult(null);
                setMappedRows([]);
                setSheetData([]);
              }}
              className="flex items-center space-x-1.5 py-2 px-6 bg-brand-500 text-white rounded font-bold mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Import another Sheet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
