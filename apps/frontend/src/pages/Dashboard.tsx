import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileClock,
  ExternalLink,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardData {
  metrics: {
    totalProducts: number;
    inventoryValue: number;
    totalValuePkr: number;
    dailyValuePkr: number;
    pendingAmountPkr: number;
    paidAmountPkr: number;
    financialStatusBreakdown: {
      paidCount: number;
      partialCount: number;
      pendingCount: number;
      overdueCount: number;
      paidAmountPkr: number;
      pendingAmountPkr: number;
    };
    lowStockCount: number;
  };
  lowStockProducts: any[];
  recentActivities: any[];
  topSuppliers: any[];
  stockFlow: any[];
  categoryDistribution: any[];
}

const COLORS = ['#0078d4', '#107c41', '#d83b01', '#8764b8', '#0078d4', '#e3008c'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboardData'],
    queryFn: () => api.get<DashboardData>('/api/reports/dashboard'),
    refetchInterval: 15000
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-brand-900">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white border border-corporate-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-6 text-red-700">
        <h3 className="font-bold">Error loading Dashboard</h3>
        <p>{(error as Error)?.message || 'Unable to connect to local Express server.'}</p>
      </div>
    );
  }

  const { metrics, lowStockProducts, recentActivities, stockFlow, categoryDistribution } = data;

  // Process stock flow chart data (aggregate by date)
  const chartDataMap: Record<string, { date: string; Incoming: number; Outgoing: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    chartDataMap[dateStr] = { date: dateStr, Incoming: 0, Outgoing: 0 };
  }

  stockFlow?.forEach((move: any) => {
    const dateStr = new Date(move.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (chartDataMap[dateStr]) {
      if (move.type === 'STOCK_IN' || move.type === 'RETURN') {
        chartDataMap[dateStr].Incoming += move.quantity;
      } else if (move.type === 'STOCK_OUT' || move.type === 'DAMAGE') {
        chartDataMap[dateStr].Outgoing += move.quantity;
      }
    }
  });

  const processedChartData = Object.values(chartDataMap);

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-900">
            CITY LINK (Engineering & Services) Financial Dashboard
          </h2>
          <p className="text-sm text-corporate-muted mt-1">
            Automated real-time financial evaluation, daily income activity, and receivables tracking in PKR.
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center space-x-2 py-1.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-bold shadow-dynamics transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
          <button
            onClick={() => navigate('/purchases')}
            className="flex items-center space-x-2 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create PO from Quote</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* FINANCIAL EVALUATION METRICS (PKR PRIMARY) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Value Evaluation */}
        <div className="bg-white border-2 border-brand-500 rounded-xl shadow-dynamics p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Total Value Evaluation</p>
            <p className="text-2xl font-black font-mono text-brand-950">
              Rs. {Number(metrics.totalValuePkr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-corporate-muted font-medium">System confirmed business value (PKR)</p>
          </div>
          <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center font-bold text-lg">
            Rs.
          </div>
        </div>

        {/* Metric 2: Daily Value / Income */}
        <div className="bg-white border border-corporate-border rounded-xl shadow-dynamics p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Daily Financial Activity</p>
            <p className="text-2xl font-bold font-mono text-purple-950">
              Rs. {Number(metrics.dailyValuePkr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-corporate-muted">Transactions logged today ({new Date().toLocaleDateString('en-GB')})</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Pending Amount / Outstanding Receivables */}
        <div className="bg-white border border-corporate-border rounded-xl shadow-dynamics p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Receivables</p>
            <p className="text-2xl font-bold font-mono text-amber-950">
              Rs. {Number(metrics.pendingAmountPkr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-corporate-muted">Unpaid & partial bill balances</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Revenue Collected / Paid Amount */}
        <div className="bg-white border border-corporate-border rounded-xl shadow-dynamics p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Collected Revenue</p>
            <p className="text-2xl font-bold font-mono text-emerald-950">
              Rs. {Number(metrics.paidAmountPkr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-corporate-muted">Fully cleared billing statements</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Financial Status Summary Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-50 rounded-lg text-brand-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-xs">Billing & Invoicing Status Overview</h4>
            <p className="text-[11px] text-gray-500">
              Real-time synchronization across Quotations, Sales Bills, and Payments.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-center px-3 py-1 bg-green-50 border border-green-200 rounded">
            <span className="text-[10px] text-green-700 font-bold uppercase block">Paid Invoices</span>
            <span className="font-mono font-bold text-green-950 text-sm">
              {metrics.financialStatusBreakdown?.paidCount || 0}
            </span>
          </div>
          <div className="text-center px-3 py-1 bg-yellow-50 border border-yellow-200 rounded">
            <span className="text-[10px] text-yellow-700 font-bold uppercase block">Partial Paid</span>
            <span className="font-mono font-bold text-yellow-950 text-sm">
              {metrics.financialStatusBreakdown?.partialCount || 0}
            </span>
          </div>
          <div className="text-center px-3 py-1 bg-blue-50 border border-blue-200 rounded">
            <span className="text-[10px] text-blue-700 font-bold uppercase block">Pending / Unpaid</span>
            <span className="font-mono font-bold text-blue-950 text-sm">
              {metrics.financialStatusBreakdown?.pendingCount || 0}
            </span>
          </div>
          {metrics.financialStatusBreakdown?.overdueCount > 0 && (
            <div className="text-center px-3 py-1 bg-red-50 border border-red-200 rounded animate-pulse">
              <span className="text-[10px] text-red-700 font-bold uppercase block">Overdue</span>
              <span className="font-mono font-bold text-red-950 text-sm">
                {metrics.financialStatusBreakdown?.overdueCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Flow Chart */}
        <div className="lg:col-span-2 bg-white border border-corporate-border rounded-xl shadow-dynamics p-6">
          <h3 className="text-xs font-bold text-corporate-text mb-4 uppercase tracking-wider">
            Inventory & Material Movements (Last 7 Days)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0078d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d83b01" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d83b01" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="Incoming" stroke="#0078d4" fillOpacity={1} fill="url(#colorIncoming)" strokeWidth={2} />
                <Area type="monotone" dataKey="Outgoing" stroke="#d83b01" fillOpacity={1} fill="url(#colorOutgoing)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Value Distribution Chart */}
        <div className="bg-white border border-corporate-border rounded-xl shadow-dynamics p-6 flex flex-col">
          <h3 className="text-xs font-bold text-corporate-text mb-4 uppercase tracking-wider">Valuation by Category</h3>
          <div className="h-56 flex-1 relative">
            {categoryDistribution?.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-corporate-muted">
                No inventory categories mapped.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rs. ${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            {categoryDistribution?.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-corporate-text truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lists Row: Alerts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white border border-corporate-border rounded-xl shadow-dynamics p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-corporate-text uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Critical Reorder List</span>
            </h3>
            <button
              onClick={() => navigate('/products')}
              className="text-xs text-brand-600 hover:underline flex items-center space-x-1 font-bold"
            >
              <span>Manage Catalog</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {lowStockProducts?.length === 0 ? (
              <div className="py-8 text-center text-xs text-corporate-muted border border-dashed border-corporate-border rounded">
                All inventory item quantities are above standard threshold limits.
              </div>
            ) : (
              lowStockProducts?.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded">
                  <div>
                    <p className="text-xs font-bold text-corporate-text">{p.name}</p>
                    <p className="text-[10px] text-corporate-muted font-mono">
                      {p.partNumber} &bull; {p.brand?.name || 'Generic'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-600">
                      {p.quantity} {p.unit}
                    </span>
                    <p className="text-[10px] text-corporate-muted">Threshold: 100</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log Activities */}
        <div className="bg-white border border-corporate-border rounded-xl shadow-dynamics p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-corporate-text uppercase tracking-wider flex items-center space-x-2">
              <FileClock className="w-4 h-4 text-brand-600" />
              <span>Real-Time System Audit Trail</span>
            </h3>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-brand-600 hover:underline flex items-center space-x-1 font-bold"
            >
              <span>Full History</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 divide-y divide-corporate-border/30 max-h-80 overflow-y-auto pr-1">
            {recentActivities?.length === 0 ? (
              <div className="py-8 text-center text-xs text-corporate-muted">No activity logs recorded.</div>
            ) : (
              recentActivities?.map((act) => (
                <div key={act.id} className="pt-3 first:pt-0 flex items-start justify-between text-xs">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase ${
                        act.action.includes('DELETE')
                          ? 'bg-red-100 text-red-700'
                          : act.action.includes('CREATE')
                          ? 'bg-green-100 text-green-700'
                          : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {act.action}
                    </span>
                    <p className="text-corporate-text font-medium leading-relaxed">{act.details}</p>
                  </div>
                  <div className="text-right text-[10px] text-corporate-muted whitespace-nowrap pl-4">
                    <p className="font-semibold">{act.user?.username || 'System'}</p>
                    <p>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
