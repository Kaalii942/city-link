import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import { Plus, Edit2, Trash2, X, Users, MapPin, Building, Activity } from 'lucide-react';

export default function Customers() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    departmentName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    projects: ''
  });

  const { data, isLoading } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: () => api.get('/api/customers')
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
    onError: (err: any) => alert(err.message)
  });

  const hasPerm = (perm: string) => {
    return user?.roles.includes('Super Admin') || user?.permissions.includes(perm);
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      departmentName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      projects: ''
    });
  };

  const handleEditClick = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      companyName: customer.companyName,
      departmentName: customer.departmentName || '',
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      projects: customer.projects || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete customer profile: ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Customer Directories</h2>
          <p className="text-sm text-corporate-muted mt-1">Manage Government departments, active projects, and procurement orders.</p>
        </div>
        {hasPerm('customer:write') && (
          <button
            onClick={() => { resetForm(); setEditingCustomer(null); setIsModalOpen(true); }}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-semibold shadow-dynamics transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Customer</span>
          </button>
        )}
      </div>

      {/* Grid of customer Cards */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-corporate-muted">Loading customer rosters...</div>
      ) : data?.customers?.length === 0 ? (
        <div className="text-center py-12 text-xs text-corporate-muted bg-white border border-corporate-border rounded-lg shadow-dynamics">
          No customers profiles registered. Click 'Register Customer' to map one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.customers.map((c: any) => (
            <div key={c.id} className="bg-white border border-corporate-border rounded-lg shadow-dynamics p-6 space-y-4 hover:shadow-card transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-brand-900 text-base">{c.companyName}</h3>
                  {c.departmentName && (
                    <p className="text-xs text-brand-600 font-semibold flex items-center space-x-1">
                      <Building className="w-3 h-3" />
                      <span>{c.departmentName}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-corporate-muted font-medium mt-1">Contact: {c.contactPerson}</p>
                </div>
                <div className="flex space-x-1">
                  {hasPerm('customer:write') && (
                    <button
                      onClick={() => handleEditClick(c)}
                      className="p-1 hover:bg-brand-100 text-brand-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {hasPerm('customer:delete') && (
                    <button
                      onClick={() => handleDelete(c.id, c.companyName)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact numbers */}
              <div className="text-xs space-y-1.5 py-3 border-t border-b border-corporate-border/30">
                <p><span className="font-bold text-corporate-muted">Email:</span> {c.email}</p>
                <p><span className="font-bold text-corporate-muted">Phone:</span> {c.phone}</p>
                <div className="flex items-start space-x-1 text-[10px] text-corporate-muted mt-1 leading-relaxed bg-corporate-bg p-2 rounded">
                  <MapPin className="w-3 h-3 text-corporate-muted flex-shrink-0 mt-0.5" />
                  <span>{c.address}</span>
                </div>
              </div>

              {/* Projects details */}
              {c.projects && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-corporate-muted uppercase flex items-center space-x-1">
                    <Activity className="w-3.5 h-3.5 text-brand-500" />
                    <span>Associated Projects</span>
                  </span>
                  <p className="text-xs text-corporate-text bg-blue-50/50 border border-blue-100/50 p-2.5 rounded whitespace-pre-line leading-relaxed font-semibold">
                    {c.projects}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* CREATION/EDIT MODAL */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-lg overflow-hidden flex flex-col text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingCustomer ? 'Edit Customer Settings' : 'Register Customer Details'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-brand-600 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Company/Dept Name*</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                    className="w-full"
                    placeholder="e.g. National Space Agency"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Sub Department (Optional)</label>
                  <input
                    type="text"
                    value={formData.departmentName}
                    onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                    className="w-full"
                    placeholder="e.g. Telemetry Instrumentation"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Contact Person*</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Email Address*</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-corporate-muted">Phone Number*</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Full Address*</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Projects Associated</label>
                <textarea
                  value={formData.projects}
                  onChange={(e) => setFormData({ ...formData, projects: e.target.value })}
                  placeholder="e.g. Satellite Telemetry upgrade. Target date: Q3 2026."
                  className="w-full h-24"
                />
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
