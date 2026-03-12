import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Printer } from 'lucide-react';
import { Transaction, TransactionType, Product } from '../types';

interface ProfitReportProps {
  transactions: Transaction[];
  products: Product[];
}

type ProfitLossResponse = {
  total_sales: number;
  total_purchase_cost: number;
  other_expenses: number;
  total_cogs: number;
  gross_profit: number;
  profit_margin: number;
  net_profit: number;
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const buildFallbackFromTransactions = (transactions: Transaction[]): ProfitLossResponse => {
  const sales = transactions.filter((t) => t.type === TransactionType.SALE);
  const purchases = transactions.filter((t) => t.type === TransactionType.PURCHASE);

  const totalSalesVal = sales.reduce((sum, t) => sum + (t.taxableAmount || 0), 0);
  const totalPurchasesVal = purchases.reduce((sum, t) => sum + (t.taxableAmount || 0), 0);
  const otherExpenses = 0; // legacy demo data has no POE
  const grossProfit = totalSalesVal - totalPurchasesVal;
  const netProfit = totalSalesVal - totalPurchasesVal - otherExpenses;

  return {
    total_sales: totalSalesVal,
    total_purchase_cost: totalPurchasesVal,
    other_expenses: otherExpenses,
    total_cogs: totalPurchasesVal,
    gross_profit: grossProfit,
    profit_margin: totalSalesVal > 0 ? (netProfit / totalSalesVal) * 100 : 0,
    net_profit: netProfit,
  };
};

const ProfitReport: React.FC<ProfitReportProps> = ({ transactions }) => {
  const fallbackData = useMemo(
    () => buildFallbackFromTransactions(transactions),
    [transactions]
  );

  const [stats, setStats] = useState<ProfitLossResponse>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const [startDate, setStartDate] = useState<string>(monthStart);
  const [endDate, setEndDate] = useState<string>(todayStr);

  useEffect(() => {
    const fetchProfitLoss = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (range !== 'custom') params.set('range', range);
        if (range === 'custom') {
          if (startDate) params.set('start_date', startDate);
          if (endDate) params.set('end_date', endDate);
        }
        const res = await fetch(`${API}/api/dashboard/profit-loss?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load profit & loss');
        }
        const data: ProfitLossResponse = await res.json();
        setStats(data);
      } catch (err: any) {
        console.error('Profit report load error:', err);
        setStats(fallbackData);
        setError(err?.message || 'Failed to load profit & loss');
      } finally {
        setLoading(false);
      }
    };

    fetchProfitLoss();
  }, [fallbackData, range, startDate, endDate]);

  const { total_sales, total_purchase_cost, other_expenses, gross_profit, profit_margin, net_profit } = stats;
  const netIsLoss = Number(net_profit) < 0;
  const netDisplay = formatINR(Math.abs(Number(net_profit) || 0));

  const chartData = [
    { name: 'Revenue', amount: total_sales, fill: '#6366f1' },
    { name: 'Product Cost', amount: total_purchase_cost, fill: '#f43f5e' },
    { name: 'Other Exp', amount: other_expenses, fill: '#f59e0b' },
    { name: 'Net Profit', amount: net_profit, fill: '#10b981' },
    { name: 'Gross Profit', amount: gross_profit, fill: '#22c55e' },
  ];

  const pieData = [
    { name: 'Profit', value: Math.max(0, net_profit), fill: '#10b981' },
    { name: 'Other Exp', value: other_expenses, fill: '#f59e0b' },
    { name: 'Product Cost', value: total_purchase_cost, fill: '#f43f5e' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profit & Loss Analysis</h1>
          <p className="text-slate-500 text-sm">Detailed report on revenue, cost of goods, and net margins.</p>
          {error && <p className="text-rose-500 text-xs mt-1 font-semibold">Showing snapshot – {error}</p>}
        </div>
        <div className="flex space-x-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Report
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 mr-2">Date range:</span>
        {(['today', 'week', 'month', 'custom'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
              range === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {r === 'today' && 'Today'}
            {r === 'week' && 'This Week'}
            {r === 'month' && 'This Month'}
            {r === 'custom' && 'Custom'}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <label className="flex items-center gap-1">
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
              />
            </label>
            <label className="flex items-center gap-1">
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
              />
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">Loading profit &amp; loss…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</p>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{formatINR(total_sales)}</h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Excludes GST components</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Cost</p>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{formatINR(total_purchase_cost)}</h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Material acquisition cost (incl. POE)</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Profit</p>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{formatINR(gross_profit)}</h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Revenue - COGS</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Other Expenses</p>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{formatINR(other_expenses)}</h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Additional costs (POE)</p>
          </div>

          <div
            className={`p-6 rounded-3xl border shadow-sm ${
              netIsLoss ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`p-2 rounded-lg ${
                  netIsLoss ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}
              >
                <DollarSign className="w-5 h-5" />
              </div>
              <p
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  netIsLoss ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                Net Bottom Line
              </p>
            </div>
            <h2 className={`text-2xl font-black ${netIsLoss ? 'text-rose-700' : 'text-emerald-700'}`}>
              {netIsLoss ? `${netDisplay} loss` : netDisplay}
            </h2>
            <p className="text-xs opacity-60 mt-2 font-medium">After all direct/indirect expenses</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-8 flex items-center">
            <BarChart className="w-4 h-4 mr-2 text-indigo-500" /> Revenue vs Costs
          </h3>
          <div className="h-72 w-full" style={{ minWidth: 320 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <h3 className="font-bold text-slate-800 mb-4 self-start flex items-center">
            <PieIcon className="w-4 h-4 mr-2 text-indigo-500" /> Margin Breakdown
          </h3>
          <div className="h-72 w-full" style={{ minWidth: 320 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex space-x-6 mt-4">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center text-xs font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.fill }}></div>
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitReport;
