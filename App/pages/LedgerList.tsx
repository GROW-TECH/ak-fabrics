
import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, MoreHorizontal, ExternalLink, X, Building2, UserCircle2, MapPin, FileText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Account, Transaction, AccountType } from '../types';

interface LedgerListProps {
  filterType: AccountType;
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (acc: Account) => void;
}

const LedgerList: React.FC<LedgerListProps> = ({ filterType, accounts, transactions, onAddAccount }) => {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    openingBalance: 0
  });

  const filteredAccounts = accounts.filter(a => a.type === filterType);
  const title = filterType === AccountType.CUSTOMER ? 'Customers' : 'Vendors';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      name: formData.name,
      type: filterType,
      balance: formData.openingBalance,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      gstin: formData.gstin
    };
    onAddAccount(newAccount);
    setIsAdding(false);
    setFormData({ name: '', email: '', phone: '', address: '', openingBalance: 0, gstin: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title} Directory</h1>
          <p className="text-slate-500 text-sm">Manage profile, GST details, and outstanding for all {title.toLowerCase()}.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Register New {filterType === AccountType.CUSTOMER ? 'Customer' : 'Vendor'}
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Register {filterType.toLowerCase()}</h3>
              <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Name</label>
                <div className="relative">
                   <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Royal Textiles Wholesale" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GSTIN Number</label>
                <input value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="24AAAAA0000A1Z5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="+91..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opening Bal (₹)</label>
                  <input type="number" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Opening amt" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label>
                <div className="relative">
                   <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                   <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Street name, City..." />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all mt-4">
                Register {filterType}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map(account => (
          <div key={account.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group border-b-4 border-b-transparent hover:border-b-indigo-500">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                filterType === AccountType.CUSTOMER ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-rose-50 border-rose-100 text-rose-500'
              }`}>
                {filterType === AccountType.CUSTOMER ? <Users className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 truncate mb-1">{account.name}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center mb-6">
              GSTIN: {account.gstin || 'UNREGISTERED'}
            </p>
            
            <div className="p-4 bg-slate-50 rounded-2xl mb-6">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Total Outstanding</p>
              <p className={`text-xl font-black ${account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{Math.abs(account.balance).toLocaleString()} {account.balance >= 0 ? 'Dr' : 'Cr'}
              </p>
            </div>

            <div className="space-y-4">
              <Link 
                to={`/ledgers/${account.id}`}
                className="w-full py-3 px-4 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center group/btn shadow-lg shadow-slate-900/10"
              >
                <FileText className="w-4 h-4 mr-2" /> View Detailed Statement
              </Link>
              <div className="flex items-center justify-center space-x-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> Call</span>
                <span className="flex items-center"><Mail className="w-3 h-3 mr-1" /> Email</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LedgerList;
