import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import { Plus, X, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertOctagon } from 'lucide-react';

export default function Inventory() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    type: 'STOCK_IN',
    quantity: 1,
    sourceWarehouseId: '',
    destWarehouseId: '',
    referenceNo: '',
    remarks: ''
  });

  // Queries
  const { data: movementsData, isLoading } = useQuery<any>({
    queryKey: ['movements'],
    queryFn: () => api.get('/api/inventory/movements')
  });

  const { data: productsData } = useQuery<any>({
    queryKey: ['products-list'],
    queryFn: () => api.get('/api/products', { limit: 100 })
  });

  const { data: warehousesData } = useQuery<any>({
    queryKey: ['warehouses-list'],
    queryFn: () => api.get('/api/warehouses')
  });

  // Mutations
  const adjustMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/inventory/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const hasPerm = (perm: string) => {
    return user?.roles.includes('Super Admin') || user?.permissions.includes(perm);
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      type: 'STOCK_IN',
      quantity: 1,
      sourceWarehouseId: '',
      destWarehouseId: '',
      referenceNo: '',
      remarks: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || formData.quantity <= 0) {
      alert('Product and positive quantity are required');
      return;
    }
    adjustMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Inventory Logs</h2>
          <p className="text-sm text-corporate-muted mt-1">Review physical stock entries, internal transfers, and manual adjustment logs.</p>
        </div>
        {hasPerm('inventory:write') && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded font-semibold shadow-dynamics transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Adjustment</span>
          </button>
        )}
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Product / Part No</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-right">Quantity</th>
              <th className="p-3">Source Wh</th>
              <th className="p-3">Dest Wh</th>
              <th className="p-3">Ref No</th>
              <th className="p-3">User</th>
              <th className="p-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-corporate-muted">Loading transaction logs...</td>
              </tr>
            ) : movementsData?.movements?.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-corporate-muted">No inventory movement logs recorded inside database.</td>
              </tr>
            ) : (
              movementsData?.movements?.map((m: any) => {
                let badgeClass = 'bg-gray-100 text-gray-700';
                let Icon = RefreshCw;
                if (m.type === 'STOCK_IN' || m.type === 'RETURN') {
                  badgeClass = 'bg-green-50 text-green-700 border-green-200';
                  Icon = ArrowDownLeft;
                } else if (m.type === 'STOCK_OUT' || m.type === 'DAMAGE' || m.type === 'RESERVE') {
                  badgeClass = 'bg-red-50 text-red-700 border-red-200';
                  Icon = m.type === 'DAMAGE' ? AlertOctagon : ArrowUpRight;
                }

                return (
                  <tr key={m.id} className="hover:bg-brand-50/20">
                    <td className="p-3 text-corporate-muted">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <div>
                        <p className="font-semibold text-corporate-text">{m.product?.name}</p>
                        <p className="text-[10px] text-corporate-muted font-mono">{m.product?.partNumber}</p>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded border text-[9px] font-bold ${badgeClass}`}>
                        <Icon className="w-3 h-3" />
                        <span>{m.type}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">{m.quantity} {m.product?.unit || 'Pcs'}</td>
                    <td className="p-3">{m.sourceWarehouse?.name || 'N/A'}</td>
                    <td className="p-3">{m.destWarehouse?.name || 'N/A'}</td>
                    <td className="p-3 font-mono font-semibold">{m.referenceNo || 'N/A'}</td>
                    <td className="p-3 font-semibold text-corporate-muted">{m.creator?.username}</td>
                    <td className="p-3 text-corporate-muted truncate max-w-xs">{m.remarks || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* MANUAL ADJUSTMENT MODAL */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden flex flex-col text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Manual Inventory Adjustment</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Product */}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Product Item*</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  required
                  className="w-full"
                >
                  <option value="">Choose Product</option>
                  {productsData?.products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.partNumber}) &bull; Qty: {p.quantity}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Adjustment Type*</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full"
                >
                  <option value="STOCK_IN">Stock In (Add items to stock)</option>
                  <option value="STOCK_OUT">Stock Out (Deduct items from stock)</option>
                  <option value="TRANSFER">Transfer (Move between Warehouses)</option>
                  <option value="DAMAGE">Damage (Write-off broken stock)</option>
                  <option value="RETURN">Return (Log return from customer)</option>
                  <option value="RESERVE">Reserve (Hold stock for order)</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Quantity*</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                  required
                  className="w-full"
                />
              </div>

              {/* Transfers additional options */}
              {formData.type === 'TRANSFER' && (
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded border border-corporate-border">
                  <div className="space-y-1">
                    <label className="font-semibold text-corporate-muted block">Source Wh</label>
                    <select
                      value={formData.sourceWarehouseId}
                      onChange={(e) => setFormData({ ...formData, sourceWarehouseId: e.target.value })}
                      className="w-full bg-white"
                    >
                      <option value="">Current Wh</option>
                      {warehousesData?.warehouses?.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-corporate-muted block">Destination Wh*</label>
                    <select
                      value={formData.destWarehouseId}
                      onChange={(e) => setFormData({ ...formData, destWarehouseId: e.target.value })}
                      required
                      className="w-full bg-white"
                    >
                      <option value="">Select Wh</option>
                      {warehousesData?.warehouses?.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Reference */}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  className="w-full"
                  placeholder="e.g. INV-9988"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Remarks/Reason</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full"
                  placeholder="e.g. Audit variance adjust"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="py-1 px-3 border border-corporate-border rounded font-semibold">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded font-semibold hover:bg-brand-600 transition-colors">Apply Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
