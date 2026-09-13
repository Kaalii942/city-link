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
  Truck,
  CheckCircle2,
  FileCheck,
  Globe
} from 'lucide-react';
import { MasterLetterheadHeader, MasterLetterheadFooter } from '../components/Letterhead.js';

export default function Challans() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modals
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<any>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'PKR' | 'RMB' | 'USD'>('PKR');

  // Dispatch Modal inputs
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [targetChallan, setTargetChallan] = useState<any>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [receiver, setReceiver] = useState('');

  // Fetch Challans
  const { data: challansData, isLoading } = useQuery<any>({
    queryKey: ['challans', search, statusFilter, page],
    queryFn: () => api.get(`/api/challans?search=${search}&status=${statusFilter}&page=${page}&limit=10`)
  });

  // Pre-fill / open challan on navigate from Quotation or Invoice
  useEffect(() => {
    if (location.state?.fromQuotation) {
      const q = location.state.fromQuotation;
      if (q.deliveryChallans && q.deliveryChallans.length > 0) {
        api.get(`/api/challans/${q.deliveryChallans[0].id}`).then((res: any) => {
          if (res.challan) {
            setSelectedChallan(res.challan);
            setSelectedCurrency((res.challan.currency as any) || 'PKR');
            setIsViewOpen(true);
          }
        });
      }
    } else if (location.state?.fromInvoice) {
      const inv = location.state.fromInvoice;
      if (inv.quotationId) {
        api.get(`/api/challans?search=${inv.companyName}`).then((res: any) => {
          if (res.challans && res.challans.length > 0) {
            setSelectedChallan(res.challans[0]);
            setSelectedCurrency((res.challans[0].currency as any) || 'PKR');
            setIsViewOpen(true);
          }
        });
      }
    }
  }, [location.state]);

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: (data: { id: string; vehicleNumber: string; driverName: string; receiver: string }) =>
      api.put(`/api/challans/${data.id}`, {
        vehicleNumber: data.vehicleNumber,
        driverName: data.driverName,
        receiver: data.receiver,
        status: 'DISPATCHED'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      setIsDispatchModalOpen(false);
      setIsViewOpen(false);
      setVehicleNumber('');
      setDriverName('');
      setReceiver('');
    }
  });

  // Update Challan Currency Mutation
  const updateCurrencyMutation = useMutation({
    mutationFn: (data: { id: string; currency: string }) =>
      api.put(`/api/challans/${data.id}`, { currency: data.currency }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
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

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Delivery Challans</h2>
          <p className="text-sm text-corporate-muted mt-1">
            Official CITY LINK (Engineering & Services) Goods Delivery Dispatch Notes & Logistics Tracking.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-corporate-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search delivery challans (challan number, customer company, vehicle, driver...)"
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
          <option value="DISPATCHED">Dispatched</option>
          <option value="DELIVERED">Delivered</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      {/* Challans Table Grid */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">Challan No</th>
              <th className="p-3">Client Company</th>
              <th className="p-3">Dispatch Date</th>
              <th className="p-3">Vehicle Number</th>
              <th className="p-3">Driver Name</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-corporate-muted">
                  Loading delivery logs...
                </td>
              </tr>
            ) : challansData?.challans?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-corporate-muted">
                  No Delivery Challans created. Created automatically from Commercial Quotations.
                </td>
              </tr>
            ) : (
              challansData?.challans?.map((dc: any) => (
                <tr key={dc.id} className="hover:bg-brand-50/20">
                  <td className="p-3 font-mono font-bold text-brand-700">{dc.challanNumber}</td>
                  <td className="p-3 font-semibold text-corporate-title">
                    {dc.companyName}
                    {dc.contactPerson && <div className="text-[10px] text-corporate-muted font-normal">Attn: {dc.contactPerson}</div>}
                  </td>
                  <td className="p-3">{new Date(dc.dispatchDate).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold text-corporate-title">{dc.vehicleNumber || 'Pending'}</td>
                  <td className="p-3">{dc.driverName || 'Pending'}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        dc.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-700'
                          : dc.status === 'DISPATCHED'
                          ? 'bg-blue-100 text-blue-700'
                          : dc.status === 'RETURNED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {dc.status}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedChallan(dc);
                        setSelectedCurrency((dc.currency as any) || 'PKR');
                        setIsViewOpen(true);
                      }}
                      className="p-1 hover:bg-brand-100 text-brand-600 rounded inline-block"
                      title="View Delivery Challan Sheet"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {dc.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setTargetChallan(dc);
                          setIsDispatchModalOpen(true);
                        }}
                        className="p-1 hover:bg-green-100 text-green-600 rounded inline-block"
                        title="Dispatch Goods & Deduct Stock"
                      >
                        <Truck className="w-4 h-4" />
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
      {/* PRINTABLE DELIVERY CHALLAN MODAL WITH CURRENCY SELECTION */}
      {/* ==================================================================== */}
      {isViewOpen && selectedChallan && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-xs flex flex-col h-[92vh]">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0 no-print">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-[#F97316]" /> Delivery Challan Sheet: {selectedChallan.challanNumber}
              </h3>
              <div className="flex items-center space-x-3">
                {/* REQUIREMENT 5: CURRENCY SELECTION OPTION FOR CHALLAN */}
                <div className="flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded">
                  <Globe className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[11px] font-bold text-gray-200">Currency:</span>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => {
                      const c = e.target.value as 'PKR' | 'RMB' | 'USD';
                      setSelectedCurrency(c);
                      updateCurrencyMutation.mutate({ id: selectedChallan.id, currency: c });
                    }}
                    className="bg-white text-brand-950 font-bold p-0.5 rounded text-xs"
                  >
                    <option value="PKR">PKR (Rs.)</option>
                    <option value="RMB">RMB (¥)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                {selectedChallan.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      setTargetChallan(selectedChallan);
                      setIsDispatchModalOpen(true);
                    }}
                    className="flex items-center space-x-1 py-1 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Cargo</span>
                  </button>
                )}
                <button
                  onClick={triggerPrintSpool}
                  className="flex items-center space-x-1.5 py-1 px-3 bg-white text-brand-900 hover:bg-brand-50 font-bold rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Challan / Export PDF</span>
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

              {/* Title Section */}
              <div className="text-center my-2">
                <h1 className="text-xl font-black text-gray-900 tracking-wider uppercase font-sans border-b-2 border-gray-900 inline-block px-6 pb-0.5">
                  DELIVERY CHALLAN
                </h1>
              </div>

              {/* Top Details (Challan #, Date, Selected Currency) */}
              <div className="flex justify-between items-start">
                <div className="w-64 border border-gray-900 text-xs font-sans">
                  <div className="p-1.5 border-b border-gray-900 font-bold bg-gray-100 flex justify-between">
                    <span>CHALLAN #</span>
                    <span className="font-mono text-brand-900">{selectedChallan.challanNumber}</span>
                  </div>
                  <div className="p-1.5 font-bold flex justify-between">
                    <span>Dispatch Date:</span>
                    <span className="font-normal">{new Date(selectedChallan.dispatchDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] bg-gray-50 border border-gray-300 p-2 rounded">
                  <div>
                    <span className="font-bold font-sans text-gray-800">Dispatch Currency:</span>{' '}
                    <span className="font-bold text-brand-900">{selectedCurrency}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Transit Details Grid Table */}
              <div className="border border-gray-900 rounded overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-900">
                      <td className="p-2 font-bold w-40 border-r border-gray-900 bg-gray-50">Customer's Name:</td>
                      <td className="p-2 font-bold text-gray-900 border-r border-gray-900">{selectedChallan.companyName}</td>
                      <td className="p-2 font-bold w-24 border-r border-gray-900 bg-gray-50">PO No.</td>
                      <td className="p-2 font-mono font-bold text-gray-900 w-48">
                        {selectedChallan.poNo || selectedChallan.quotation?.referenceNumber || 'N/A'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-900">
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Delivery Address:</td>
                      <td className="p-2 text-gray-800 border-r border-gray-900">{selectedChallan.address || 'N/A'}</td>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Ref / Quote:</td>
                      <td className="p-2 font-mono text-gray-900">{selectedChallan.quotation?.quotationNumber || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-900">
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Vehicle Reg #:</td>
                      <td className="p-2 font-bold text-gray-900 border-r border-gray-900">
                        {selectedChallan.vehicleNumber || 'Pending'}
                      </td>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Driver Name:</td>
                      <td className="p-2 text-gray-900">{selectedChallan.driverName || 'Pending'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Invoice Ref #:</td>
                      <td className="p-2 font-mono border-r border-gray-900">{selectedChallan.invoiceReference || 'N/A'}</td>
                      <td className="p-2 font-bold border-r border-gray-900 bg-gray-50">Receiver Ref:</td>
                      <td className="p-2 text-gray-900">{selectedChallan.receiver || 'Pending'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Table (Goods Specs & Quantities) */}
              <div className="border border-gray-900 rounded overflow-hidden mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-200 text-gray-900 font-bold border-b border-gray-900 text-[11px]">
                      <th className="p-2 text-center border-r border-gray-900 w-12">Sr. #</th>
                      <th className="p-2 border-r border-gray-900 w-48">Part # / Code</th>
                      <th className="p-2 border-r border-gray-900">Goods Description / Specs</th>
                      <th className="p-2 text-center border-r border-gray-900 w-20">Quantity</th>
                      <th className="p-2 text-center border-r border-gray-900 w-16">Unit</th>
                      <th className="p-2 w-32">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-400">
                    {selectedChallan.items?.map((item: any) => (
                      <tr key={item.id} className="text-xs">
                        <td className="p-2 text-center font-semibold border-r border-gray-400">{item.srNo}</td>
                        <td className="p-2 font-mono font-bold text-gray-900 border-r border-gray-400">{item.partNumber}</td>
                        <td className="p-2 border-r border-gray-400 leading-normal">{item.description || 'N/A'}</td>
                        <td className="p-2 text-center font-bold text-sm text-gray-900 border-r border-gray-400">
                          {item.quantity}
                        </td>
                        <td className="p-2 text-center border-r border-gray-400">{item.unit || 'Pcs'}</td>
                        <td className="p-2 text-gray-600">{item.remarks || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedChallan.remarks && (
                <div className="bg-gray-50 border border-gray-300 p-2.5 rounded text-gray-800 text-xs">
                  <span className="font-bold">Shipping Instructions: </span>
                  {selectedChallan.remarks}
                </div>
              )}

              {/* Signatures for receipt (3 Columns) */}
              <div className="pt-16 grid grid-cols-3 gap-8 font-sans text-center text-gray-700 text-xs">
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">DISPATCHED BY</p>
                  <p className="mt-1 text-[10px] text-gray-500">Warehouse Gatekeeper</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">DRIVER / CARRIER SIGNATURE</p>
                  <p className="mt-1 text-[10px] text-gray-500">Transit Driver</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-900">RECEIVED BY (SIGNATURE & STAMP)</p>
                  <p className="mt-1 text-[10px] text-gray-500">Customer Representative</p>
                  <div className="h-12 flex items-center justify-center text-gray-300 text-[9px] italic">STAMP HERE</div>
                </div>
              </div>

              {/* Master Letterhead Footer */}
              <MasterLetterheadFooter />
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH CARGO MODAL */}
      {isDispatchModalOpen && targetChallan && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#F97316]" /> Dispatch Goods Cargo
              </h3>
              <button onClick={() => setIsDispatchModalOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatchMutation.mutate({
                  id: targetChallan.id,
                  vehicleNumber,
                  driverName,
                  receiver
                });
              }}
              className="p-6 space-y-4"
            >
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-[11px] text-yellow-800">
                ⚠️ **Stock Deduction Warning**: Dispatching will automatically deduct item quantities from warehouse inventory.
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Vehicle Registration Number*</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  required
                  placeholder="e.g. LOZ-2394"
                  className="w-full p-1.5 border border-gray-300 rounded"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Driver Full Name / Contact*</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                  placeholder="e.g. Muhammad Aslam"
                  className="w-full p-1.5 border border-gray-300 rounded"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Receiver Identity / Post Name</label>
                <input
                  type="text"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder="e.g. Store Officer GHQ"
                  className="w-full p-1.5 border border-gray-300 rounded"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-corporate-border">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="py-1.5 px-4 border border-corporate-border rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchMutation.isPending}
                  className="py-1.5 px-4 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors"
                >
                  {dispatchMutation.isPending ? 'Logging dispatch...' : 'Confirm Dispatch & Deduct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
