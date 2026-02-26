import React from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, Wallet, Users, ArrowRight, DollarSign } from 'lucide-react';
import { Transaction, Account, TransactionType } from '../types';
import { Link } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts }) => {

  const totalSales = transactions
    .filter(t => t.type === TransactionType.SALE)
    .reduce((s, t) => s + t.amount, 0);

  const totalPurchase = transactions
    .filter(t => t.type === TransactionType.PURCHASE)
    .reduce((s, t) => s + t.amount, 0);

  const bankBalance = accounts
    .filter(a => a.type === 'BANK' || a.type === 'CASH')
    .reduce((s, a) => s + a.balance, 0);

  const debtors = accounts
    .filter(a => a.type === 'CUSTOMER' && a.balance > 0)
    .reduce((s, a) => s + a.balance, 0);

  const revenue = transactions
    .filter(t => t.type === TransactionType.SALE)
    .reduce((s, t) => s + t.taxableAmount, 0);

  const cogs = transactions
    .filter(t => t.type === TransactionType.PURCHASE)
    .reduce((s, t) => s + t.taxableAmount, 0);

  const profit = revenue - cogs;

  const stats = [
    { label: 'Total Sales', value: `₹${totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Bank & Cash', value: `₹${bankBalance.toLocaleString()}`, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Receivables', value: `₹${debtors.toLocaleString()}`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Gross Profit', value: `₹${profit.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const chartData = [
    { name: 'Week 1', sales: 4000, purchase: 2400 },
    { name: 'Week 2', sales: 3000, purchase: 1398 },
    { name: 'Week 3', sales: 2000, purchase: 9800 },
    { name: 'Week 4', sales: totalSales / 10, purchase: totalPurchase / 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Business Overview</h1>
          <p className="text-slate-500">Welcome back, AK Fabrics Management</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Quick Report
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-shadow shadow-md">
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                +12.5%
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Financial Trends</h3>
          <Link to="/report-profit" className="text-indigo-600 text-xs font-bold hover:underline flex items-center">
            Full P&L Report <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={0.1} />
              <Area type="monotone" dataKey="purchase" stroke="#cbd5e1" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;