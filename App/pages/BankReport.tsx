
import React, { useState } from 'react';
import { Landmark, Search, Printer, Plus, CreditCard, ChevronRight, ArrowDownLeft, ArrowUpRight, Building } from 'lucide-react';
import { Account, Transaction, AccountType, TransactionType } from '../types';
import { Link } from 'react-router-dom';

interface BankReportProps {
  accounts: Account[];
  transactions: Transaction[];
}

const BankReport: React.FC<BankReportProps> = ({ accounts, transactions }) => {
  const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);
  const [selectedBank, setSelectedBank] = useState<string | null>(bankAccounts[0]?.id || null);

  const activeBank = bankAccounts.find(b => b.id === selectedBank);
  const bankTransactions = transactions.filter(t => t.accountId === selectedBank)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banking Suite</h1>
          <p className="text-slate-500 text-sm">Comprehensive reports for multiple bank accounts and electronic transfers.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4 mr-2" /> Add Bank Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Worth (Banks)</p>
             <h2 className="text-2xl font-black text-slate-900">₹{totalBankBalance.toLocaleString()}</h2>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Registered Banks</p>
            {bankAccounts.map(bank => (
              <button 
                key={bank.id}
                onClick={() => setSelectedBank(bank.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  selectedBank === bank.id 
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between">
                   <div className="p-1.5 rounded-lg bg-white/20"><Building className="w-4 h-4" /></div>
                   <ChevronRight className="w-3 h-3 opacity-50" />
                </div>
                <p className="mt-3 font-bold text-sm truncate">{bank.name}</p>
                <p className={`text-[10px] font-bold mt-1 ${selectedBank === bank.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                  ₹{bank.balance.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          {activeBank ? (
            <>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{activeBank.name}</h3>
                  <div className="flex space-x-4 mt-2">
                    <span className="text-xs text-slate-500 font-medium">A/C No: <span className="font-bold">****5678</span></span>
                    <span className="text-xs text-slate-500 font-medium">IFSC: <span className="font-bold uppercase">HDFC0001234</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Balance</p>
                  <p className="text-3xl font-black text-indigo-600">₹{activeBank.balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Bank Statement</h3>
                   <div className="flex space-x-2">
                     <button onClick={() => window.print()} className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-500"><Printer className="w-4 h-4" /></button>
                     <Link to={`/ledgers/${activeBank.id}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-indigo-500 transition-colors">Detailed Ledger</Link>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                        <th className="px-6 py-4">Value Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4 text-right">Withdrawal (Cr)</th>
                        <th className="px-6 py-4 text-right">Deposit (Dr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bankTransactions.map((tx, idx) => {
                        const isDeposit = tx.type === TransactionType.RECEIPT || tx.type === TransactionType.SALE;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-xs text-slate-500">{tx.date}</td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold text-slate-800">{tx.description}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Type: {tx.type}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isDeposit && <span className="font-bold text-rose-600">₹{tx.amount.toLocaleString()}</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isDeposit && <span className="font-bold text-emerald-600">₹{tx.amount.toLocaleString()}</span>}
                            </td>
                          </tr>
                        )
                      })}
                      {bankTransactions.length === 0 && (
                        <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic text-sm">No digital movements found for this bank.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-20 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <Landmark className="w-16 h-16 opacity-10 mb-4" />
              <p>Select a bank from the list to view detailed reports.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankReport;
