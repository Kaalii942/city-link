import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import { Plus, X, Warehouse, FolderOpen, Layers, Grid } from 'lucide-react';

export default function Warehouses() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);

  // Expanded storage views mapping
  const [expandedWhId, setExpandedWhId] = useState<string | null>(null);

  // Modals state
  const [isWhOpen, setIsWhOpen] = useState(false);
  const [isSecOpen, setIsSecOpen] = useState(false);
  const [isRackOpen, setIsRackOpen] = useState(false);
  const [isShelfOpen, setIsShelfOpen] = useState(false);

  // Forms State
  const [whForm, setWhForm] = useState({ name: '', code: '', location: '' });
  const [secForm, setSecForm] = useState({ name: '', warehouseId: '' });
  const [rackForm, setRackForm] = useState({ name: '', sectionId: '' });
  const [shelfForm, setShelfForm] = useState({ name: '', rackId: '' });

  // Queries
  const { data: warehousesData, isLoading } = useQuery<any>({
    queryKey: ['warehouses-tree'],
    queryFn: () => api.get('/api/warehouses')
  });

  // Mutations
  const createWhMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-tree'] });
      setIsWhOpen(false);
      setWhForm({ name: '', code: '', location: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const createSecMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/warehouses/sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-tree'] });
      setIsSecOpen(false);
      setSecForm({ name: '', warehouseId: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const createRackMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/warehouses/racks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-tree'] });
      setIsRackOpen(false);
      setRackForm({ name: '', sectionId: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const createShelfMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/warehouses/shelves', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-tree'] });
      setIsShelfOpen(false);
      setShelfForm({ name: '', rackId: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const hasPerm = (perm: string) => {
    return user?.roles.includes('Super Admin') || user?.permissions.includes(perm);
  };

  const handleWhSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWhMutation.mutate(whForm);
  };

  const handleSecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSecMutation.mutate(secForm);
  };

  const handleRackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRackMutation.mutate(rackForm);
  };

  const handleShelfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShelfMutation.mutate(shelfForm);
  };

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Storage Layout Mapping</h2>
          <p className="text-sm text-corporate-muted mt-1">Configure hierarchical logistics spaces (Warehouse &rarr; Section &rarr; Rack &rarr; Shelf).</p>
        </div>
        {hasPerm('warehouse:write') && (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsWhOpen(true)}
              className="flex items-center space-x-1 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded font-semibold transition-colors"
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Add Warehouse</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-corporate-muted">Loading warehouse layout directories...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Warehouses list */}
          <div className="lg:col-span-1 space-y-4">
            <span className="font-bold text-corporate-muted uppercase text-[10px]">Registered Warehouses</span>
            
            {warehousesData?.warehouses?.length === 0 ? (
              <div className="bg-white border border-corporate-border rounded p-6 text-center text-corporate-muted">
                No storage locations mapped.
              </div>
            ) : (
              warehousesData?.warehouses?.map((w: any) => (
                <div
                  key={w.id}
                  onClick={() => setExpandedWhId(w.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors shadow-dynamics ${
                    expandedWhId === w.id
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-corporate-text border-corporate-border hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm truncate">{w.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      expandedWhId === w.id ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
                    }`}>
                      {w.code}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-2 leading-relaxed ${expandedWhId === w.id ? 'text-brand-100' : 'text-corporate-muted'}`}>
                    {w.location}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Hierarchical Tree details */}
          <div className="lg:col-span-2 bg-white border border-corporate-border rounded-lg shadow-dynamics p-6">
            {!expandedWhId ? (
              <div className="h-64 flex items-center justify-center text-corporate-muted border border-dashed border-corporate-border rounded">
                Choose a warehouse on the left to expand sections, racks, and shelves mappings.
              </div>
            ) : (
              (() => {
                const wh = warehousesData?.warehouses?.find((w: any) => w.id === expandedWhId);
                if (!wh) return null;

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-corporate-border/30 pb-3">
                      <div>
                        <h3 className="font-bold text-base text-brand-900">{wh.name} Hierarchy</h3>
                        <p className="text-[10px] text-corporate-muted">{wh.location}</p>
                      </div>
                      
                      {hasPerm('warehouse:write') && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => { setSecForm({ ...secForm, warehouseId: wh.id }); setIsSecOpen(true); }}
                            className="flex items-center space-x-1.5 py-1 px-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Section</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sections loop */}
                    <div className="space-y-4">
                      {wh.sections?.length === 0 ? (
                        <p className="text-xs text-corporate-muted">No sections configured inside this warehouse storage.</p>
                      ) : (
                        wh.sections.map((sec: any) => (
                          <div key={sec.id} className="border border-corporate-border/60 rounded p-4 space-y-3 bg-gray-50/50">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-brand-700 flex items-center space-x-1">
                                <FolderOpen className="w-4 h-4 text-brand-500" />
                                <span>{sec.name}</span>
                              </span>
                              {hasPerm('warehouse:write') && (
                                <button
                                  onClick={() => { setRackForm({ ...rackForm, sectionId: sec.id }); setIsRackOpen(true); }}
                                  className="text-[10px] text-brand-600 hover:underline font-semibold"
                                >
                                  + Add Rack
                                </button>
                              )}
                            </div>

                            {/* Racks loop */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                              {sec.racks?.length === 0 ? (
                                <span className="text-[10px] text-corporate-muted">No racks mapped.</span>
                              ) : (
                                sec.racks.map((r: any) => (
                                  <div key={r.id} className="bg-white border border-corporate-border rounded p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-corporate-text flex items-center space-x-1">
                                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                                        <span>{r.name}</span>
                                      </span>
                                      {hasPerm('warehouse:write') && (
                                        <button
                                          onClick={() => { setShelfForm({ ...shelfForm, rackId: r.id }); setIsShelfOpen(true); }}
                                          className="text-[9px] text-brand-600 hover:underline"
                                        >
                                          + Add Shelf
                                        </button>
                                      )}
                                    </div>

                                    {/* Shelves List */}
                                    <div className="flex flex-wrap gap-1.5 pl-2 pt-1 border-t border-corporate-border/20">
                                      {r.shelves?.length === 0 ? (
                                        <span className="text-[9px] text-corporate-muted">No shelves.</span>
                                      ) : (
                                        r.shelves.map((sh: any) => (
                                          <span
                                            key={sh.id}
                                            className="px-2 py-0.5 bg-gray-100 border border-corporate-border text-corporate-text rounded text-[9px] font-semibold flex items-center space-x-1"
                                          >
                                            <Grid className="w-2.5 h-2.5 text-gray-500" />
                                            <span>{sh.name}</span>
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* WAREHOUSE CREATE MODAL */}
      {/* ==================================================================== */}
      {isWhOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Register Storage Warehouse</h3>
              <button onClick={() => setIsWhOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleWhSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Warehouse Name*</label>
                <input
                  type="text"
                  value={whForm.name}
                  onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Warehouse Code*</label>
                <input
                  type="text"
                  value={whForm.code}
                  onChange={(e) => setWhForm({ ...whForm, code: e.target.value })}
                  required
                  className="w-full"
                  placeholder="e.g. WH-SOUTH"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Location / Description*</label>
                <input
                  type="text"
                  value={whForm.location}
                  onChange={(e) => setWhForm({ ...whForm, location: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsWhOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION CREATE MODAL */}
      {/* ==================================================================== */}
      {isSecOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Add Warehouse Section</h3>
              <button onClick={() => setIsSecOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSecSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Section Name*</label>
                <input
                  type="text"
                  value={secForm.name}
                  onChange={(e) => setSecForm({ ...secForm, name: e.target.value })}
                  required
                  className="w-full"
                  placeholder="e.g. Rack Hall B"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsSecOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* RACK CREATE MODAL */}
      {/* ==================================================================== */}
      {isRackOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Add Storage Rack</h3>
              <button onClick={() => setIsRackOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleRackSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Rack Name*</label>
                <input
                  type="text"
                  value={rackForm.name}
                  onChange={(e: any) => setRackForm({ ...rackForm, name: e.target.value })}
                  required
                  className="w-full"
                  placeholder="e.g. Rack 12"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsRackOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SHELF CREATE MODAL */}
      {/* ==================================================================== */}
      {isShelfOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Add Rack Shelf</h3>
              <button onClick={() => setIsShelfOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleShelfSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Shelf Name*</label>
                <input
                  type="text"
                  value={shelfForm.name}
                  onChange={(e: any) => setShelfForm({ ...shelfForm, name: e.target.value })}
                  required
                  className="w-full"
                  placeholder="e.g. Shelf A"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsShelfOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
