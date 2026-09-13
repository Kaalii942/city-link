import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Printer,
  X,
  FileCheck,
  Truck,
  FileText,
  Globe
} from 'lucide-react';
import { MasterLetterheadHeader, MasterLetterheadFooter } from '../components/Letterhead.js';

export default function SalesInvoices() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals & Details
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Active Selected Currency for Invoice Display & Printing (PKR, RMB, USD)
  const [selectedCurrency, setSelectedCurrency] = useState<'PKR' | 'RMB' | 'USD'>('PKR');

  // Fetch Invoices
  const { data: invoicesData, isLoading } = useQuery<any>({
    queryKey: ['invoices', search, statusFilter, page],
    queryFn: () => api.get(`/api/invoices?search=${search}&status=${statusFilter}&page=${page}&limit=10`)
  });

  // Pre-fill / open invoice on navigate from Quotation
  useEffect(() => {
    if (location.state?.fromQuotation) {
      const q = location.state.fromQuotation;
      if (q.salesInvoices && q.salesInvoices.length > 0) {
        api.get(`/api/invoices/${q.salesInvoices[0].id}`).then((res: any) => {
          if (res.invoice) {
            setSelectedInvoice(res.invoice);
            setSelectedCurrency((res.invoice.currency as any) || 'PKR');
            setIsViewOpen(true);
          }
        });
      }
    }
  }, [location.state]);

  // Mark Paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/invoices/${id}`, { status: 'PAID' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsViewOpen(false);
    }
  });

  // Update Invoice Currency Mutation
  const updateCurrencyMutation = useMutation({
    mutationFn: (data: { id: string; currency: string }) =>
      api.put(`/api/invoices/${data.id}`, { currency: data.currency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const triggerPrintSpool = () => {
    if ((window as any).eipms) {
      (window as any).eipms.print({
        silent: false,
        printBackground: true,
        color: true
      });
    } else {
      window.print();
    }
  };

  // Financial calculations based on selected currency
  const getCurrencyFormatting = () => {
    if (!selectedInvoice) return { symbol: 'Rs.', factor: 1 };
    const rmbRate = Number(selectedInvoice.quotation?.rmbRate) || 38.50;
    const usdRate = Number(selectedInvoice.quotation?.usdRate) || 278.50;

    if (selectedCurrency === 'RMB') {
      return { symbol: '¥', factor: 1 / rmbRate };
    }
    if (selectedCurrency === 'USD') {
      return { symbol: '$', factor: 1 / usdRate };
    }
    return { symbol: 'Rs.', factor: 1 };
  };

  const currFormat = getCurrencyFormatting();

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Sales Invoices & Bills</h2>
          <p className="text-sm text-corporate-muted mt-1">
            Official CITY LINK (Engineering & Services) Billing Statements with Multi-Currency Conversion (PKR, RMB, USD).
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-corporate-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoices (invoice number, company, PO number, CR number...)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-48 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Invoices table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">Invoice No</th>
              <th className="p-3">Client Company</th>
              <th className="p-3">Customer PO / CR</th>
              <th className="p-3 text-right">Tax Excl. Amount</th>
              <th className="p-3 text-right">Sales Tax</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-corporate-muted">
                  Loading Sales Invoices history...
                </td>
              </tr>
            ) : invoicesData?.invoices?.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-corporate-muted">
                  No Sales Invoices generated. Generated automatically from Commercial Quotations.
                </td>
              </tr>
            ) : (
              invoicesData?.invoices?.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-brand-50/20">
                  <td className="p-3 font-mono font-bold text-brand-700">{inv.invoiceNumber}</td>
                  <td className="p-3 font-semibold text-corporate-title">
                    {inv.companyName}
                    {inv.contactPerson && <div className="text-[10px] text-corporate-muted font-normal">Attn: {inv.contactPerson}</div>}
                  </td>
                  <td className="p-3 font-mono text-corporate-text">
                    {inv.poNo && <div>PO: {inv.poNo}</div>}
                    {inv.crNo && <div className="text-corporate-muted">CR: {inv.crNo}</div>}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    Rs. {Number(inv.subTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    Rs. {Number(inv.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({Number(inv.taxRate)}%)
                  </td>
                  <td className="p-3 text-right font-bold text-brand-900">
                    Rs. {Number(inv.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : inv.status === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-700'
                          : inv.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setSelectedCurrency((inv.currency as any) || 'PKR');
                        setIsViewOpen(true);
                      }}
                      className="p-1 hover:bg-brand-100 text-brand-600 rounded inline-block"
                      title="View Bill / Invoice Sheet"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate('/challans', { state: { fromInvoice: inv } })}
                      className="p-1 hover:bg-emerald-100 text-emerald-700 rounded inline-block"
                      title="View Mapped Delivery Challan"
                    >
                      <Truck className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* PRINTABLE BILL / INVOICE MODAL WITH CURRENCY SELECTION */}
      {/* ==================================================================== */}
      {isViewOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-xs flex flex-col h-[92vh]">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0 no-print">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-[#F97316]" /> Sales Invoice / Bill: {selectedInvoice.invoiceNumber}
              </h3>
              <div className="flex items-center space-x-3">
                {/* REQUIREMENT 5: CURRENCY SELECTION OPTION FOR INVOICE */}
                <div className="flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded">
                  <Globe className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[11px] font-bold text-gray-200">Currency:</span>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => {
                      const c = e.target.value as 'PKR' | 'RMB' | 'USD';
                      setSelectedCurrency(c);
                      updateCurrencyMutation.mutate({ id: selectedInvoice.id, currency: c });
                    }}
                    className="bg-white text-brand-950 font-bold p-0.5 rounded text-xs"
                  >
                    <option value="PKR">PKR (Rs.)</option>
                    <option value="RMB">RMB (¥)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                {selectedInvoice.status !== 'PAID' && (
                  <button
                    onClick={() => markPaidMutation.mutate(selectedInvoice.id)}
                    className="flex items-center space-x-1.5 py-1 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Mark Paid</span>
                  </button>
                )}
                <button
                  onClick={triggerPrintSpool}
                  className="flex items-center space-x-1.5 py-1 px-3 bg-white text-brand-900 hover:bg-brand-50 font-bold rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice / Export PDF</span>
                </button>
                <button onClick={() => setIsViewOpen(false)} className="hover:bg-white/10 p-1 rounded">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-8 space-y-5 overflow-y-auto flex-1 bg-white font-sans text-xs printable-section" id="print-area">
              {/* CITY LINK Master Letterhead Header */}
              <MasterLetterheadHeader />

              {/* Document Title */}
              <div className="text-center my-2">
                <h1 className="text-xl font-black text-gray-900 tracking-wider uppercase font-sans border-b-2 border-gray-900 inline-block px-6 pb-0.5">
                  BILL / INVOICE
                </h1>
              </div>

              {/* Invoice Number & Date Box */}
              <div className="flex justify-between items-start">
                <div className="w-64 border border-gray-900 text-xs font-sans">
                  <div className="p-1.5 border-b border-gray-900 font-bold bg-gray-100 flex justify-between">
                    <span>INVOICE #</span>
                    <span className="font-mono text-brand-900">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="p-1.5 font-bold flex justify-between">
                    <span>Date:</span>
                    <span className="font-normal">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] bg-gray-50 border border-gray-300 p-2 rounded">
                  <div>
                    <span className="font-bold font-sans text-gray-800">Billing Currency:</span>{' '}
                    <span className="font-bold text-brand-900">{selectedCurrency}</span>
                  </div>
                  {selectedCurrency !== 'PKR' && (
                    <div className="text-gray-600 text-[10px]">
                      Rate @ 1 {selectedCurrency} ={' '}
                      {selectedCurrency === 'RMB'
                        ? Number(selectedInvoice.quotation?.rmbRate || 38.50)
                        : Number(selectedInvoice.quotation?.usdRate || 278.50)}{' '}
                      PKR
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Order Details Grid Table */}
              <div className="border border-gray-900 rounded overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-900">
                      <td className="p-2 font-bold w-40 border-r border-gray-900 bg-gray-50">Customer's Name:</td>
                      <td className="p-2 font-bold text-gray-900 border-r border-gray-900">{selectedInvoice.companyName}</td>
                      <td className="p-2 font-bold w-24 border-r border-gray-900 bg-gray-50">CR No.</td>
                      <td className="p-2 font-mono font-bold text-gray-900 w-48">{selectedInvoice.crNo || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-900">
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Address:</td>
                      <td className="p-2 text-gray-800 border-r border-gray-900">{selectedInvoice.address || 'N/A'}</td>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">PO No.</td>
                      <td className="p-2 font-mono font-bold text-gray-900">
                        {selectedInvoice.poNo || selectedInvoice.quotation?.referenceNumber || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">NTN/STRN (if any):</td>
                      <td className="p-2 font-mono border-r border-gray-900">{selectedInvoice.ntn || selectedInvoice.strn || '9010630-1'}</td>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">DC No.</td>
                      <td className="p-2 font-mono text-gray-900">{selectedInvoice.dcNo || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Table with Selected Currency Formatting */}
              <div className="border border-gray-900 rounded overflow-hidden mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-200 text-gray-900 font-bold border-b border-gray-900 text-[11px]">
                      <th className="p-2 text-center border-r border-gray-900 w-12">Sr. #</th>
                      <th className="p-2 border-r border-gray-900 w-44">Part # / Code</th>
                      <th className="p-2 border-r border-gray-900">Description</th>
                      <th className="p-2 text-center border-r border-gray-900 w-16">Qty</th>
                      <th className="p-2 text-right border-r border-gray-900 w-28">Unit Price ({currFormat.symbol})</th>
                      <th className="p-2 text-right w-32">Total ({currFormat.symbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-400">
                    {selectedInvoice.items?.map((item: any) => {
                      const unitPkr = Number(item.unitPrice) || 0;
                      const unitConverted = unitPkr * currFormat.factor;
                      const totalConverted = unitConverted * item.quantity;

                      return (
                        <tr key={item.id} className="text-xs">
                          <td className="p-2 text-center font-semibold border-r border-gray-400">{item.srNo}</td>
                          <td className="p-2 font-mono font-bold text-gray-900 border-r border-gray-400">{item.partNumber}</td>
                          <td className="p-2 border-r border-gray-400 leading-normal">{item.description || 'N/A'}</td>
                          <td className="p-2 text-center font-bold border-r border-gray-400">{item.quantity}</td>
                          <td className="p-2 text-right font-mono border-r border-gray-400">
                            {currFormat.symbol} {unitConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-gray-900">
                            {currFormat.symbol} {totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end font-sans pt-2">
                <div className="w-80 border border-gray-900 rounded overflow-hidden text-xs">
                  <div className="flex justify-between p-2 border-b border-gray-400 bg-gray-50">
                    <span className="font-bold text-gray-800">Subtotal / Excl. Tax:</span>
                    <span className="font-bold font-mono">
                      {currFormat.symbol} {(Number(selectedInvoice.subTotal) * currFormat.factor).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {Number(selectedInvoice.taxAmount) > 0 && (
                    <div className="flex justify-between p-2 border-b border-gray-400 bg-gray-50">
                      <span className="text-gray-800 font-semibold">Sales Tax / GST ({Number(selectedInvoice.taxRate)}%):</span>
                      <span className="font-mono">
                        +{currFormat.symbol} {(Number(selectedInvoice.taxAmount) * currFormat.factor).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-gray-200 text-gray-900 font-bold text-sm border-t border-gray-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-brand-950">
                      {currFormat.symbol} {(Number(selectedInvoice.totalAmount) * currFormat.factor).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorized Signatures */}
              <div className="pt-16 grid grid-cols-2 gap-16 font-sans text-center text-gray-700 text-xs">
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">PREPARED BY</p>
                  <p className="mt-1 text-[10px] text-gray-500">Billing & Accounts Division</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">FOR CITY LINK (ENGINEERING & SERVICES)</p>
                  <p className="mt-1 text-[10px] text-gray-500">Authorized Signature & Stamp</p>
                  <div className="h-12 flex items-center justify-center text-gray-300 text-[9px] italic">STAMP HERE</div>
                </div>
              </div>

              {/* Master Letterhead Footer */}
              <MasterLetterheadFooter />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
