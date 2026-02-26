
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Download, Printer } from 'lucide-react';
import { Transaction, TransactionType, Product } from '../types';

interface ProfitReportProps {
  transactions: Transaction[];
  products: Product[];
}

const ProfitReport: React.FC<ProfitReportProps> = ({ transactions, products }) => {
  const sales = transactions.filter(t => t.type === TransactionType.SALE);
  const purchases = transactions.filter(t => t.type === TransactionType.PURCHASE);
  
  const totalSalesVal = sales.reduce((sum, t) => sum + t.taxableAmount, 0);
  const totalPurchasesVal = purchases.reduce((sum, t) => sum + t.taxableAmount, 0);
  const grossProfit = totalSalesVal - totalPurchasesVal;
  
  // Expenses (synthetic for this demo based on returns or specific accounts if we had them)
  const expenses = transactions.filter(t => t.type === TransactionType.PAYMENT && !t.accountId.includes('acc')).reduce((sum, t) => sum + t.amount, 0);
  const netProfit = grossProfit - expenses;

  const chartData = [
    { name: 'Revenue', amount: totalSalesVal, fill: '#6366f1' },
    { name: 'Direct Cost', amount: totalPurchasesVal, fill: '#f43f5e' },
    { name: 'Operating Exp', amount: expenses, fill: '#f59e0b' },
    { name: 'Net Profit', amount: netProfit, fill: '#10b981' },
  ];

  const pieData = [
    { name: 'Profit', value: Math.max(0, netProfit), fill: '#10b981' },
    { name: 'Expenses', value: expenses, fill: '#f59e0b' },
    { name: 'COGS', value: totalPurchasesVal, fill: '#f43f5e' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profit & Loss Analysis</h1>
          <p className="text-slate-500 text-sm">Detailed report on revenue, cost of goods, and net margins.</p>
        </div>
        <div className="flex space-x-2 print:hidden">
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all">
            <Printer className="w-4 h-4 mr-2" /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</p>
          </div>
          <h2 className="text-2xl font-black text-slate-900">₹{totalSalesVal.toLocaleString()}</h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">Excludes GST components</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direct COGS</p>
          </div>
          <h2 className="text-2xl font-black text-slate-900">₹{totalPurchasesVal.toLocaleString()}</h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">Material acquisition cost</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-sm ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}><DollarSign className="w-5 h-5" /></div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Net Bottom Line</p>
          </div>
          <h2 className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₹{netProfit.toLocaleString()}
          </h2>
          <p className="text-xs opacity-60 mt-2 font-medium">After all direct/indirect expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-8 flex items-center">
            <BarChart className="w-4 h-4 mr-2 text-indigo-500" /> Revenue vs Costs
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <h3 className="font-bold text-slate-800 mb-4 self-start flex items-center">
            <PieIcon className="w-4 h-4 mr-2 text-indigo-500" /> Margin Breakdown
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
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
