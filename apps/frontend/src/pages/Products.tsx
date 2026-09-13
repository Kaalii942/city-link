import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Layers,
  Sparkles,
  Barcode,
  CheckCircle,
  AlertCircle,
  X,
  Edit2
} from 'lucide-react';

export default function Products() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Selected row state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  
  // Brand Form State
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  // Import JSON Paste State
  const [importJson, setImportJson] = useState('');
  const [importMessage, setImportMessage] = useState('');

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    serialNumber: '',
    description: '',
    brandId: '',
    categoryId: '',
    supplierId: '',
    warehouseId: '',
    sectionId: '',
    rackId: '',
    shelfId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    unit: 'Pcs',
    quantity: 0,
    barcode: '',
    qrCode: '',
    status: 'ACTIVE',
    remarks: ''
  });

  // Queries
  const { data: productsData, isLoading } = useQuery<any>({
    queryKey: ['products', search, categoryId, brandId, status, lowStock, page],
    queryFn: () =>
      api.get('/api/products', {
        search,
        categoryId,
        brandId,
        status,
        lowStockOnly: lowStock,
        page,
        limit
      })
  });

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/products/categories/all')
  });

  const { data: brandsData } = useQuery<any>({
    queryKey: ['brands'],
    queryFn: () => api.get('/api/products/brands/all')
  });

  const { data: suppliersData } = useQuery<any>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/api/suppliers')
  });

  const { data: warehousesData } = useQuery<any>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/api/warehouses')
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsProductModalOpen(false);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsProductModalOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (err: any) => alert(err.message)
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/api/products/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedIds([]);
    },
    onError: (err: any) => alert(err.message)
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/products/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
    },
    onError: (err: any) => alert(err.message)
  });

  const createBrandMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/products/brands', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsBrandModalOpen(false);
      setNewBrandName('');
      setNewBrandDesc('');
    },
    onError: (err: any) => alert(err.message)
  });

  const importProductsMutation = useMutation({
    mutationFn: (rows: any[]) => api.post('/api/products/bulk-import', { rows }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImportMessage(`Import success! Mapped ${data.importedCount} products. Errors: ${data.errorCount}`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportJson('');
        setImportMessage('');
      }, 3000);
    },
    onError: (err: any) => alert(err.message)
  });

  const hasPerm = (perm: string) => {
    return user?.roles.includes('Super Admin') || user?.permissions.includes(perm);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      partNumber: '',
      serialNumber: '',
      description: '',
      brandId: '',
      categoryId: '',
      supplierId: '',
      warehouseId: '',
      sectionId: '',
      rackId: '',
      shelfId: '',
      purchasePrice: 0,
      sellingPrice: 0,
      unit: 'Pcs',
      quantity: 0,
      barcode: '',
      qrCode: '',
      status: 'ACTIVE',
      remarks: ''
    });
  };

  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      partNumber: product.partNumber,
      serialNumber: product.serialNumber || '',
      description: product.description || '',
      brandId: product.brandId || '',
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      warehouseId: product.warehouseId || '',
      sectionId: product.sectionId || '',
      rackId: product.rackId || '',
      shelfId: product.shelfId || '',
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      unit: product.unit || 'Pcs',
      quantity: product.quantity || 0,
      barcode: product.barcode || '',
      qrCode: product.qrCode || '',
      status: product.status || 'ACTIVE',
      remarks: product.remarks || ''
    });
    setIsProductModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!formData.name || !formData.partNumber) {
      alert('Product Name and Part Number are required');
      return;
    }

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && productsData?.products) {
      setSelectedIds(productsData.products.map((p: any) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleExportCSV = () => {
    if (!productsData?.products) return;
    const headers = ['Name', 'Part Number', 'Serial', 'Brand', 'Category', 'Quantity', 'Purchase Price', 'Selling Price', 'Status'];
    const rows = productsData.products.map((p: any) => [
      p.name,
      p.partNumber,
      p.serialNumber || '',
      p.brand?.name || '',
      p.category?.name || '',
      p.quantity,
      p.purchasePrice,
      p.sellingPrice,
      p.status
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.map((val: any) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'eipms_catalog_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array of product rows');
      }
      importProductsMutation.mutate(parsed);
    } catch (err: any) {
      alert(`Invalid JSON format: ${err.message}. Format should be: [{"name":"ESP32","partNumber":"ESP-01","purchasePrice":2.1,"sellingPrice":3.5,"quantity":100}]`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">Product Catalog</h2>
          <p className="text-sm text-corporate-muted mt-1">Manage standard electronic components list, categories, and brands.</p>
        </div>

        {/* Master toolbar */}
        <div className="flex space-x-2">
          {hasPerm('product:write') && (
            <button
              onClick={() => { resetForm(); setEditingProduct(null); setIsProductModalOpen(true); }}
              className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-semibold shadow-dynamics transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </button>
          )}

          {hasPerm('category:write') && (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-white border border-corporate-border hover:bg-corporate-bg text-corporate-text rounded text-xs font-semibold transition-colors"
            >
              <Layers className="w-4 h-4 text-brand-500" />
              <span>Category</span>
            </button>
          )}

          {hasPerm('brand:write') && (
            <button
              onClick={() => setIsBrandModalOpen(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-white border border-corporate-border hover:bg-corporate-bg text-corporate-text rounded text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Brand</span>
            </button>
          )}

          {hasPerm('product:import') && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-white border border-corporate-border hover:bg-corporate-bg text-corporate-text rounded text-xs font-semibold transition-colors"
            >
              <Upload className="w-4 h-4 text-brand-500" />
              <span>Import Paste</span>
            </button>
          )}

          {hasPerm('product:export') && (
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-white border border-corporate-border hover:bg-corporate-bg text-corporate-text rounded text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4 text-brand-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-corporate-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search parts, brands, barcodes..."
            className="w-full pl-9 py-1.5 text-xs"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="w-full py-1.5 text-xs"
        >
          <option value="">All Categories</option>
          {categoriesData?.categories?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Brand Filter */}
        <select
          value={brandId}
          onChange={(e) => { setBrandId(e.target.value); setPage(1); }}
          className="w-full py-1.5 text-xs"
        >
          <option value="">All Brands</option>
          {brandsData?.brands?.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-full py-1.5 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>

        {/* Low Stock Checkbox */}
        <label className="flex items-center space-x-2 text-xs font-semibold text-corporate-muted select-none cursor-pointer">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
            className="rounded border-corporate-border text-brand-500 focus:ring-brand-500"
          />
          <span>Critical Stock Only</span>
        </label>
      </div>

      {/* Bulk actions banner */}
      {selectedIds.length > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex justify-between items-center text-xs text-brand-700">
          <span className="font-semibold">{selectedIds.length} items selected in table</span>
          {hasPerm('product:delete') && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-1.5 py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete Selected</span>
            </button>
          )}
        </div>
      )}

      {/* Catalog Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  onChange={handleSelectAllChange}
                  checked={
                    productsData?.products?.length > 0 &&
                    selectedIds.length === productsData.products.length
                  }
                  className="rounded border-corporate-border"
                />
              </th>
              <th className="p-3">Product Detail</th>
              <th className="p-3">Part Number</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Cost Price</th>
              <th className="p-3 text-right">Sale Price</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-corporate-muted">
                  Loading catalog inventory...
                </td>
              </tr>
            ) : productsData?.products?.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-corporate-muted">
                  No products registered inside local warehouse database.
                </td>
              </tr>
            ) : (
              productsData?.products?.map((p: any) => (
                <tr key={p.id} className="hover:bg-brand-50/20">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => handleCheckboxChange(p.id)}
                      className="rounded border-corporate-border"
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-semibold text-corporate-text">{p.name}</p>
                      <p className="text-[10px] text-corporate-muted font-mono">{p.serialNumber || 'No Serial'}</p>
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-brand-700">{p.partNumber}</td>
                  <td className="p-3">{p.brand?.name || 'Generic'}</td>
                  <td className="p-3">{p.category?.name || 'General'}</td>
                  <td className={`p-3 text-right font-semibold ${p.quantity < 100 ? 'text-red-600 font-bold' : ''}`}>
                    {p.quantity} {p.unit}
                  </td>
                  <td className="p-3 text-right font-semibold">${Number(p.purchasePrice).toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">${Number(p.sellingPrice).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      p.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                    {hasPerm('product:write') && (
                      <button
                        onClick={() => handleEditClick(p)}
                        className="p-1 hover:bg-brand-100 text-brand-600 rounded inline-block"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasPerm('product:delete') && (
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded inline-block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {productsData?.total > limit && (
        <div className="flex justify-between items-center text-xs select-none">
          <span className="text-corporate-muted">Total: {productsData.total} products</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="py-1 px-3 border border-corporate-border bg-white rounded disabled:opacity-50 hover:bg-corporate-bg transition-colors"
            >
              Previous
            </button>
            <span className="py-1 px-3 bg-brand-50 border border-brand-200 rounded font-semibold text-brand-700">
              Page {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= productsData.total}
              className="py-1 px-3 border border-corporate-border bg-white rounded disabled:opacity-50 hover:bg-corporate-bg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PRODUCT CREATION/EDIT MODAL */}
      {/* ==================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingProduct ? 'Edit Catalog Product' : 'Register New Hardware Product'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="hover:bg-brand-600 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Product Name*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full"
                    placeholder="e.g. ESP32 Dev Board"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Part Number* (Unique)</label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    required
                    className="w-full"
                    placeholder="e.g. ESP32-WROOM-32D"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Serial Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Barcode (Optional)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Brand</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Generic</option>
                    {brandsData?.brands?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">General</option>
                    {categoriesData?.categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Purchase Cost ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Selling Price ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Default Warehouse</label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Select Storage</option>
                    {warehousesData?.warehouses?.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Unit of Measurement</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Default Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    disabled={!!editingProduct} // quantities adjusted via manual inventory logs or POs
                    className="w-full bg-gray-50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Product Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-16"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-corporate-border">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="py-1.5 px-4 bg-white border border-corporate-border rounded font-semibold text-corporate-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  className="py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded font-semibold transition-colors disabled:opacity-50"
                >
                  {editingProduct ? 'Save Changes' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY CREATION MODAL */}
      {/* ==================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Add Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCategoryMutation.mutate({ name: newCategoryName, description: newCategoryDesc });
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Category Name*</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Description</label>
                <textarea
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full h-16"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* BRAND CREATION MODAL */}
      {/* ==================================================================== */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-md overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Add Brand</h3>
              <button onClick={() => setIsBrandModalOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBrandMutation.mutate({ name: newBrandName, description: newBrandDesc });
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Brand Name*</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Description</label>
                <textarea
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="w-full h-16"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsBrandModalOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" className="py-1 px-3 bg-brand-500 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* IMPORT JSON PASTE MODAL */}
      {/* ==================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-corporate-border rounded-lg shadow-card w-full max-w-lg overflow-hidden text-xs">
            <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Paste Product Rows (JSON Format)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="hover:bg-brand-600 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handlePasteImport} className="p-6 space-y-4">
              {importMessage && (
                <div className="bg-blue-50 border border-blue-200 p-3 text-blue-700 rounded font-semibold">
                  {importMessage}
                </div>
              )}
              <div className="space-y-1">
                <label className="font-bold text-corporate-muted">Paste JSON Array of Objects</label>
                <p className="text-[10px] text-corporate-muted mb-2">{"Example: [{\"name\":\"ESP32 MCU\",\"partNumber\":\"ESP32-32D\",\"purchasePrice\":2.1,\"sellingPrice\":3.5,\"brandName\":\"Espressif\",\"categoryName\":\"Microcontrollers\"}]"}</p>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  required
                  placeholder="Paste JSON array here..."
                  className="w-full h-48 font-mono text-[10px]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-corporate-border">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="py-1 px-3 border border-corporate-border rounded">Cancel</button>
                <button type="submit" disabled={importProductsMutation.isPending} className="py-1 px-3 bg-brand-500 text-white rounded disabled:opacity-50">
                  {importProductsMutation.isPending ? 'Processing import...' : 'Execute Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
