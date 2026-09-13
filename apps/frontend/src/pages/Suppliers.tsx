import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import { Plus, Edit2, Trash2, X, Landmark, Globe, Phone, Mail } from 'lucide-react';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    website: '',
    ntn: '',
    gst: '',
    bankDetails: {
      bankName: '',
      accountNo: '',
      iban: ''
    }
  });

  const { data, isLoading } = useQuery<any>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/api/suppliers')
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setEditingSupplier(null);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/suppliers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (err: any) => alert(err.message)
  });

  const hasPerm = (perm: string) => {
    return user?.roles.includes('Super Admin') || user?.permissions.includes(perm);
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      country: '',
      website: '',
      ntn: '',
      gst: '',
      bankDetails: {
        bankName: '',
        accountNo: '',
        iban: ''
      }
    });
  };

  const handleEditClick = (supplier: any) => {
    setEditingSupplier(supplier);
    
    let parsedBank = { bankName: '', accountNo: '', iban: '' };
    if (supplier.bankDetails) {
      try {
        parsedBank = JSON.parse(supplier.bankDetails);
      } catch (e) {
        console.error('Failed to parse bank details JSON', e);
      }
    }

    setFormData({
      companyName: supplier.companyName,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      country: supplier.country,
      website: supplier.website || '',
      ntn: supplier.ntn || '',
      gst: supplier.gst || '',
      bankDetails: parsedBank
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete supplier ${name}? This action is irreversible.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Suppliers Profiles</h2>
          <p className="text-sm text-corporate-muted mt-1">Manage vendor contact details, tax numbers, and bank specifications.</p>
        </div>
        {hasPerm('supplier:write') && (
          <button
            onClick={() => { resetForm(); setEditingSupplier(null); setIsModalOpen(true); }}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-semibold shadow-dynamics transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Supplier</span>
          </button>
        )}
      </div>

      {/* Grid of suppliers cards */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-corporate-muted">Loading vendor registries...</div>
      ) : data?.suppliers?.length === 0 ? (
        <div className="text-center py-12 text-xs text-corporate-muted bg-white border border-corporate-border rounded-lg shadow-dynamics">
          No suppliers registered inside database. Click 'Register Supplier' to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.suppliers.map((s: any) => {
            let bank = { bankName: '', accountNo: '', iban: '' };
            if (s.bankDetails) {
              try {
                bank = JSON.parse(s.bankDetails);
              } catch (e) {}
            }

            return (
              <div key={s.id} className="bg-white border border-corporate-border rounded-lg shadow-dynamics p-6 space-y-4 hover:shadow-card transition-shadow">
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-brand-900 text-base">{s.companyName}</h3>
                    <p className="text-xs text-corporate-muted font-medium">{s.contactName} (Rep)</p>
                  </div>
                  <div className="flex space-x-1">
                    {hasPerm('supplier:write') && (
                      <button
                        onClick={() => handleEditClick(s)}
                        className="p-1 hover:bg-brand-100 text-brand-600 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasPerm('supplier:delete') && (
                      <button
                        onClick={() => handleDelete(s.id, s.companyName)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contacts Block */}
                <div className="text-xs space-y-2 text-corporate-text border-t border-b border-corporate-border/30 py-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-corporate-muted" />
                    <span>{s.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-corporate-muted" />
                    <span>{s.phone}</span>
                  </div>
                  {s.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="w-3.5 h-3.5 text-corporate-muted" />
                      <a href={s.website} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">{s.website}</a>
                    </div>
                  )}
                  <p className="text-[10px] text-corporate-muted leading-relaxed mt-2 bg-corporate-bg p-2 rounded">
                    {s.address}, {s.country}
                  </p>
                </div>

                {/* Tax block */}
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-brand-50/50 p-2.5 rounded border border-brand-100/50">
                  <div>
                    <span className="font-semibold text-corporate-muted block uppercase">NTN</span>
                    <span className="font-mono font-bold text-corporate-text">{s.ntn || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-corporate-muted block uppercase">GST Registered</span>
                    <span className="font-mono font-bold text-corporate-text">{s.gst || 'N/A'}</span>
                  </div>
                </div>

                {/* Bank block */}
                {bank.bankName && (
                  <div className="text-[10px] space-y-1 bg-gray-50 border border-corporate-border/30 p-2.5 rounded">
                    <span className="font-semibold text-corporate-muted uppercase flex items-center space-x-1">
                      <Landmark className="w-3 h-3 text-brand-500" />
                      <span>Settlement Bank Details</span>
                    </span>
                    <p className="font-semibold text-corporate-text">{bank.bankName}</p>
                    <p className="font-mono text-corporate-muted">Acct: {bank.accountNo}</p>
                    {bank.iban && <p className="font-mono text-corporate-muted">IBAN: {bank.iban}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* CREATION/EDIT MODAL */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-lg overflow-hidden flex flex-col text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingSupplier ? 'Edit Vendor Settings' : 'Register Corporate Vendor'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-brand-600 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Company Name*</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Contact Person*</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Email address*</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Phone Number*</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Country*</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">National Tax Number (NTN)</label>
                  <input
                    type="text"
                    value={formData.ntn}
                    onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Sales Tax Number (GST)</label>
                  <input
                    type="text"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Company Address*</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              {/* Settlement Bank Details */}
              <div className="bg-gray-50 border border-corporate-border p-3.5 rounded space-y-3">
                <span className="font-bold text-brand-700 flex items-center space-x-1">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Clearing Bank Details</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-corporate-muted block">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankDetails.bankName}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                      })}
                      className="w-full bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-corporate-muted block">Account Number</label>
                    <input
                      type="text"
                      value={formData.bankDetails.accountNo}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountNo: e.target.value }
                      })}
                      className="w-full bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-corporate-muted block font-mono">IBAN</label>
                  <input
                    type="text"
                    value={formData.bankDetails.iban}
                    onChange={(e) => setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, iban: e.target.value }
                    })}
                    className="w-full bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="py-1 px-3 border border-corporate-border rounded font-semibold text-corporate-text">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded font-semibold transition-colors hover:bg-brand-600">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
