import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Copy,
  ArrowRight,
  X,
  PlusCircle,
  FolderOpen,
  FileUp
} from 'lucide-react';

interface InquiryItem {
  id?: string;
  srNo: number;
  partNumber: string;
  description: string;
  manufacturer: string;
  quantity: number;
  unit: string;
  remarks: string;
  productId?: string | null;
}

export default function Inquiries() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals & Forms
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  // Excel Import States
  const [importCustomerName, setImportCustomerName] = useState('');
  const [importCompanyName, setImportCompanyName] = useState('');
  const [parsedInquiryItems, setParsedInquiryItems] = useState<InquiryItem[]>([]);

  // Inquiry Form State
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<InquiryItem[]>([
    { srNo: 1, partNumber: '', description: '', manufacturer: '', quantity: 1, unit: 'Nos', remarks: '' }
  ]);

  // Product Autocomplete suggestion state
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Fetch Inquiries
  const { data: inquiriesData, isLoading } = useQuery<any>({
    queryKey: ['inquiries', search, statusFilter, page],
    queryFn: () => api.get(`/api/inquiries?search=${search}&status=${statusFilter}&page=${page}&limit=10`)
  });

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rawRows.length === 0) {
          alert('Spreadsheet is empty.');
          return;
        }

        const headers = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        const partNumberIdx = headers.findIndex((h: string) => h.includes('part') || h.includes('pn') || h.includes('code') || h === 'order code' || h === 'ordercode' || h === 'partnumber');
        const descIdx = headers.findIndex((h: string) => h.includes('desc') || h.includes('name') || h.includes('description'));
        const mfrIdx = headers.findIndex((h: string) => h.includes('mfr') || h.includes('manufacturer') || h.includes('brand'));
        const qtyIdx = headers.findIndex((h: string) => h.includes('qty') || h.includes('quantity') || h.includes('count') || h === 'quantity');
        const unitIdx = headers.findIndex((h: string) => h.includes('unit') || h.includes('uom'));
        const remarksIdx = headers.findIndex((h: string) => h.includes('remark') || h.includes('comment'));

        if (partNumberIdx === -1) {
          alert('Could not find Part Number column in sheet. Please ensure column header contains "Part" or "PN".');
          return;
        }

        const itemsParsed: InquiryItem[] = rawRows.slice(1).map((row: any, index: number) => {
          return {
            srNo: index + 1,
            partNumber: String(row[partNumberIdx] || '').trim(),
            description: descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : '',
            manufacturer: mfrIdx !== -1 && row[mfrIdx] ? String(row[mfrIdx]).trim() : '',
            quantity: qtyIdx !== -1 && Number(row[qtyIdx]) ? Number(row[qtyIdx]) : 1,
            unit: unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : 'Nos',
            remarks: remarksIdx !== -1 && row[remarksIdx] ? String(row[remarksIdx]).trim() : ''
          };
        }).filter((item: any) => item.partNumber !== '');

        if (itemsParsed.length === 0) {
          alert('No valid rows found to import.');
          return;
        }

        setParsedInquiryItems(itemsParsed);
        setIsImportModalOpen(true);
      } catch (err) {
        alert('Failed to parse sheet file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Fetch products for smart search autocomplete
  const handleProductSearch = async (val: string, index: number) => {
    const updated = [...items];
    updated[index].partNumber = val;
    setItems(updated);

    if (val.length < 2) {
      setSuggestions([]);
      setActiveItemIndex(null);
      return;
    }

    try {
      const res = await api.get(`/api/products?search=${val}&limit=5`) as any;
      setSuggestions(res.products || []);
      setActiveItemIndex(index);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSelectProduct = (prod: any, index: number) => {
    const updated = [...items];
    updated[index].partNumber = prod.partNumber;
    updated[index].description = prod.description || prod.name;
    updated[index].manufacturer = prod.manufacturer || '';
    updated[index].unit = prod.unit || 'Nos';
    updated[index].productId = prod.id;
    setItems(updated);
    setSuggestions([]);
    setActiveItemIndex(null);
  };

  // Mutate create inquiry
  const createInquiryMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/inquiries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      setIsCreateOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setCustomerName('');
    setCompanyName('');
    setDepartmentName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setReferenceNumber('');
    setSubject('');
    setRemarks('');
    setItems([{ srNo: 1, partNumber: '', description: '', manufacturer: '', quantity: 1, unit: 'Nos', remarks: '' }]);
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      { srNo: items.length + 1, partNumber: '', description: '', manufacturer: '', quantity: 1, unit: 'Nos', remarks: '' }
    ]);
  };

  const handleDeleteItemRow = (index: number) => {
    const filtered = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 }));
    setItems(filtered.length > 0 ? filtered : [{ srNo: 1, partNumber: '', description: '', manufacturer: '', quantity: 1, unit: 'Nos', remarks: '' }]);
  };

  const handleDuplicateItemRow = (index: number) => {
    const rowToDuplicate = items[index];
    const newItems = [...items];
    newItems.splice(index + 1, 0, {
      ...rowToDuplicate,
      srNo: index + 2
    });
    setItems(newItems.map((item, i) => ({ ...item, srNo: i + 1 })));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInquiryMutation.mutate({
      inquiryDate: new Date().toISOString(),
      customerName,
      companyName,
      departmentName,
      phone,
      email,
      address,
      referenceNumber,
      subject,
      remarks,
      items
    });
  };

  const handleConvertToQuotation = (inq: any) => {
    // Save to session or navigation state to populate in Quotations page creation
    navigate('/quotations', { state: { fromInquiry: inq } });
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Customer Inquiries</h2>
          <p className="text-sm text-corporate-muted mt-1">Manage incoming leads, customer RFQs, and auto-catalog new modules.</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-105 hover:bg-brand-200 text-brand-700 rounded font-semibold border border-brand-300 transition-colors"
            >
              <FileUp className="w-4 h-4" />
              <span>Import from PC</span>
            </button>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelImport}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded font-semibold shadow-dynamics transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Inquiry</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-corporate-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search inquiries (number, company, subject...)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-48 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="QUOTED">Quoted</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Grid Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">Inquiry No</th>
              <th className="p-3">Company</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Contact Person</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-corporate-muted">Loading inquiries catalog...</td>
              </tr>
            ) : inquiriesData?.inquiries?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-corporate-muted">No customer inquiries found.</td>
              </tr>
            ) : (
              inquiriesData?.inquiries?.map((inq: any) => (
                <tr key={inq.id} className="hover:bg-brand-50/20">
                  <td className="p-3 font-mono font-bold text-brand-700">{inq.inquiryNumber}</td>
                  <td className="p-3 font-semibold">{inq.companyName}</td>
                  <td className="p-3 text-corporate-muted max-w-xs truncate">{inq.subject || 'N/A'}</td>
                  <td className="p-3">{inq.customerName}</td>
                  <td className="p-3">{new Date(inq.inquiryDate).toLocaleDateString()}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      inq.status === 'QUOTED' ? 'bg-green-100 text-green-700' :
                      inq.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                      inq.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => { setSelectedInquiry(inq); setIsViewOpen(true); }}
                      className="p-1 hover:bg-brand-100 text-brand-600 rounded inline-block"
                      title="View RFQ details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {inq.status !== 'QUOTED' && (
                      <button
                        onClick={() => handleConvertToQuotation(inq)}
                        className="p-1 hover:bg-green-100 text-green-600 rounded inline-block"
                        title="Convert to Quotation"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* NEW INQUIRY MODAL */}
      {/* ==================================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-4xl max-h-[90vh] overflow-y-auto text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold">Register Customer RFQ Inquiry</h3>
              <button onClick={() => setIsCreateOpen(false)} className="hover:bg-brand-600 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Customer Name*</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Company Name*</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Department Name</label>
                  <input type="text" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Reference Number (RFQ ID)</label>
                  <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Subject / RFQ Target</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Procurement of Capacitors for Satellites" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Customer Delivery Address</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="h-16" />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-brand-900">Inquiry Product Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center space-x-1 py-1 px-2.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200 font-semibold transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="border border-corporate-border rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-corporate-bg text-corporate-muted font-bold border-b border-corporate-border">
                        <th className="p-2 w-10 text-center">Sr #</th>
                        <th className="p-2 w-48">Part Number / Order Code*</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 w-28">Manufacturer</th>
                        <th className="p-2 w-16 text-right">Qty*</th>
                        <th className="p-2 w-16">UOM</th>
                        <th className="p-2 w-12 text-center">Ops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-corporate-border/30 bg-white">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-center font-bold text-corporate-muted">{item.srNo}</td>
                          <td className="p-2 relative">
                            <input
                              type="text"
                              value={item.partNumber}
                              onChange={(e) => handleProductSearch(e.target.value, idx)}
                              required
                              placeholder="Type Part Number..."
                              className="w-full font-mono text-[10px]"
                            />
                            {/* Autocomplete Suggestions */}
                            {activeItemIndex === idx && suggestions.length > 0 && (
                              <div className="absolute left-2 right-2 top-10 bg-white border border-corporate-border shadow-card rounded z-20 divide-y divide-corporate-border/30">
                                {suggestions.map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => handleSelectProduct(p, idx)}
                                    className="p-2 hover:bg-brand-50 cursor-pointer font-sans"
                                  >
                                    <div className="font-bold text-brand-800">{p.partNumber}</div>
                                    <div className="text-[10px] text-corporate-muted truncate">{p.name} - {p.manufacturer}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].description = e.target.value;
                                setItems(updated);
                              }}
                              className="w-full"
                              placeholder="e.g. CAP CER 10000PF 100V 0805"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.manufacturer}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].manufacturer = e.target.value;
                                setItems(updated);
                              }}
                              className="w-full"
                              placeholder="TDK, AVX..."
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].quantity = Math.max(1, Number(e.target.value));
                                setItems(updated);
                              }}
                              required
                              className="w-full text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].unit = e.target.value;
                                setItems(updated);
                              }}
                              className="w-full"
                              placeholder="Nos, Pcs..."
                            />
                          </td>
                          <td className="p-2 text-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateItemRow(idx)}
                              className="text-brand-600 hover:text-brand-800 p-0.5 inline-block"
                              title="Duplicate row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItemRow(idx)}
                              className="text-red-500 hover:text-red-700 p-0.5 inline-block"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Additional Remarks / Special Requirements</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-16" />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-corporate-border">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="py-1.5 px-4 border border-corporate-border rounded font-bold">Cancel</button>
                <button type="submit" disabled={createInquiryMutation.isPending} className="py-1.5 px-4 bg-brand-500 text-white rounded font-bold disabled:opacity-50">
                  {createInquiryMutation.isPending ? 'Saving inquiry...' : 'Register RFQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DETAILED VIEW MODAL */}
      {/* ==================================================================== */}
      {isViewOpen && selectedInquiry && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-3xl overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">RFQ Lead: {selectedInquiry.inquiryNumber}</h3>
              <button onClick={() => setIsViewOpen(false)} className="hover:bg-brand-600 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 border-b border-corporate-border pb-4">
                <div>
                  <h4 className="font-bold text-[10px] text-corporate-muted uppercase tracking-wider mb-2">Customer Details</h4>
                  <div className="space-y-1">
                    <div><span className="font-bold">Contact Person:</span> {selectedInquiry.customerName}</div>
                    <div><span className="font-bold">Company Name:</span> {selectedInquiry.companyName}</div>
                    {selectedInquiry.departmentName && <div><span className="font-bold">Department:</span> {selectedInquiry.departmentName}</div>}
                    {selectedInquiry.phone && <div><span className="font-bold">Phone:</span> {selectedInquiry.phone}</div>}
                    {selectedInquiry.email && <div><span className="font-bold">Email:</span> {selectedInquiry.email}</div>}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-[10px] text-corporate-muted uppercase tracking-wider mb-2">Lead Info</h4>
                  <div className="space-y-1">
                    <div><span className="font-bold">Date Registered:</span> {new Date(selectedInquiry.inquiryDate).toLocaleDateString()}</div>
                    {selectedInquiry.referenceNumber && <div><span className="font-bold">Reference (RFQ ID):</span> {selectedInquiry.referenceNumber}</div>}
                    <div><span className="font-bold">Subject:</span> {selectedInquiry.subject || 'N/A'}</div>
                    <div><span className="font-bold">Lead Status:</span> <span className="font-bold text-brand-600">{selectedInquiry.status}</span></div>
                  </div>
                </div>
              </div>

              {selectedInquiry.address && (
                <div className="border-b border-corporate-border pb-4">
                  <h4 className="font-bold text-[10px] text-corporate-muted uppercase tracking-wider mb-1">Shipping / Delivery Address</h4>
                  <div className="text-corporate-muted">{selectedInquiry.address}</div>
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="font-bold text-[10px] text-corporate-muted uppercase tracking-wider mb-2">Items Requested</h4>
                <div className="border border-corporate-border rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold border-b border-corporate-border">
                        <th className="p-2 text-center w-10">Sr #</th>
                        <th className="p-2 w-40">Part Number</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 w-28">Manufacturer</th>
                        <th className="p-2 text-right w-16">Quantity</th>
                        <th className="p-2 w-12">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-corporate-border/30">
                      {selectedInquiry.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-brand-50/10">
                          <td className="p-2 text-center font-bold text-corporate-muted">{item.srNo}</td>
                          <td className="p-2 font-mono font-bold text-brand-800">{item.partNumber}</td>
                          <td className="p-2">{item.description || 'N/A'}</td>
                          <td className="p-2">{item.manufacturer || 'N/A'}</td>
                          <td className="p-2 text-right font-semibold">{item.quantity}</td>
                          <td className="p-2">{item.unit || 'Pcs'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedInquiry.remarks && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded text-corporate-muted">
                  <div className="font-bold text-blue-900 mb-1">Internal Remarks:</div>
                  {selectedInquiry.remarks}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-corporate-border">
                <button onClick={() => setIsViewOpen(false)} className="py-1.5 px-4 border border-corporate-border rounded font-bold">Close Details</button>
                {selectedInquiry.status !== 'QUOTED' && (
                  <button
                    onClick={() => handleConvertToQuotation(selectedInquiry)}
                    className="flex items-center space-x-1 py-1.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Generate Official Quotation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ==================================================================== */}
      {/* EXCEL IMPORT DETAILS MODAL */}
      {/* ==================================================================== */}
      {isImportModalOpen && parsedInquiryItems.length > 0 && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-2xl overflow-hidden text-xs">
            <div className="bg-green-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-1.5"><FileUp className="w-4 h-4" /> Save Imported RFQ Inquiries</h3>
              <button onClick={() => { setIsImportModalOpen(false); setParsedInquiryItems([]); }} className="hover:bg-green-700 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createInquiryMutation.mutate({
                  inquiryDate: new Date().toISOString(),
                  customerName: importCustomerName,
                  companyName: importCompanyName,
                  subject: 'Imported RFQ Lead',
                  items: parsedInquiryItems
                }, {
                  onSuccess: () => {
                    setIsImportModalOpen(false);
                    setParsedInquiryItems([]);
                    setImportCustomerName('');
                    setImportCompanyName('');
                  }
                });
              }}
              className="p-6 space-y-4"
            >
              <div className="bg-green-50 border border-green-100 p-3 rounded text-[11px] text-green-800">
                ✔️ **File Parsed Successfully**: We found **{parsedInquiryItems.length} items** in the sheet. Please specify Customer details to finalize.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Client Company Name*</label>
                  <input type="text" value={importCompanyName} onChange={(e) => setImportCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Contact Person Name*</label>
                  <input type="text" value={importCustomerName} onChange={(e) => setImportCustomerName(e.target.value)} required />
                </div>
              </div>

              {/* Items List preview */}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Items Preview</label>
                <div className="border border-corporate-border rounded overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-corporate-bg text-corporate-muted font-bold border-b border-corporate-border">
                        <th className="p-1.5 w-8 text-center">#</th>
                        <th className="p-1.5 w-32">Part Number</th>
                        <th className="p-1.5">Description</th>
                        <th className="p-1.5 w-16 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-corporate-border/30 bg-white">
                      {parsedInquiryItems.map((item, i) => (
                        <tr key={i}>
                          <td className="p-1.5 text-center">{item.srNo}</td>
                          <td className="p-1.5 font-mono text-brand-800">{item.partNumber}</td>
                          <td className="p-1.5">{item.description}</td>
                          <td className="p-1.5 text-right">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-corporate-border">
                <button
                  type="button"
                  onClick={() => { setIsImportModalOpen(false); setParsedInquiryItems([]); }}
                  className="py-1.5 px-4 border border-corporate-border rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInquiryMutation.isPending}
                  className="py-1.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-bold disabled:opacity-50"
                >
                  {createInquiryMutation.isPending ? 'Saving RFQ...' : 'Confirm Save Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
