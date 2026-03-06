
import React from 'react';
import { Wallet, Search, History, ArrowDownLeft, ArrowUpRight, FileText, Printer } from 'lucide-react';
import { Account, Transaction, AccountType, TransactionType } from '../types';

interface CashReportProps {
  accounts: Account[];
  transactions: Transaction[];
}

const CashReport: React.FC<CashReportProps> = ({ accounts, transactions }) => {
  const cashAccounts = accounts.filter(a => a.type === AccountType.CASH);
  const totalCash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  
  const cashTransactions = transactions.filter(t => 
    cashAccounts.some(acc => acc.id === t.accountId)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cash in Hand Report</h1>
          <p className="text-slate-500 text-sm">Monitor physical cash liquid liquidity and petty cash flows.</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20">
          <Printer className="w-4 h-4 mr-2" /> Print Cash Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between">
           <div>
             <div className="p-3 bg-white/10 rounded-2xl w-fit mb-4"><Wallet className="w-8 h-8" /></div>
             <p className="text-xs font-bold uppercase tracking-widest opacity-70">Total Liquid Cash</p>
             <h2 className="text-4xl font-black mt-2">₹{totalCash.toLocaleString()}</h2>
           </div>
           <div className="mt-8 flex justify-between items-center opacity-80 text-xs">
             <span>FY 2024-25</span>
             <span className="font-bold">Verified</span>
           </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm md:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4">Cash Ledgers</h3>
          <div className="space-y-4">
            {cashAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-4 border border-slate-200 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{acc.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Main Cash Account</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900">₹{acc.balance.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Recent Cash Transactions</h3>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
             <input type="text" placeholder="Search cash..." className="pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px]" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Ref / Account</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Inflow (Dr)</th>
                <th className="px-6 py-4 text-right">Outflow (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cashTransactions.map((tx, idx) => {
                const isIn = tx.type === TransactionType.RECEIPT || tx.type === TransactionType.SALE;
                return (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500">{tx.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-800">#{tx.id.slice(-6).toUpperCase()}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{tx.type}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 truncate max-w-xs">{tx.description}</td>
                    <td className="px-6 py-4 text-right">
                      {isIn && <span className="font-bold text-emerald-600">₹{tx.amount.toLocaleString()}</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isIn && <span className="font-bold text-rose-600">₹{tx.amount.toLocaleString()}</span>}
                    </td>
                  </tr>
                )
              })}
              {cashTransactions.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-slate-300 italic text-sm">No cash movements found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashReport;
