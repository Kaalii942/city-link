import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { Search } from 'lucide-react';

export default function Audit() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['audit-logs', search, page],
    queryFn: () => api.get('/api/audit', { search, page, limit })
  });

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-brand-900">System Audit Trail</h2>
        <p className="text-sm text-corporate-muted mt-1">Review centralized actions log, login registers, and inventory updates.</p>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-corporate-border rounded-lg p-4 shadow-dynamics grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-corporate-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search action, details, user..."
            className="w-full pl-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-corporate-bg text-corporate-muted text-[10px] font-bold uppercase tracking-wider border-b border-corporate-border">
              <th className="p-3 w-40">Timestamp</th>
              <th className="p-3 w-44">Action Flag</th>
              <th className="p-3">Details</th>
              <th className="p-3 w-32">User</th>
              <th className="p-3 w-36">IP Address</th>
              <th className="p-3 w-40">Machine Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corporate-border/30 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corporate-muted">Loading audit registries...</td>
              </tr>
            ) : data?.logs?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corporate-muted">No activity registers matches this query.</td>
              </tr>
            ) : (
              data?.logs?.map((l: any) => (
                <tr key={l.id} className="hover:bg-brand-50/20">
                  <td className="p-3 text-corporate-muted">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      l.action.includes('DELETE') ? 'bg-red-50 text-red-700 border border-red-200' :
                      l.action.includes('CREATE') ? 'bg-green-50 text-green-700 border border-green-200' :
                      l.action.includes('LOGIN') ? 'bg-brand-50 text-brand-700 border border-brand-200' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-corporate-text leading-relaxed">{l.details}</td>
                  <td className="p-3 font-semibold text-corporate-text">{l.user?.username || 'System'}</td>
                  <td className="p-3 font-mono text-corporate-muted">{l.ipAddress || '127.0.0.1'}</td>
                  <td className="p-3 font-mono text-corporate-muted truncate max-w-[120px]">{l.machineName || 'SERVER'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.total > limit && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-corporate-muted">Total: {data.total} records</span>
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
              disabled={page * limit >= data.total}
              className="py-1 px-3 border border-corporate-border bg-white rounded disabled:opacity-50 hover:bg-corporate-bg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
