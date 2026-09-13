import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  Plus,
  Eye,
  Check,
  X,
  FileText,
  Truck,
  PlusCircle,
  Trash2,
  Calendar,
  AlertCircle,
  Search,
  Printer,
  Globe,
  Send,
  Building2,
  FileCheck
} from 'lucide-react';
import { MasterLetterheadHeader, MasterLetterheadFooter } from '../components/Letterhead.js';

export default function Purchases() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSelectQuoteOpen, setIsSelectQuoteOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');

  // Selected Quotation Reference
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);

  // Create PO Form State
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [rmbRate, setRmbRate] = useState(38.5);
  const [usdRate, setUsdRate] = useState(278.5);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<Array<any>>([]);

  // Invoice Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [invoicePoId, setInvoicePoId] = useState('');

  // Queries
  const { data: posData, isLoading } = useQuery<any>({
    queryKey: ['purchases'],
    queryFn: () => api.get('/api/purchases')
  });

  const { data: quotationsData } = useQuery<any>({
    queryKey: ['quotations-for-po', quoteSearch],
    queryFn: () => api.get(`/api/quotations?search=${quoteSearch}&limit=50`)
  });

  const { data: suppliersData } = useQuery<any>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/api/suppliers')
  });

  // Mutations
  const createPoMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/purchases', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setIsCreateOpen(false);
      resetPoForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const placePoMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/purchases/${id}/place`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      if (selectedPo) {
        setSelectedPo({ ...selectedPo, status: 'PLACED' });
      }
    },
    onError: (err: any) => alert(err.message)
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/api/purchases/${id}/approve`, { approve }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setSelectedPo(null);
    },
    onError: (err: any) => alert(err.message)
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/purchases/${id}/receive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedPo(null);
    },
    onError: (err: any) => alert(err.message)
  });

  const hasPerm = (perm: string) => {
    return user?.roles?.includes('Super Admin') || user?.permissions?.includes(perm);
  };

  const resetPoForm = () => {
    setPoNumber('');
    setSupplierId('');
    setSelectedQuotation(null);
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setReferenceNumber('');
    setCurrency('PKR');
    setRmbRate(38.5);
    setUsdRate(278.5);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setTaxRate(0);
    setDiscountRate(0);
    setRemarks('');
    setItems([]);
  };

  // Populate PO form directly from a selected Quotation
  const handleSelectQuotation = (q: any) => {
    setSelectedQuotation(q);
    setCompanyName(q.companyName || '');
    setContactPerson(q.contactPerson || '');
    setEmail(q.email || '');
    setPhone(q.phone || '');
    setAddress(q.address || '');
    setReferenceNumber(q.referenceNumber || q.quotationNumber || '');
    setCurrency(q.currency || 'PKR');
    setRmbRate(Number(q.rmbRate) || 38.5);
    setUsdRate(Number(q.usdRate) || 278.5);
    setTaxRate(Number(q.taxRate) || 0);
    setDiscountRate(Number(q.discountRate) || 0);
    setRemarks(q.remarks || `Imported from Quotation #${q.quotationNumber}`);

    if (q.items && q.items.length > 0) {
      const imported = q.items.map((itm: any) => ({
        srNo: itm.srNo,
        partNumber: itm.partNumber,
        description: itm.description,
        manufacturer: itm.manufacturer,
        quantity: itm.quantity,
        unit: itm.unit || 'Pcs',
        unitPrice: Number(itm.unitPricePkr || itm.unitPrice) || 0,
        totalLineAmount: Number(itm.totalPricePkr || itm.totalPrice) || 0,
        unitPricePkr: Number(itm.unitPricePkr) || 0,
        totalPricePkr: Number(itm.totalPricePkr) || 0,
        zoneCurrency: itm.zoneCurrency || 'RMB',
        unitPriceRmb: Number(itm.unitPriceRmb || itm.zonePriceRmb) || 0,
        totalPriceRmb: Number(itm.totalPriceRmb) || 0,
        unitPriceUsd: Number(itm.unitPriceUsd) || 0,
        totalPriceUsd: Number(itm.totalPriceUsd) || 0,
        internetCurrency: itm.internetCurrency || 'RMB',
        internetUnitPrice: Number(itm.internetUnitPrice || itm.internetPrice) || 0,
        internetTotalPrice: Number(itm.internetTotalPrice) || 0,
        productId: itm.productId || null
      }));
      setItems(imported);
    } else {
      setItems([]);
    }

    setIsSelectQuoteOpen(false);
    setIsCreateOpen(true);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        srNo: items.length + 1,
        partNumber: '',
        description: '',
        manufacturer: '',
        quantity: 1,
        unit: 'Pcs',
        unitPrice: 0,
        totalLineAmount: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(updated[index].quantity) || 1;
      const u = Number(updated[index].unitPrice) || 0;
      updated[index].totalLineAmount = q * u;
    }
    setItems(updated);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.totalLineAmount) || 0), 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const tax = sub * (taxRate / 100);
    const disc = sub * (discountRate / 100);
    return sub + tax - disc;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('At least one line item is required for the Purchase Order.');
      return;
    }
    const sub = calculateSubtotal();
    const tot = calculateTotal();

    createPoMutation.mutate({
      poNumber: poNumber || undefined,
      quotationId: selectedQuotation?.id || undefined,
      supplierId: supplierId || undefined,
      companyName,
      contactPerson,
      email,
      phone,
      address,
      referenceNumber,
      currency,
      rmbRate,
      usdRate,
      orderDate,
      expectedDate: expectedDate || undefined,
      taxRate,
      discountRate,
      subTotal: sub,
      totalAmount: tot,
      remarks,
      status: 'DRAFT',
      items
    });
  };

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

  const filteredPos = posData?.pos?.filter((po: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      po.poNumber?.toLowerCase().includes(q) ||
      po.companyName?.toLowerCase().includes(q) ||
      po.supplier?.name?.toLowerCase().includes(q) ||
      po.referenceNumber?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Procurement & Purchase Orders</h2>
          <p className="text-sm text-corporate-muted mt-1">
            Create Purchase Orders directly from Quotations, track ordered vs delivered cargo, and place orders.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsSelectQuoteOpen(true)}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-dynamics transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create PO from Quotation</span>
          </button>
          <button
            onClick={() => {
              resetPoForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold shadow-dynamics transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Standalone PO</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-corporate-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search purchase orders (PO #, company name, reference #...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PLACED">Placed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* PO Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">PO Number</th>
              <th className="p-3">Client / Vendor</th>
              <th className="p-3">Linked Quotation</th>
              <th className="p-3">Order Date</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3 text-center">PO Status</th>
              <th className="p-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-corporate-muted">
                  Loading Purchase Orders...
                </td>
              </tr>
            ) : filteredPos?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-corporate-muted">
                  No Purchase Orders found. Click "Create PO from Quotation" to import a commercial quote into procurement.
                </td>
              </tr>
            ) : (
              filteredPos?.map((po: any) => (
                <tr key={po.id} className="hover:bg-brand-50/20">
                  <td className="p-3 font-mono font-bold text-brand-700">{po.poNumber}</td>
                  <td className="p-3 font-semibold text-corporate-title">
                    {po.companyName || po.supplier?.name || 'N/A'}
                    {po.contactPerson && <div className="text-[10px] text-corporate-muted font-normal">Attn: {po.contactPerson}</div>}
                  </td>
                  <td className="p-3 font-mono text-corporate-text">
                    {po.quotation?.quotationNumber ? (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                        {po.quotation.quotationNumber}
                      </span>
                    ) : (
                      'Standalone'
                    )}
                  </td>
                  <td className="p-3">{new Date(po.orderDate).toLocaleDateString()}</td>
                  <td className="p-3 text-right font-bold text-brand-900">
                    Rs. {Number(po.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        po.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : po.status === 'PLACED'
                          ? 'bg-purple-100 text-purple-700'
                          : po.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-700'
                          : po.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedPo(po)}
                      className="p-1 hover:bg-brand-100 text-brand-600 rounded inline-block"
                      title="View & Print Purchase Order"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {po.status !== 'PLACED' && po.status !== 'COMPLETED' && (
                      <button
                        onClick={() => placePoMutation.mutate(po.id)}
                        className="p-1 hover:bg-purple-100 text-purple-700 rounded inline-block"
                        title="Place Purchase Order"
                      >
                        <Send className="w-4 h-4" />
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
      {/* MODAL 1: SEARCH & SELECT QUOTATION TO CREATE PO */}
      {/* ==================================================================== */}
      {isSelectQuoteOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-xs flex flex-col max-h-[85vh]">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-[#F97316]" /> Select Existing Quotation for Purchase Order
              </h3>
              <button onClick={() => setIsSelectQuoteOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by quote number, company, subject..."
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto flex-1">
              {quotationsData?.quotations?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No quotations found matching search query.</div>
              ) : (
                quotationsData?.quotations?.map((q: any) => (
                  <div
                    key={q.id}
                    onClick={() => handleSelectQuotation(q)}
                    className="p-3 border border-gray-200 hover:border-brand-500 hover:bg-brand-50/50 rounded-lg cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-brand-700 text-sm">{q.quotationNumber}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                          {q.currency}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 mt-1">{q.companyName}</p>
                      <p className="text-gray-500 text-[11px]">{q.subject || 'No subject'}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-brand-900 text-sm">
                        Rs. {Number(q.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="inline-block mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px]">
                        Import into PO &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE / EDIT PURCHASE ORDER FORM */}
      {/* ==================================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-xs flex flex-col h-[90vh]">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <PlusCircle className="w-4 h-4 text-[#F97316]" />{' '}
                {selectedQuotation ? `Create PO from Quote #${selectedQuotation.quotationNumber}` : 'Create Purchase Order'}
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50">
              {/* Linked Quote Header */}
              {selectedQuotation && (
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg flex justify-between items-center text-emerald-900">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-xs">Imported from Commercial Quotation: {selectedQuotation.quotationNumber}</p>
                      <p className="text-[11px] text-emerald-700">All customer info, part numbers, prices, and rates pre-filled automatically.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* General Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Customer / Vendor Name*</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="Company Name"
                    className="w-full p-1.5 border border-gray-300 rounded font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Attn: Person Name"
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Ref / Quote #</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. Q-2026-0001"
                    className="w-full p-1.5 border border-gray-300 rounded font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Order Date</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Expected Delivery</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-brand-900 uppercase tracking-wider text-[11px]">Purchase Order Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="py-1 px-3 bg-brand-50 text-brand-700 font-bold rounded border border-brand-300 hover:bg-brand-100"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b">
                        <th className="p-2 w-10 text-center">Sr#</th>
                        <th className="p-2 w-36">Part / Order Code</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 w-24">Manf</th>
                        <th className="p-2 w-16 text-center">Qty</th>
                        <th className="p-2 w-28 text-right">Unit Price (PKR)</th>
                        <th className="p-2 w-32 text-right">Total (PKR)</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-1.5 text-center font-bold">{idx + 1}</td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.partNumber || ''}
                              onChange={(e) => handleItemChange(idx, 'partNumber', e.target.value)}
                              className="w-full p-1 border rounded font-mono font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.manufacturer || ''}
                              onChange={(e) => handleItemChange(idx, 'manufacturer', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full p-1 border rounded text-center font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-full p-1 border rounded text-right font-mono font-bold"
                            />
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-brand-900">
                            Rs. {Number(item.totalLineAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:bg-red-50 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal Summary */}
                <div className="flex justify-end pt-3">
                  <div className="w-64 space-y-1 font-bold text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">Rs. {calculateSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-1 text-brand-950">
                      <span>Grand Total:</span>
                      <span className="font-mono">Rs. {calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="py-1.5 px-4 border border-gray-300 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPoMutation.isPending}
                  className="py-1.5 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold"
                >
                  {createPoMutation.isPending ? 'Saving PO...' : 'Save Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: VIEW & PRINT PURCHASE ORDER DETAILS */}
      {/* ==================================================================== */}
      {selectedPo && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-xs flex flex-col h-[92vh]">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0 no-print">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-[#F97316]" /> Purchase Order: {selectedPo.poNumber}
              </h3>
              <div className="flex items-center space-x-2">
                {selectedPo.status !== 'PLACED' && selectedPo.status !== 'COMPLETED' && (
                  <button
                    onClick={() => placePoMutation.mutate(selectedPo.id)}
                    className="flex items-center space-x-1.5 py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Place Order</span>
                  </button>
                )}
                <button
                  onClick={triggerPrintSpool}
                  className="flex items-center space-x-1.5 py-1 px-3 bg-white text-brand-900 hover:bg-brand-50 font-bold rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO / Export PDF</span>
                </button>
                <button onClick={() => setSelectedPo(null)} className="hover:bg-white/10 p-1 rounded">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-8 space-y-5 overflow-y-auto flex-1 bg-white font-sans text-xs printable-section" id="print-area">
              <MasterLetterheadHeader />

              <div className="text-center my-2">
                <h1 className="text-xl font-black text-gray-900 tracking-wider uppercase font-sans border-b-2 border-gray-900 inline-block px-6 pb-0.5">
                  PURCHASE ORDER
                </h1>
              </div>

              {/* PO Header details */}
              <div className="flex justify-between items-start">
                <div className="w-64 border border-gray-900 text-xs font-sans">
                  <div className="p-1.5 border-b border-gray-900 font-bold bg-gray-100 flex justify-between">
                    <span>PO #</span>
                    <span className="font-mono text-brand-900">{selectedPo.poNumber}</span>
                  </div>
                  <div className="p-1.5 font-bold flex justify-between">
                    <span>Order Date:</span>
                    <span className="font-normal">{new Date(selectedPo.orderDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] bg-gray-50 border border-gray-300 p-2 rounded">
                  <div>
                    <span className="font-bold font-sans text-gray-800">Status:</span>{' '}
                    <span className="font-bold text-brand-900">{selectedPo.status}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Vendor Details */}
              <div className="border border-gray-900 rounded overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-900">
                      <td className="p-2 font-bold w-40 border-r border-gray-900 bg-gray-50">Customer / Vendor:</td>
                      <td className="p-2 font-bold text-gray-900 border-r border-gray-900">{selectedPo.companyName || selectedPo.supplier?.name || 'N/A'}</td>
                      <td className="p-2 font-bold w-28 border-r border-gray-900 bg-gray-50">Ref / Quote #</td>
                      <td className="p-2 font-mono font-bold text-gray-900 w-48">{selectedPo.referenceNumber || selectedPo.quotation?.quotationNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Address:</td>
                      <td className="p-2 text-gray-800 border-r border-gray-900">{selectedPo.address || 'N/A'}</td>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Contact Person:</td>
                      <td className="p-2 text-gray-900">{selectedPo.contactPerson || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Linked Delivery Challans Info */}
              {selectedPo.quotation?.deliveryChallans && selectedPo.quotation.deliveryChallans.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-200 p-3 rounded text-xs space-y-1">
                  <div className="flex items-center space-x-1 font-bold text-blue-900">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Associated Delivery Challans ({selectedPo.quotation.deliveryChallans.length} Logged)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedPo.quotation.deliveryChallans.map((dc: any) => (
                      <span key={dc.id} className="bg-white border border-blue-300 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
                        {dc.challanNumber} ({dc.status})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-gray-900 rounded overflow-hidden mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-200 text-gray-900 font-bold border-b border-gray-900 text-[11px]">
                      <th className="p-2 text-center border-r border-gray-900 w-12">Sr. #</th>
                      <th className="p-2 border-r border-gray-900 w-44">Part / Code</th>
                      <th className="p-2 border-r border-gray-900">Description</th>
                      <th className="p-2 border-r border-gray-900 w-24">Manf</th>
                      <th className="p-2 text-center border-r border-gray-900 w-16">Qty</th>
                      <th className="p-2 text-right border-r border-gray-900 w-28">Unit Price (PKR)</th>
                      <th className="p-2 text-right w-32">Total (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-400">
                    {selectedPo.items?.map((item: any) => (
                      <tr key={item.id} className="text-xs">
                        <td className="p-2 text-center font-semibold border-r border-gray-400">{item.srNo}</td>
                        <td className="p-2 font-mono font-bold text-gray-900 border-r border-gray-400">{item.partNumber || item.product?.partNumber}</td>
                        <td className="p-2 border-r border-gray-400 leading-normal">{item.description || item.product?.name || 'N/A'}</td>
                        <td className="p-2 border-r border-gray-400">{item.manufacturer || 'N/A'}</td>
                        <td className="p-2 text-center font-bold border-r border-gray-400">{item.quantity}</td>
                        <td className="p-2 text-right font-mono border-r border-gray-400">
                          Rs. {Number(item.unitPricePkr || item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-gray-900">
                          Rs. {Number(item.totalPricePkr || item.totalLineAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="flex justify-end font-sans pt-2">
                <div className="w-72 border border-gray-900 rounded overflow-hidden text-xs">
                  <div className="flex justify-between p-2 border-b border-gray-400 bg-gray-50">
                    <span className="font-bold text-gray-800">Subtotal:</span>
                    <span className="font-bold font-mono">
                      Rs. {Number(selectedPo.subTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-200 text-gray-900 font-bold text-sm border-t border-gray-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-brand-950">
                      Rs. {Number(selectedPo.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-16 grid grid-cols-2 gap-16 font-sans text-center text-gray-700 text-xs">
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">PREPARED BY</p>
                  <p className="mt-1 text-[10px] text-gray-500">Procurement Division</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">FOR CITY LINK (ENGINEERING & SERVICES)</p>
                  <p className="mt-1 text-[10px] text-gray-500">Authorized Signatory & Stamp</p>
                  <div className="h-12 flex items-center justify-center text-gray-300 text-[9px] italic">STAMP HERE</div>
                </div>
              </div>

              <MasterLetterheadFooter />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
