
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Printer, MessageCircle, Calendar } from 'lucide-react';
import { Account, Transaction, TransactionType } from '../types';

interface LedgerDetailsProps {
  accounts: Account[];
  transactions: Transaction[];
}

const LedgerDetails: React.FC<LedgerDetailsProps> = ({ accounts, transactions }) => {
  const { id } = useParams<{ id: string }>();
  const account = accounts.find(a => a.id === id);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  if (!account) return <div className="p-8">Account not found.</div>;

  const accountTransactions = transactions
    .filter(t => t.accountId === id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balances
  let currentBalance = 0; // Simplified for report start
  const reportEntries = accountTransactions.map(tx => {
    let debit = 0;
    let credit = 0;
    
    const isDr = [TransactionType.SALE, TransactionType.PAYMENT, TransactionType.PURCHASE_RETURN].includes(tx.type);
    if (isDr) {
      debit = tx.amount;
      currentBalance += debit;
    } else {
      credit = tx.amount;
      currentBalance -= credit;
    }
    
    return { ...tx, debit, credit, balance: currentBalance };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link to={account.type === 'CUSTOMER' ? '/customers' : '/vendors'} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
        </Link>
        <div className="flex space-x-2">
          <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all">
            <Printer className="w-4 h-4 mr-2" /> Print Ledger
          </button>
          <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm print:border-none print:shadow-none">
        <div className="flex justify-between border-b border-slate-100 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{account.name}</h1>
            <p className="text-slate-500 mt-1">{account.type} Statement</p>
            <div className="mt-4 space-y-1 text-sm">
              <p className="text-slate-600"><span className="font-bold text-slate-400">GSTIN:</span> {account.gstin || 'N/A'}</p>
              <p className="text-slate-600"><span className="font-bold text-slate-400">Address:</span> {account.address || 'N/A'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Balance</p>
            <h2 className={`text-4xl font-black ${account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{Math.abs(account.balance).toLocaleString()} {account.balance >= 0 ? 'Dr' : 'Cr'}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 print:hidden">
           <h3 className="font-bold text-slate-800">Date-wise Transaction Report</h3>
           <div className="flex space-x-2">
             <input type="date" className="p-2 border border-slate-200 rounded-lg text-xs" />
             <input type="date" className="p-2 border border-slate-200 rounded-lg text-xs" />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Particulars</th>
                <th className="px-6 py-4">Vch Type</th>
                <th className="px-6 py-4 text-right">Debit (Dr)</th>
                <th className="px-6 py-4 text-right">Credit (Cr)</th>
                <th className="px-6 py-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {reportEntries.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-4 text-slate-800">{tx.description}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">{tx.type}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600">{tx.debit > 0 ? `₹${tx.debit.toLocaleString()}` : ''}</td>
                  <td className="px-6 py-4 text-right text-rose-600">{tx.credit > 0 ? `₹${tx.credit.toLocaleString()}` : ''}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    ₹{Math.abs(tx.balance).toLocaleString()} {tx.balance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              ))}
              {reportEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No transactions recorded for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LedgerDetails;
