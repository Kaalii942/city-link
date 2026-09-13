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
  FileText,
  Truck,
  Send,
  CheckCircle,
  FileSpreadsheet,
  Copy,
  ArrowUp,
  ArrowDown,
  Globe,
  Coins,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { MasterLetterheadHeader, MasterLetterheadFooter } from '../components/Letterhead.js';

interface QuotationItem {
  srNo: number;
  partNumber: string;
  description: string;
  manufacturer: string;
  quantity: number;
  unit: string;
  unitPricePkr: number;
  totalPricePkr: number;
  zoneCurrency: 'RMB' | 'USD';
  unitPriceRmb: number;
  totalPriceRmb: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
  internetCurrency: 'RMB' | 'USD';
  internetUnitPrice: number;
  internetTotalPrice: number;
  zonePriceRmb?: number;
  profitRatio?: number;
  productId?: string | null;
}

export default function Quotations() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [showAdminPricesInView, setShowAdminPricesInView] = useState(true);

  // Form State
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [subject, setSubject] = useState('QUOTATION FOR ELECTRONIC COMPONENTS');
  const [tenderNumber, setTenderNumber] = useState('');
  const [tenderDate, setTenderDate] = useState('');
  const [ntn, setNtn] = useState('');
  const [strn, setStrn] = useState('');
  const [signatoryName, setSignatoryName] = useState('Saqib Shafique');
  const [signatoryPhone, setSignatoryPhone] = useState('0321-8507444');

  // Centralized Exchange Rate State (At the VERY TOP of Quotation)
  const [quotationCurrency, setQuotationCurrency] = useState<'PKR' | 'RMB' | 'USD'>('PKR');
  const [rmbRate, setRmbRate] = useState<number>(38.50); // 1 RMB = 38.50 PKR
  const [usdRate, setUsdRate] = useState<number>(278.50); // 1 USD = 278.50 PKR
  const [displayCurrencies, setDisplayCurrencies] = useState<string>('PKR,RMB,USD');

  const [paymentTerms, setPaymentTerms] = useState('100% after delivery');
  const [deliveryTime, setDeliveryTime] = useState('08-12 Weeks');
  const [warranty, setWarranty] = useState('01 year standard warranty');
  const [remarks, setRemarks] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [inquiryId, setInquiryId] = useState<string | null>(null);

  const [items, setItems] = useState<QuotationItem[]>([
    {
      srNo: 1,
      partNumber: '',
      description: '',
      manufacturer: '',
      quantity: 1,
      unit: 'Pcs',
      unitPricePkr: 0,
      totalPricePkr: 0,
      zoneCurrency: 'RMB',
      unitPriceRmb: 0,
      totalPriceRmb: 0,
      unitPriceUsd: 0,
      totalPriceUsd: 0,
      internetCurrency: 'RMB',
      internetUnitPrice: 0,
      internetTotalPrice: 0
    }
  ]);

  // Product Autocomplete suggestion state
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Fetch Quotations list
  const { data: quotationsData, isLoading } = useQuery<any>({
    queryKey: ['quotations', search, statusFilter, page],
    queryFn: () => api.get(`/api/quotations?search=${search}&status=${statusFilter}&page=${page}&limit=10`)
  });

  // Autocomplete products fetch
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
      const res = (await api.get(`/api/products?search=${val}&limit=5`)) as any;
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
    updated[index].unit = prod.unit || 'Pcs';
    updated[index].unitPricePkr = Number(prod.sellingPrice) || 0;
    updated[index].unitPriceRmb = Number(prod.purchasePrice) || 0;
    updated[index].productId = prod.id;
    setItems(updated);
    setSuggestions([]);
    setActiveItemIndex(null);
    recalculateItemValues(index, updated, rmbRate, usdRate);
  };

  // Recalculate item multi-currency pricing synchronously
  const recalculateItemValues = (
    index: number,
    currentItems: QuotationItem[],
    currentRmbRate: number = rmbRate,
    currentUsdRate: number = usdRate
  ) => {
    const item = currentItems[index];
    const qty = Math.max(1, Number(item.quantity) || 1);
    const pkrPrice = Math.max(0, Number(item.unitPricePkr) || 0);
    const rmbR = currentRmbRate > 0 ? currentRmbRate : 38.50;
    const usdR = currentUsdRate > 0 ? currentUsdRate : 278.50;

    item.quantity = qty;
    item.unitPricePkr = pkrPrice;
    item.totalPricePkr = Number((pkrPrice * qty).toFixed(2));

    // Calculate RMB & USD dependent prices
    if (item.zoneCurrency === 'RMB') {
      if (!item.unitPriceRmb || item.unitPriceRmb === 0) {
        item.unitPriceRmb = Number((pkrPrice / rmbR).toFixed(4));
      }
      item.totalPriceRmb = Number((item.unitPriceRmb * qty).toFixed(2));
      item.unitPriceUsd = Number((pkrPrice / usdR).toFixed(4));
      item.totalPriceUsd = Number((item.unitPriceUsd * qty).toFixed(2));
    } else {
      // USD zone currency
      if (!item.unitPriceUsd || item.unitPriceUsd === 0) {
        item.unitPriceUsd = Number((pkrPrice / usdR).toFixed(4));
      }
      item.totalPriceUsd = Number((item.unitPriceUsd * qty).toFixed(2));
      item.unitPriceRmb = Number((pkrPrice / rmbR).toFixed(4));
      item.totalPriceRmb = Number((item.unitPriceRmb * qty).toFixed(2));
    }

    // Internet Price
    const internetPrice = Math.max(0, Number(item.internetUnitPrice) || 0);
    item.internetUnitPrice = internetPrice;
    item.internetTotalPrice = Number((internetPrice * qty).toFixed(2));

    setItems([...currentItems]);
  };

  // Recalculate ALL items when centralized exchange rates change at top
  const handleCentralExchangeRateChange = (newRmbRate: number, newUsdRate: number) => {
    const safeRmb = Math.max(0.001, newRmbRate);
    const safeUsd = Math.max(0.001, newUsdRate);
    setRmbRate(safeRmb);
    setUsdRate(safeUsd);

    const updated = items.map((item) => {
      const qty = item.quantity;
      const pkrPrice = item.unitPricePkr;
      const unitPriceRmb = Number((pkrPrice / safeRmb).toFixed(4));
      const unitPriceUsd = Number((pkrPrice / safeUsd).toFixed(4));

      return {
        ...item,
        unitPriceRmb,
        totalPriceRmb: Number((unitPriceRmb * qty).toFixed(2)),
        unitPriceUsd,
        totalPriceUsd: Number((unitPriceUsd * qty).toFixed(2))
      };
    });
    setItems(updated);
  };

  // Pre-fill state on navigate from Inquiry
  useEffect(() => {
    if (location.state?.fromInquiry) {
      const inq = location.state.fromInquiry;
      setCompanyName(inq.companyName || '');
      setDepartmentName(inq.departmentName || '');
      setContactPerson(inq.customerName || '');
      setEmail(inq.email || '');
      setPhone(inq.phone || '');
      setAddress(inq.address || '');
      setInquiryId(inq.id);
      setReferenceNumber(inq.inquiryNumber || '');
      setSubject(`QUOTATION FOR INQUIRY ${inq.inquiryNumber}`);

      if (inq.items && inq.items.length > 0) {
        const newItems: QuotationItem[] = inq.items.map((item: any, idx: number) => ({
          srNo: idx + 1,
          partNumber: item.partNumber || '',
          description: item.description || '',
          manufacturer: item.manufacturer || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'Pcs',
          unitPricePkr: 0,
          totalPricePkr: 0,
          zoneCurrency: 'RMB',
          unitPriceRmb: 0,
          totalPriceRmb: 0,
          unitPriceUsd: 0,
          totalPriceUsd: 0,
          internetCurrency: 'RMB',
          internetUnitPrice: 0,
          internetTotalPrice: 0,
          productId: item.productId || null
        }));
        setItems(newItems);
      }
      setIsCreateOpen(true);
    }
  }, [location.state]);

  // Item Controls
  const handleAddItemRow = () => {
    const newItem: QuotationItem = {
      srNo: items.length + 1,
      partNumber: '',
      description: '',
      manufacturer: '',
      quantity: 1,
      unit: 'Pcs',
      unitPricePkr: 0,
      totalPricePkr: 0,
      zoneCurrency: 'RMB',
      unitPriceRmb: 0,
      totalPriceRmb: 0,
      unitPriceUsd: 0,
      totalPriceUsd: 0,
      internetCurrency: 'RMB',
      internetUnitPrice: 0,
      internetTotalPrice: 0
    };
    setItems([...items, newItem]);
  };

  const handleDuplicateItemRow = (index: number) => {
    const target = items[index];
    const duplicated: QuotationItem = {
      ...target,
      srNo: items.length + 1
    };
    const newItems = [...items, duplicated].map((itm, idx) => ({ ...itm, srNo: idx + 1 }));
    setItems(newItems);
  };

  const handleDeleteItemRow = (index: number) => {
    if (items.length === 1) return;
    const filtered = items.filter((_, idx) => idx !== index).map((itm, idx) => ({ ...itm, srNo: idx + 1 }));
    setItems(filtered);
  };

  const handleMoveItem = (index: number, direction: 'UP' | 'DOWN') => {
    if ((direction === 'UP' && index === 0) || (direction === 'DOWN' && index === items.length - 1)) return;
    const newItems = [...items];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    const reordered = newItems.map((itm, idx) => ({ ...itm, srNo: idx + 1 }));
    setItems(reordered);
  };

  // Summary calculations
  const calculateTotals = () => {
    const subTotalPkr = items.reduce((acc, curr) => acc + (Number(curr.totalPricePkr) || 0), 0);
    const discountAmountPkr = Number((subTotalPkr * (discountRate / 100)).toFixed(2));
    const afterDiscountPkr = subTotalPkr - discountAmountPkr;
    const taxAmountPkr = Number((afterDiscountPkr * (taxRate / 100)).toFixed(2));
    const grandTotalPkr = Number((afterDiscountPkr + taxAmountPkr).toFixed(2));

    const rmbR = rmbRate > 0 ? rmbRate : 38.50;
    const usdR = usdRate > 0 ? usdRate : 278.50;

    const grandTotalRmb = Number((grandTotalPkr / rmbR).toFixed(2));
    const grandTotalUsd = Number((grandTotalPkr / usdR).toFixed(2));

    return {
      subTotalPkr,
      discountAmountPkr,
      taxAmountPkr,
      grandTotalPkr,
      grandTotalRmb,
      grandTotalUsd
    };
  };

  const totals = calculateTotals();

  // Create or Update Quotation Mutation
  const saveQuotationMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingQuotationId) {
        return api.put(`/api/quotations/${editingQuotationId}`, payload);
      }
      return api.post('/api/quotations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setIsCreateOpen(false);
      resetForm();
    }
  });

  // Update Quotation Status
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      api.put(`/api/quotations/${data.id}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (selectedQuotation) {
        setSelectedQuotation({ ...selectedQuotation, status: 'APPROVED' });
      }
    }
  });

  const resetForm = () => {
    setEditingQuotationId(null);
    setCompanyName('');
    setDepartmentName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setReferenceNumber('');
    setSubject('QUOTATION FOR ELECTRONIC COMPONENTS');
    setTenderNumber('');
    setTenderDate('');
    setNtn('');
    setStrn('');
    setSignatoryName('Saqib Shafique');
    setSignatoryPhone('0321-8507444');
    setQuotationCurrency('PKR');
    setRmbRate(38.50);
    setUsdRate(278.50);
    setDisplayCurrencies('PKR,RMB,USD');
    setPaymentTerms('100% after delivery');
    setDeliveryTime('08-12 Weeks');
    setWarranty('01 year standard warranty');
    setRemarks('');
    setTaxRate(0);
    setDiscountRate(0);
    setInquiryId(null);
    setItems([
      {
        srNo: 1,
        partNumber: '',
        description: '',
        manufacturer: '',
        quantity: 1,
        unit: 'Pcs',
        unitPricePkr: 0,
        totalPricePkr: 0,
        zoneCurrency: 'RMB',
        unitPriceRmb: 0,
        totalPriceRmb: 0,
        unitPriceUsd: 0,
        totalPriceUsd: 0,
        internetCurrency: 'RMB',
        internetUnitPrice: 0,
        internetTotalPrice: 0
      }
    ]);
  };

  const handleEditQuotation = (q: any) => {
    setEditingQuotationId(q.id);
    setCompanyName(q.companyName || '');
    setDepartmentName(q.departmentName || '');
    setContactPerson(q.contactPerson || '');
    setEmail(q.email || '');
    setPhone(q.phone || '');
    setAddress(q.address || '');
    setReferenceNumber(q.referenceNumber || '');
    setSubject(q.subject || 'QUOTATION FOR ELECTRONIC COMPONENTS');
    setTenderNumber(q.tenderNumber || '');
    setTenderDate(q.tenderDate ? new Date(q.tenderDate).toISOString().split('T')[0] : '');
    setNtn(q.ntn || '');
    setStrn(q.strn || '');
    setSignatoryName(q.signatoryName || 'Saqib Shafique');
    setSignatoryPhone(q.signatoryPhone || '0321-8507444');
    setQuotationCurrency((q.currency as any) || 'PKR');
    setRmbRate(Number(q.rmbRate) || 38.50);
    setUsdRate(Number(q.usdRate) || 278.50);
    setDisplayCurrencies(q.displayCurrencies || 'PKR,RMB,USD');
    setPaymentTerms(q.paymentTerms || '100% after delivery');
    setDeliveryTime(q.deliveryTime || '08-12 Weeks');
    setWarranty(q.warranty || '01 year standard warranty');
    setRemarks(q.remarks || '');
    setTaxRate(Number(q.taxRate) || 0);
    setDiscountRate(Number(q.discountRate) || 0);
    setInquiryId(q.inquiryId || null);

    if (q.items && q.items.length > 0) {
      const formattedItems: QuotationItem[] = q.items.map((itm: any, idx: number) => ({
        srNo: idx + 1,
        partNumber: itm.partNumber,
        description: itm.description || '',
        manufacturer: itm.manufacturer || '',
        quantity: itm.quantity,
        unit: itm.unit || 'Pcs',
        unitPricePkr: Number(itm.unitPricePkr || itm.finalUnitPrice || itm.unitPrice) || 0,
        totalPricePkr: Number(itm.totalPricePkr || itm.finalTotalPrice || itm.totalPrice) || 0,
        zoneCurrency: (itm.zoneCurrency as any) || 'RMB',
        unitPriceRmb: Number(itm.unitPriceRmb || itm.zonePriceRmb) || 0,
        totalPriceRmb: Number(itm.totalPriceRmb) || 0,
        unitPriceUsd: Number(itm.unitPriceUsd) || 0,
        totalPriceUsd: Number(itm.totalPriceUsd) || 0,
        internetCurrency: (itm.internetCurrency as any) || 'RMB',
        internetUnitPrice: Number(itm.internetUnitPrice || itm.internetPrice) || 0,
        internetTotalPrice: Number(itm.internetTotalPrice) || 0,
        productId: itm.productId || null
      }));
      setItems(formattedItems);
    }
    setIsCreateOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveQuotationMutation.mutate({
      companyName,
      departmentName,
      contactPerson,
      email,
      phone,
      address,
      referenceNumber,
      subject,
      tenderNumber,
      tenderDate,
      ntn,
      strn,
      signatoryName,
      signatoryPhone,
      currency: quotationCurrency,
      exchangeRate: 1.0,
      rmbRate,
      usdRate,
      displayCurrencies,
      paymentTerms,
      deliveryTime,
      warranty,
      remarks,
      taxRate,
      discountRate,
      inquiryId,
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

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Commercial Quotations</h2>
          <p className="text-sm text-corporate-muted mt-1">
            Official CITY LINK (Engineering & Services) Multi-Currency Financial Proposals & Quotation Management.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="flex items-center space-x-2 py-2.5 px-5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded shadow-dynamics transition-colors text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Multi-Currency Proposal</span>
        </button>
      </div>

      {/* Search Filters */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-corporate-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search quotations (quote number, company, subject, tender #...)"
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
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Quotations List Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">Quote Ref No</th>
              <th className="p-3">Client Company</th>
              <th className="p-3">Tender / Ref</th>
              <th className="p-3">Quote Date</th>
              <th className="p-3 text-right">PKR Total</th>
              <th className="p-3 text-right">RMB Equiv.</th>
              <th className="p-3 text-right">USD Equiv.</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-corporate-muted">
                  Loading commercial quotations...
                </td>
              </tr>
            ) : quotationsData?.quotations?.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-corporate-muted">
                  No quotations created yet. Click "New Multi-Currency Proposal" to create one.
                </td>
              </tr>
            ) : (
              quotationsData?.quotations?.map((q: any) => {
                const rmbR = Number(q.rmbRate) || 38.50;
                const usdR = Number(q.usdRate) || 278.50;
                const pkrTotal = Number(q.totalAmount) || 0;
                const rmbTotal = pkrTotal / rmbR;
                const usdTotal = pkrTotal / usdR;

                return (
                  <tr key={q.id} className="hover:bg-brand-50/20">
                    <td className="p-3 font-mono font-bold text-brand-700">{q.quotationNumber}</td>
                    <td className="p-3 font-semibold text-corporate-title">
                      {q.companyName}
                      {q.contactPerson && <div className="text-[10px] text-corporate-muted font-normal">Attn: {q.contactPerson}</div>}
                    </td>
                    <td className="p-3 font-mono text-corporate-text">{q.tenderNumber || q.referenceNumber || 'N/A'}</td>
                    <td className="p-3">{new Date(q.quotationDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-bold text-brand-900">
                      Rs. {pkrTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-green-700">
                      ¥ {rmbTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-700">
                      $ {usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          q.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : q.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : q.status === 'SENT'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedQuotation(q);
                          setIsViewOpen(true);
                        }}
                        className="p-1 hover:bg-brand-100 text-brand-600 rounded inline-block"
                        title="View Official CITY LINK Proposal Sheet"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditQuotation(q)}
                        className="p-1 hover:bg-blue-100 text-blue-600 rounded inline-block"
                        title="Edit Proposal & Exchange Rates"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate('/invoices', { state: { fromQuotation: q } })}
                        className="p-1 hover:bg-emerald-100 text-emerald-700 rounded inline-block"
                        title="Generate / View Sales Bill Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate('/challans', { state: { fromQuotation: q } })}
                        className="p-1 hover:bg-yellow-100 text-yellow-700 rounded inline-block"
                        title="Generate / View Delivery Challan"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* QUOTATION EDITOR MODAL (Exchange Rate Config at VERY TOP) */}
      {/* ==================================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden text-xs flex flex-col h-[95vh]">
            {/* Modal Top Header */}
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#F97316]" />
                <h3 className="font-bold text-sm tracking-wide">
                  {editingQuotationId ? 'Edit Quotation Proposal' : 'Create New Multi-Currency Commercial Quotation'}
                </h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 bg-gray-50/50">
              {/* REQUIREMENT 1: CENTRALIZED EXCHANGE RATE AT VERY TOP BEFORE CUSTOMER INFO */}
              <div className="bg-white p-4 rounded-lg border-2 border-brand-500 shadow-dynamics space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-brand-900 uppercase text-[11px] tracking-wider">
                      Quotation-Level Exchange Rate & Currency Configuration (Single Source of Truth)
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">Applies to all calculations below</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Select Quotation Base Currency */}
                  <div className="space-y-1 bg-brand-50/50 p-2.5 rounded border border-brand-200">
                    <label className="font-bold text-brand-900 block text-[10px] uppercase">Primary Base Currency</label>
                    <select
                      value={quotationCurrency}
                      onChange={(e) => setQuotationCurrency(e.target.value as any)}
                      className="w-full p-1.5 font-bold border border-brand-300 rounded bg-white text-brand-950"
                    >
                      <option value="PKR">PKR (Pakistani Rupee)</option>
                      <option value="RMB">RMB (Chinese Yuan)</option>
                      <option value="USD">USD (US Dollar)</option>
                    </select>
                  </div>

                  {/* RMB Exchange Rate */}
                  <div className="space-y-1 bg-brand-50/50 p-2.5 rounded border border-brand-200">
                    <label className="font-bold text-brand-900 block text-[10px] uppercase">RMB Exchange Rate (PKR / RMB)</label>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-600 font-mono">1 RMB =</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={rmbRate}
                        onChange={(e) => handleCentralExchangeRateChange(Number(e.target.value), usdRate)}
                        required
                        className="w-full p-1 text-right font-mono font-bold text-brand-900 bg-white border border-brand-300 rounded"
                      />
                      <span className="font-bold text-gray-700">PKR</span>
                    </div>
                  </div>

                  {/* USD Exchange Rate */}
                  <div className="space-y-1 bg-brand-50/50 p-2.5 rounded border border-brand-200">
                    <label className="font-bold text-brand-900 block text-[10px] uppercase">USD Exchange Rate (PKR / USD)</label>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-600 font-mono">1 USD =</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={usdRate}
                        onChange={(e) => handleCentralExchangeRateChange(rmbRate, Number(e.target.value))}
                        required
                        className="w-full p-1 text-right font-mono font-bold text-brand-900 bg-white border border-brand-300 rounded"
                      />
                      <span className="font-bold text-gray-700">PKR</span>
                    </div>
                  </div>

                  {/* Presentation Mode */}
                  <div className="space-y-1 bg-brand-50/50 p-2.5 rounded border border-brand-200">
                    <label className="font-bold text-brand-900 block text-[10px] uppercase">Presentation Display Mode</label>
                    <select
                      value={displayCurrencies}
                      onChange={(e) => setDisplayCurrencies(e.target.value)}
                      className="w-full p-1.5 font-bold border border-brand-300 rounded bg-white text-brand-950"
                    >
                      <option value="PKR,RMB,USD">All Currencies (PKR, RMB, USD & Internet)</option>
                      <option value="PKR,RMB">PKR & Zone RMB</option>
                      <option value="PKR,USD">PKR & USD</option>
                      <option value="PKR">PKR Only (Client Standard)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer & Company Details Block */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <h4 className="font-bold text-brand-900 uppercase text-[11px] border-b pb-1">Customer & Tender Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Customer / Company Name*</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="e.g. Ghazi Electronics"
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Department / Division</label>
                    <input
                      type="text"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      placeholder="e.g. Procurement & Imports Dept"
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Attn / Contact Person</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Manager Procurement"
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Contact Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="051-XXXXXXX"
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Location / Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rawalpindi / Islamabad"
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-2">
                  <div className="col-span-2 space-y-1">
                    <label className="font-bold text-corporate-muted">Quotation Subject*</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      placeholder="e.g. QUOTATION FOR ELECTRONIC COMPONENTS"
                      className="w-full font-semibold p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Tender / Ref Number</label>
                    <input
                      type="text"
                      value={tenderNumber}
                      onChange={(e) => setTenderNumber(e.target.value)}
                      placeholder="e.g. 505.8-926/25-26"
                      className="w-full font-mono p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-corporate-muted">Tender Date</label>
                    <input
                      type="date"
                      value={tenderDate}
                      onChange={(e) => setTenderDate(e.target.value)}
                      className="w-full p-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* REQUIREMENT 2 & 3: RESTRUCTURED ITEM PRICING TABLE WITH PER-ITEM RMB/USD CURRENCY SELECTION */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-brand-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-brand-600" /> Quotation Line Items & Per-Item Pricing Structure
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold border border-brand-300 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1250px] text-xs">
                    <thead>
                      <tr className="bg-brand-950 text-white font-bold uppercase text-[10px]">
                        <th colSpan={8} className="p-2 border-r border-brand-800 text-center bg-blue-950">
                          1. Base Client Proposal (PKR)
                        </th>
                        <th colSpan={3} className="p-2 border-r border-brand-800 text-center bg-emerald-900">
                          2. Zone Price (Admin RMB / USD)
                        </th>
                        <th colSpan={3} className="p-2 border-r border-brand-800 text-center bg-amber-900">
                          3. Internet Price (Admin RMB / USD)
                        </th>
                        <th colSpan={1} className="p-2 bg-gray-900 text-center">
                          Actions
                        </th>
                      </tr>
                      <tr className="bg-gray-100 text-gray-700 text-[10px] font-bold uppercase border-b border-gray-300">
                        <th className="p-2 w-8 text-center border-r">Sr#</th>
                        <th className="p-2 w-36 border-r">Order Code / PN*</th>
                        <th className="p-2 border-r">Description*</th>
                        <th className="p-2 w-24 border-r">Manf</th>
                        <th className="p-2 w-14 text-center border-r">Qty*</th>
                        <th className="p-2 w-12 border-r">UOM</th>
                        <th className="p-2 w-24 text-right border-r bg-blue-50/50">Unit Price (PKR)*</th>
                        <th className="p-2 w-28 text-right border-r bg-blue-100/50 font-bold text-brand-900">
                          Total (PKR)
                        </th>
                        {/* Zone Price Group */}
                        <th className="p-2 w-16 text-center border-r bg-emerald-50/50">Unit</th>
                        <th className="p-2 w-24 text-right border-r bg-emerald-50/50">Unit Price</th>
                        <th className="p-2 w-28 text-right border-r bg-emerald-100/50">Total</th>
                        {/* Internet Price Group */}
                        <th className="p-2 w-16 text-center border-r bg-amber-50/50">Unit</th>
                        <th className="p-2 w-24 text-right border-r bg-amber-50/50">Unit Price</th>
                        <th className="p-2 w-28 text-right border-r bg-amber-100/50">Total</th>
                        <th className="p-2 w-20 text-center">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-brand-50/10">
                          <td className="p-1.5 text-center font-bold text-gray-500 border-r">{idx + 1}</td>
                          <td className="p-1.5 relative border-r">
                            <input
                              type="text"
                              value={item.partNumber}
                              onChange={(e) => handleProductSearch(e.target.value, idx)}
                              required
                              placeholder="Part Number / Code"
                              className="w-full font-mono font-bold text-brand-800 p-1 border border-gray-200 rounded"
                            />
                            {activeItemIndex === idx && suggestions.length > 0 && (
                              <div className="absolute left-0 top-full z-20 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto text-[11px]">
                                {suggestions.map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => handleSelectProduct(p, idx)}
                                    className="p-2 hover:bg-brand-50 cursor-pointer border-b"
                                  >
                                    <div className="font-bold text-brand-700">{p.partNumber}</div>
                                    <div className="text-gray-500 truncate">{p.name || p.description}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-1.5 border-r">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].description = e.target.value;
                                setItems(updated);
                              }}
                              required
                              placeholder="Description / Specifications"
                              className="w-full p-1 border border-gray-200 rounded"
                            />
                          </td>
                          <td className="p-1.5 border-r">
                            <input
                              type="text"
                              value={item.manufacturer}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].manufacturer = e.target.value;
                                setItems(updated);
                              }}
                              placeholder="Manufacturer"
                              className="w-full p-1 border border-gray-200 rounded"
                            />
                          </td>
                          <td className="p-1.5 border-r">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].quantity = Math.max(1, Number(e.target.value));
                                recalculateItemValues(idx, updated);
                              }}
                              required
                              className="w-full p-1 text-center font-bold border border-gray-200 rounded"
                            />
                          </td>
                          <td className="p-1.5 border-r">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].unit = e.target.value;
                                setItems(updated);
                              }}
                              className="w-full p-1 text-center border border-gray-200 rounded"
                            />
                          </td>

                          {/* PKR Base Price */}
                          <td className="p-1.5 border-r bg-blue-50/30">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPricePkr}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].unitPricePkr = Math.max(0, Number(e.target.value));
                                recalculateItemValues(idx, updated);
                              }}
                              required
                              className="w-full p-1 text-right font-mono font-bold text-brand-900 border border-brand-300 rounded"
                            />
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-brand-950 border-r bg-blue-100/50">
                            Rs. {item.totalPricePkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Zone Price Group (Currency Selector RMB/USD + Unit Price + Total) */}
                          <td className="p-1.5 border-r bg-emerald-50/30">
                            <select
                              value={item.zoneCurrency}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].zoneCurrency = e.target.value as any;
                                recalculateItemValues(idx, updated);
                              }}
                              className="w-full p-1 font-bold bg-emerald-100 border border-emerald-300 rounded text-emerald-950 text-center"
                            >
                              <option value="RMB">RMB</option>
                              <option value="USD">USD</option>
                            </select>
                          </td>
                          <td className="p-1.5 border-r bg-emerald-50/30">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={item.zoneCurrency === 'RMB' ? item.unitPriceRmb : item.unitPriceUsd}
                              onChange={(e) => {
                                const updated = [...items];
                                const val = Math.max(0, Number(e.target.value));
                                if (item.zoneCurrency === 'RMB') {
                                  updated[idx].unitPriceRmb = val;
                                  updated[idx].unitPricePkr = Number((val * rmbRate).toFixed(2));
                                } else {
                                  updated[idx].unitPriceUsd = val;
                                  updated[idx].unitPricePkr = Number((val * usdRate).toFixed(2));
                                }
                                recalculateItemValues(idx, updated);
                              }}
                              className="w-full p-1 text-right font-mono font-bold text-emerald-900 border border-emerald-300 rounded"
                            />
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-emerald-950 border-r bg-emerald-100/50">
                            {item.zoneCurrency === 'RMB' ? '¥' : '$'}{' '}
                            {(item.zoneCurrency === 'RMB' ? item.totalPriceRmb : item.totalPriceUsd).toLocaleString('en-US', {
                              minimumFractionDigits: 2
                            })}
                          </td>

                          {/* Internet Price Group (Currency Selector RMB/USD + Unit Price + Total) */}
                          <td className="p-1.5 border-r bg-amber-50/30">
                            <select
                              value={item.internetCurrency}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].internetCurrency = e.target.value as any;
                                setItems(updated);
                              }}
                              className="w-full p-1 font-bold bg-amber-100 border border-amber-300 rounded text-amber-950 text-center"
                            >
                              <option value="RMB">RMB</option>
                              <option value="USD">USD</option>
                            </select>
                          </td>
                          <td className="p-1.5 border-r bg-amber-50/30">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={item.internetUnitPrice}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].internetUnitPrice = Math.max(0, Number(e.target.value));
                                updated[idx].internetTotalPrice = Number(
                                  (updated[idx].internetUnitPrice * updated[idx].quantity).toFixed(2)
                                );
                                setItems(updated);
                              }}
                              className="w-full p-1 text-right font-mono font-bold text-amber-900 border border-amber-300 rounded"
                            />
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-amber-950 border-r bg-amber-100/50">
                            {item.internetCurrency === 'RMB' ? '¥' : '$'}{' '}
                            {item.internetTotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Controls */}
                          <td className="p-1 text-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleMoveItem(idx, 'UP')}
                              disabled={idx === 0}
                              className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-20"
                            >
                              <ArrowUp className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveItem(idx, 'DOWN')}
                              disabled={idx === items.length - 1}
                              className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-20"
                            >
                              <ArrowDown className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateItemRow(idx)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItemRow(idx)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commercial Terms & Multi-Currency Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-brand-900 uppercase text-[11px] border-b pb-1">Commercial Terms Settings</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600">Delivery Timeline</label>
                      <input
                        type="text"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600">Warranty Period</label>
                      <input
                        type="text"
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600">Payment Terms</label>
                      <input
                        type="text"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600">Signatory Full Name</label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600">Signatory Phone</label>
                      <input
                        type="text"
                        value={signatoryPhone}
                        onChange={(e) => setSignatoryPhone(e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-2 text-right font-semibold">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-gray-600">Subtotal (PKR):</span>
                    <span className="font-bold text-brand-900">
                      Rs. {totals.subTotalPkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-1">
                    <span className="text-gray-600 flex items-center gap-1">
                      Discount (%):
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountRate}
                        onChange={(e) => setDiscountRate(Math.max(0, Number(e.target.value)))}
                        className="w-12 p-0.5 text-center font-normal border border-gray-300 rounded"
                      />
                    </span>
                    <span className="text-red-600">
                      -Rs. {totals.discountAmountPkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b pb-1">
                    <span className="text-gray-600 flex items-center gap-1">
                      Sales Tax / GST (%):
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                        className="w-12 p-0.5 text-center font-normal border border-gray-300 rounded"
                      />
                    </span>
                    <span>+Rs. {totals.taxAmountPkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Multi-Currency Grand Totals Highlight */}
                  <div className="bg-[#0F294A] text-white p-3 rounded-lg space-y-1 mt-2 text-left">
                    <div className="flex justify-between font-black text-sm">
                      <span>Grand Total (PKR):</span>
                      <span className="font-mono text-yellow-400">
                        Rs. {totals.grandTotalPkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-green-300 font-mono">
                      <span>RMB Equivalent (@ 1 RMB = {rmbRate} PKR):</span>
                      <span>¥ {totals.grandTotalRmb.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-blue-300 font-mono">
                      <span>USD Equivalent (@ 1 USD = {usdRate} PKR):</span>
                      <span>$ {totals.grandTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="py-2 px-5 border border-gray-300 rounded-md font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveQuotationMutation.isPending}
                  className="py-2.5 px-6 bg-[#0F294A] hover:bg-brand-900 text-white rounded-md font-bold transition-colors disabled:opacity-50 shadow-md"
                >
                  {saveQuotationMutation.isPending ? 'Saving Proposal...' : 'Save Commercial Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REQUIREMENT 4: OFFICIAL PRINTABLE QUOTATION MODAL WITH STRICT SEQUENCE: */}
      {/* 1. Letterhead Header */}
      {/* 2. Customer & Header Info */}
      {/* 3. TERMS & CONDITIONS FIRST */}
      {/* 4. AUTHORIZED SIGNATORY SECTION (WITH STAMP SPACE) */}
      {/* 5. DETAILED ITEM PRICING TABLE AFTER THAT */}
      {/* ==================================================================== */}
      {isViewOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden text-xs flex flex-col h-[95vh]">
            {/* Header controls bar */}
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0 no-print">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-[#F97316]" /> Official Commercial Proposal Sheet: {selectedQuotation.quotationNumber}
              </h3>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdminPricesInView}
                    onChange={(e) => setShowAdminPricesInView(e.target.checked)}
                    className="rounded"
                  />
                  <span>Show Zone & Internet Price Breakdown</span>
                </label>
                {selectedQuotation.status !== 'APPROVED' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedQuotation.id, status: 'APPROVED' })}
                    className="flex items-center space-x-1.5 py-1 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Proposal</span>
                  </button>
                )}
                <button
                  onClick={triggerPrintSpool}
                  className="flex items-center space-x-1.5 py-1 px-3 bg-white text-brand-900 hover:bg-brand-50 font-bold rounded transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Export PDF</span>
                </button>
                <button onClick={() => setIsViewOpen(false)} className="hover:bg-white/10 p-1 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Area with EXACT MANDATED SEQUENCE */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white font-sans text-xs printable-section" id="print-area">
              {/* SEQUENCE STEP 1: CITY LINK Master Letterhead Header */}
              <MasterLetterheadHeader />

              {/* Document Title */}
              <div className="text-center my-2">
                <h1 className="text-xl font-black text-gray-900 tracking-wider uppercase font-sans border-b-2 border-gray-900 inline-block px-6 pb-0.5">
                  QUOTATION
                </h1>
              </div>

              {/* SEQUENCE STEP 2: Customer & Quotation Header Details */}
              <div className="flex justify-between items-start text-xs border border-gray-400 p-3 rounded bg-gray-50/50">
                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-gray-800">Ref #:</span>{' '}
                    <span className="font-mono font-bold text-brand-900">{selectedQuotation.quotationNumber}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-800">Date:</span>{' '}
                    {new Date(selectedQuotation.quotationDate).toLocaleDateString('en-GB')}
                  </div>
                  <div className="pt-1">
                    <span className="font-bold text-gray-800">Company Name:</span>{' '}
                    <span className="font-bold text-gray-900 text-sm">{selectedQuotation.companyName}</span>
                  </div>
                  {selectedQuotation.departmentName && (
                    <div>
                      <span className="font-bold text-gray-800">Department:</span> {selectedQuotation.departmentName}
                    </div>
                  )}
                  {selectedQuotation.address && (
                    <div>
                      <span className="font-bold text-gray-800">Address:</span> {selectedQuotation.address}
                    </div>
                  )}
                  {selectedQuotation.contactPerson && (
                    <div>
                      <span className="font-bold text-gray-800">Attn:</span> {selectedQuotation.contactPerson}
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1 font-mono text-[11px]">
                  <div>
                    <span className="font-bold font-sans text-gray-800">NTN:</span> {selectedQuotation.ntn || '4045999-9'}
                  </div>
                  <div>
                    <span className="font-bold font-sans text-gray-800">STRN:</span> {selectedQuotation.strn || '29-00-4045-999-12'}
                  </div>
                </div>
              </div>

              {/* Salutation & Subject */}
              <div className="space-y-2 border-b pb-3 border-gray-300">
                <p className="font-bold text-sm text-gray-900 underline">
                  Subject: {selectedQuotation.subject || 'QUOTATION FOR ELECTRONIC COMPONENTS'}
                </p>
                <p className="font-semibold text-xs text-gray-800">Dear Sir,</p>
                <p className="text-xs text-gray-800 leading-relaxed">
                  Reference to your tender{' '}
                  <span className="font-bold">
                    {selectedQuotation.tenderNumber || selectedQuotation.referenceNumber || '505.8-926/25-26'}
                  </span>
                  {selectedQuotation.tenderDate && (
                    <span>
                      {' '}
                      dated{' '}
                      <span className="font-bold">
                        {new Date(selectedQuotation.tenderDate).toLocaleDateString('en-GB')}
                      </span>
                    </span>
                  )}{' '}
                  regarding the prices of above subject items, we are pleased to quote the attached prices for your kind attention.
                </p>
              </div>

              {/* SEQUENCE STEP 3: TERMS & CONDITIONS MUST APPEAR FIRST! */}
              <div className="border-2 border-gray-900 rounded p-4 bg-gray-50/30 space-y-2 text-xs leading-relaxed text-gray-900">
                <h4 className="font-black text-xs text-gray-900 uppercase tracking-wider border-b border-gray-400 pb-1">
                  Commercial Terms & Conditions (Applies to Attached Item Breakdown)
                </h4>
                <ul className="space-y-1 list-disc pl-4 text-[11px]">
                  <li>Prices are exclusive of GST and same shall be charged additionally as per Govt. rules & regulations.</li>
                  <li>All the prices are quoted in Pak Rupees on FOR Islamabad basis.</li>
                  <li>The prices are only valid for quoted quantity.</li>
                  <li>
                    The Delivery Timeline is{' '}
                    <span className="font-bold">{selectedQuotation.deliveryTime || '08-12 Weeks'}</span>.
                  </li>
                  <li>
                    All items have{' '}
                    <span className="font-bold">{selectedQuotation.warranty || '01 year standard warranty'}</span> with proper
                    packing as per manufacturer, distributor or supplier instead of COC.
                  </li>
                  <li>Quote is subject to prior sale and manufacturer may change part number.</li>
                  <li>
                    At the time of order, if any of the quoted item(s) is obsolete or discontinued, we will be provided equivalent of
                    it otherwise the item(s) will be deleted from the purchase order.
                  </li>
                  <li>
                    The price validity is <span className="font-bold">60 days</span>.
                  </li>
                  <li>Please mention NTN and STRN on purchase order.</li>
                  <li>
                    Payment Terms: <span className="font-bold">{selectedQuotation.paymentTerms || '100% after delivery'}</span>.
                  </li>
                </ul>
              </div>

              {/* SEQUENCE STEP 4: DEDICATED AUTHORIZED/ADMIN SIGNATORY SECTION WITH BLANK SPACE FOR STAMP & SIGNATURE */}
              <div className="py-4 border border-gray-400 rounded p-4 bg-white">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-700 font-medium">If any further information please feel free to contact us.</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">Official Quotation Verification & Approval</p>
                  </div>
                  <div className="text-right space-y-1 min-w-[250px]">
                    <div className="font-bold text-sm text-gray-900">{selectedQuotation.signatoryName || 'Saqib Shafique'}</div>
                    <div className="text-gray-800 font-mono font-bold">{selectedQuotation.signatoryPhone || '0321-8507444'}</div>
                    <div className="text-[10px] font-bold text-brand-900 uppercase tracking-widest pt-1">
                      CITY LINK (Engineering & Services)
                    </div>
                    {/* Blank space for physical signature & stamp */}
                    <div className="h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-[10px] italic mt-2">
                      AUTHORIZED SIGNATURE & STAMP HERE
                    </div>
                  </div>
                </div>
              </div>

              {/* SEQUENCE STEP 5: DETAILED QUOTATION ITEM / PRICING TABLE AFTER TERMS AND SIGNATURE! */}
              <div className="pt-2 space-y-3">
                <div className="flex justify-between items-center border-b-2 border-gray-900 pb-1">
                  <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                    Detailed Quotation Item Pricing & Financial Schedule
                  </h3>
                  <span className="text-[10px] font-mono text-gray-600">Base Currency: PKR</span>
                </div>

                <div className="border border-gray-900 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      {showAdminPricesInView && (
                        <tr className="bg-gray-900 text-white font-bold uppercase text-[9px] border-b border-gray-900">
                          <th colSpan={8} className="p-1.5 border-r border-gray-700 text-center bg-blue-950">
                            Client Proposal Pricing (PKR Base)
                          </th>
                          <th colSpan={2} className="p-1.5 border-r border-gray-700 text-center bg-emerald-900">
                            Zone Price
                          </th>
                          <th colSpan={2} className="p-1.5 text-center bg-amber-900">
                            Internet Price
                          </th>
                        </tr>
                      )}
                      <tr className="bg-gray-200 text-gray-900 font-bold border-b border-gray-900 uppercase text-[10px] tracking-wider">
                        <th className="p-2 text-center border-r border-gray-900 w-10">Sr. #</th>
                        <th className="p-2 border-r border-gray-900 w-36">Order Code / PN</th>
                        <th className="p-2 border-r border-gray-900">Description</th>
                        <th className="p-2 border-r border-gray-900 w-20">Manf</th>
                        <th className="p-2 text-center border-r border-gray-900 w-12">Qty</th>
                        <th className="p-2 text-center border-r border-gray-900 w-12">UOM</th>
                        <th className="p-2 text-right border-r border-gray-900 w-24">Unit Price (PKR)</th>
                        <th className="p-2 text-right border-r border-gray-900 w-28">Total (PKR)</th>
                        {showAdminPricesInView && (
                          <>
                            <th className="p-2 text-right border-r border-gray-900 w-24 bg-emerald-50">Unit Price</th>
                            <th className="p-2 text-right border-r border-gray-900 w-24 bg-emerald-100">Total</th>
                            <th className="p-2 text-right border-r border-gray-900 w-24 bg-amber-50">Unit Price</th>
                            <th className="p-2 text-right w-24 bg-amber-100">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-400">
                      {selectedQuotation.items?.map((item: any) => {
                        const pkrUnit = Number(item.unitPricePkr || item.finalUnitPrice || item.unitPrice) || 0;
                        const pkrTotal = Number(item.totalPricePkr || item.finalTotalPrice || item.totalPrice) || 0;
                        const zoneCurr = item.zoneCurrency || 'RMB';
                        const zoneUnit = zoneCurr === 'RMB' ? Number(item.unitPriceRmb || item.zonePriceRmb) || 0 : Number(item.unitPriceUsd) || 0;
                        const zoneTotal = zoneCurr === 'RMB' ? Number(item.totalPriceRmb) || 0 : Number(item.totalPriceUsd) || 0;

                        const netCurr = item.internetCurrency || 'RMB';
                        const netUnit = Number(item.internetUnitPrice || item.internetPrice) || 0;
                        const netTotal = Number(item.internetTotalPrice || (netUnit * item.quantity)) || 0;

                        return (
                          <tr key={item.id} className="text-xs">
                            <td className="p-2 text-center font-bold border-r border-gray-400">{item.srNo}</td>
                            <td className="p-2 font-mono font-bold text-gray-900 border-r border-gray-400">{item.partNumber}</td>
                            <td className="p-2 border-r border-gray-400 leading-normal">{item.description || 'N/A'}</td>
                            <td className="p-2 border-r border-gray-400">{item.manufacturer || 'N/A'}</td>
                            <td className="p-2 text-center font-semibold border-r border-gray-400">{item.quantity}</td>
                            <td className="p-2 text-center border-r border-gray-400">{item.unit || 'Pcs'}</td>
                            <td className="p-2 text-right font-mono border-r border-gray-400">
                              {pkrUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-gray-900 border-r border-gray-400">
                              {pkrTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {showAdminPricesInView && (
                              <>
                                <td className="p-2 text-right font-mono text-emerald-900 border-r border-gray-400 bg-emerald-50/50">
                                  {zoneCurr === 'RMB' ? '¥' : '$'} {zoneUnit.toFixed(2)}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-emerald-950 border-r border-gray-400 bg-emerald-100/50">
                                  {zoneCurr === 'RMB' ? '¥' : '$'}{' '}
                                  {zoneTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-2 text-right font-mono text-amber-900 border-r border-gray-400 bg-amber-50/50">
                                  {netCurr === 'RMB' ? '¥' : '$'} {netUnit.toFixed(3)}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-amber-950 bg-amber-100/50">
                                  {netCurr === 'RMB' ? '¥' : '$'}{' '}
                                  {netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end font-sans">
                  <div className="w-80 border border-gray-900 rounded overflow-hidden">
                    <div className="flex justify-between p-2 border-b border-gray-300 bg-gray-50">
                      <span className="font-semibold text-gray-700">Subtotal (PKR):</span>
                      <span className="font-bold font-mono text-gray-900">
                        Rs. {Number(selectedQuotation.subTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {Number(selectedQuotation.discountAmount) > 0 && (
                      <div className="flex justify-between p-2 border-b border-gray-300 text-red-600 bg-red-50/20">
                        <span>Discount ({Number(selectedQuotation.discountRate)}%):</span>
                        <span className="font-mono">
                          -Rs. {Number(selectedQuotation.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(selectedQuotation.taxAmount) > 0 && (
                      <div className="flex justify-between p-2 border-b border-gray-300 bg-gray-50">
                        <span className="text-gray-700">Sales Tax / GST ({Number(selectedQuotation.taxRate)}%):</span>
                        <span className="font-mono">
                          +Rs. {Number(selectedQuotation.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Primary Grand Total (PKR) + Equiv RMB and USD */}
                    <div className="bg-gray-900 text-white p-3 space-y-1">
                      <div className="flex justify-between font-bold text-sm">
                        <span>Grand Total (PKR):</span>
                        <span className="font-mono text-yellow-400">
                          Rs. {Number(selectedQuotation.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-green-300 font-mono">
                        <span>
                          Equivalent RMB Total (@ 1 RMB = {Number(selectedQuotation.rmbRate || 38.50)} PKR):
                        </span>
                        <span>
                          ¥{' '}
                          {(
                            Number(selectedQuotation.totalAmount) / Number(selectedQuotation.rmbRate || 38.50)
                          ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-blue-300 font-mono">
                        <span>
                          Equivalent USD Total (@ 1 USD = {Number(selectedQuotation.usdRate || 278.50)} PKR):
                        </span>
                        <span>
                          ${' '}
                          {(
                            Number(selectedQuotation.totalAmount) / Number(selectedQuotation.usdRate || 278.50)
                          ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
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
