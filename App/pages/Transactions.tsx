
import React, { useState } from 'react';
import { Search, Plus, FileText, Calendar, Filter, X, Printer, MessageCircle, Share2, Download } from 'lucide-react';
import { Transaction, Account, TransactionType, Product } from '../types';
import VoucherEntry from './VoucherEntry';
import InvoiceModal from '../components/InvoiceModal';

interface TransactionsProps {
  typeFilter: TransactionType | 'RETURNS' | 'ALL';
  transactions: Transaction[];
  accounts: Account[];
  products: Product[];
  onAdd: (tx: Transaction) => void;
  title: string;
}

const Transactions: React.FC<TransactionsProps> = ({ typeFilter, transactions, accounts, products, onAdd, title }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null);

  const filtered = transactions.filter(t => {
    const matchesType = 
      typeFilter === 'ALL' ? true :
      typeFilter === 'RETURNS' ? (t.type === TransactionType.SALES_RETURN || t.type === TransactionType.PURCHASE_RETURN) :
      t.type === typeFilter;
      
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         accounts.find(a => a.id === t.accountId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getBadgeClass = (type: TransactionType) => {
    switch (type) {
      case TransactionType.SALE: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case TransactionType.PURCHASE: return 'bg-rose-50 text-rose-700 border-rose-100';
      case TransactionType.RECEIPT: return 'bg-blue-50 text-blue-700 border-blue-100';
      case TransactionType.PAYMENT: return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  if (isAdding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">New {title.slice(0, -1)} Entry</h2>
          <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <VoucherEntry 
          accounts={accounts} 
          products={products} 
          onAdd={(tx) => {
            onAdd(tx);
            setIsAdding(false);
          }} 
          initialType={typeFilter === 'RETURNS' ? TransactionType.SALES_RETURN : (typeFilter === 'ALL' ? TransactionType.SALE : typeFilter)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewingInvoice && (
        <InvoiceModal 
          transaction={viewingInvoice} 
          account={accounts.find(a => a.id === viewingInvoice.accountId)!} 
          products={products}
          onClose={() => setViewingInvoice(null)} 
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm">Review history or generate GST-compliant invoices.</p>
        </div>
        <div className="flex space-x-2">
           <button onClick={() => setIsAdding(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md">
             <Plus className="w-4 h-4 mr-2" /> New Voucher
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4 text-center w-16">View</th>
                <th className="px-6 py-4">Date / No.</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Party</th>
                <th className="px-6 py-4 text-right">Taxable</th>
                <th className="px-6 py-4 text-right">Tax</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(tx => {
                const account = accounts.find(a => a.id === tx.accountId);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setViewingInvoice(tx)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                        title="View Tax Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800">{tx.invoiceNo || `#${tx.id.slice(-6).toUpperCase()}`}</div>
                      <div className="text-xs text-slate-400">{tx.date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase border ${getBadgeClass(tx.type)}`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{account?.name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{account?.gstin}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-medium text-slate-500">₹{(tx.taxableAmount || tx.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-xs font-medium text-slate-500">₹{(tx.taxAmount || 0).toLocaleString()}</td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${
                      tx.type === TransactionType.SALE ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      ₹{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-slate-400 text-sm italic">No entries found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
