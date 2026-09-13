import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import {
  Users as UsersIcon,
  Plus,
  Search,
  UserCheck,
  UserX,
  Key,
  Shield,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Lock
} from 'lucide-react';

export default function Users() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRole, setSelectedRole] = useState('Operator');
  const [isActive, setIsActive] = useState(true);

  // Granular Permission State
  const [perms, setPerms] = useState<Record<string, boolean>>({
    'quotation:read': true,
    'quotation:write': true,
    'quotation:delete': false,
    'quotation:finance': false,
    'finance:read': false,
    'finance:write': false,
    'purchase:read': true,
    'purchase:write': true,
    'purchase:approve': false,
    'challan:read': true,
    'challan:write': true,
    'inventory:read': true,
    'inventory:write': true,
    'report:read': true,
    'report:finance': false
  });

  // Queries
  const { data: usersData, isLoading } = useQuery<any>({
    queryKey: ['users'],
    queryFn: () => api.get('/api/auth/users')
  });

  const { data: rolesData } = useQuery<any>({
    queryKey: ['roles'],
    queryFn: () => api.get('/api/auth/roles')
  });

  // Mutations
  const saveUserMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) {
        return api.put(`/api/auth/users/${editingUser.id}`, data);
      }
      return api.post('/api/auth/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => alert(err.message)
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/api/auth/users/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => alert(err.message)
  });

  const resetForm = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setSelectedRole('Operator');
    setIsActive(true);
    setPerms({
      'quotation:read': true,
      'quotation:write': true,
      'quotation:delete': false,
      'quotation:finance': false,
      'finance:read': false,
      'finance:write': false,
      'purchase:read': true,
      'purchase:write': true,
      'purchase:approve': false,
      'challan:read': true,
      'challan:write': true,
      'inventory:read': true,
      'inventory:write': true,
      'report:read': true,
      'report:finance': false
    });
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email);
    setPassword('');
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setIsActive(u.isActive);
    const primaryRole = u.userRoles?.[0]?.role?.name || 'Operator';
    setSelectedRole(primaryRole);

    // Map permissions
    const pMap: Record<string, boolean> = { ...perms };
    const userPerms = u.userRoles?.[0]?.role?.permissions?.map((rp: any) => rp.permission?.name) || [];
    Object.keys(pMap).forEach((k) => {
      pMap[k] = userPerms.includes(k);
    });
    setPerms(pMap);

    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRole = rolesData?.roles?.find((r: any) => r.name === selectedRole);
    const roleIds = targetRole ? [targetRole.id] : [];

    saveUserMutation.mutate({
      username,
      email,
      password: password || undefined,
      firstName,
      lastName,
      isActive,
      roleIds
    });
  };

  const filteredUsers = usersData?.users?.filter((u: any) => {
    const q = search.toLowerCase();
    return (
      !search ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Multi-User & Role Access Management</h2>
          <p className="text-sm text-corporate-muted mt-1">
            Super Admin Control Center: Create staff accounts, set granular module permissions, and manage account statuses.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold shadow-dynamics transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Staff Account</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-corporate-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff accounts by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>
      </div>

      {/* Users Grid Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3">Staff Identity</th>
              <th className="p-3">Username / Email</th>
              <th className="p-3">Assigned Role</th>
              <th className="p-3 text-center">Account Status</th>
              <th className="p-3">Created Date</th>
              <th className="p-3 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corporate-muted">
                  Loading user directory...
                </td>
              </tr>
            ) : filteredUsers?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corporate-muted">
                  No staff accounts found. Click "Create New Staff Account" to add operators.
                </td>
              </tr>
            ) : (
              filteredUsers?.map((u: any) => {
                const roleName = u.userRoles?.[0]?.role?.name || 'Operator';
                const isSA = roleName === 'Super Admin';

                return (
                  <tr key={u.id} className="hover:bg-brand-50/20">
                    <td className="p-3 font-semibold text-corporate-title">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="p-3 font-mono text-corporate-text">
                      <div className="font-bold text-brand-700">{u.username}</div>
                      <div className="text-[10px] text-corporate-muted">{u.email}</div>
                    </td>
                    <td className="p-3 font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          isSA ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {roleName}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                        disabled={isSA}
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        <span>{u.isActive ? 'ACTIVE' : 'DEACTIVATED'}</span>
                      </button>
                    </td>
                    <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-center space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 hover:bg-brand-100 text-brand-600 rounded inline-block"
                        title="Edit Account & Permissions"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!isSA && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete user account [${u.username}]?`)) {
                              deleteUserMutation.mutate(u.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded inline-block"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* USER MODAL: CREATE / EDIT STAFF ACCOUNT & PERMISSIONS */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
            <div className="bg-[#0F294A] p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <UsersIcon className="w-4 h-4 text-[#F97316]" />
                {editingUser ? `Edit Staff Account: ${editingUser.username}` : 'Create Staff Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Username*</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={!!editingUser}
                    placeholder="e.g. junaid_operator"
                    className="w-full p-1.5 border border-gray-300 rounded font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Email Address*</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="operator@citylink.com.pk"
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">First Name*</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Last Name*</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">
                    {editingUser ? 'Reset Password (Leave blank to keep unchanged)' : 'Account Password*'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    placeholder="••••••••"
                    className="w-full p-1.5 border border-gray-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">System Role*</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-1.5 font-bold border border-gray-300 rounded bg-white"
                  >
                    <option value="Super Admin">Super Admin (Full Unrestricted Access)</option>
                    <option value="Operator">Operator / Staff (Granular Access)</option>
                    <option value="Viewer">Viewer (Read-Only Operational Access)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Section */}
              {selectedRole !== 'Super Admin' && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-brand-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-brand-600" /> Granular Staff Access & Financial Protections
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Finance Protection Toggle */}
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded flex items-center justify-between col-span-2">
                      <div>
                        <span className="font-bold text-amber-900 block">Confidential Financial Access (Zone/Internet/Exchange Rates)</span>
                        <span className="text-[10px] text-amber-700">
                          Allows viewing Zone Price, Internet Price, Sales Bills, and Financial Analytics.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={perms['quotation:finance']}
                        onChange={(e) =>
                          setPerms({
                            ...perms,
                            'quotation:finance': e.target.checked,
                            'finance:read': e.target.checked,
                            'finance:write': e.target.checked,
                            'report:finance': e.target.checked
                          })
                        }
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                    </div>

                    <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={perms['quotation:read']}
                        onChange={(e) => setPerms({ ...perms, 'quotation:read': e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>View Commercial Quotations</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={perms['quotation:write']}
                        onChange={(e) => setPerms({ ...perms, 'quotation:write': e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>Create & Edit Quotations</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={perms['purchase:read']}
                        onChange={(e) => setPerms({ ...perms, 'purchase:read': e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>View Procurement & POs</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={perms['purchase:write']}
                        onChange={(e) => setPerms({ ...perms, 'purchase:write': e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>Create POs from Quotations</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={perms['challan:read']}
                        onChange={(e) => setPerms({ ...perms, 'challan:read': e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>View Delivery Challans</span>
                    </label>

                    <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={perms['challan:write']}
                        onChange={(e) => setPerms({ ...perms, 'challan:write': e.target.checked })}
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>Dispatch Delivery Challans</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-1.5 px-4 border border-gray-300 rounded font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveUserMutation.isPending}
                  className="py-1.5 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded font-bold"
                >
                  {saveUserMutation.isPending ? 'Saving User...' : 'Save User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
