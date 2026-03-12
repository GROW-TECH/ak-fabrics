import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Account, Transaction, AccountType } from '../types';

interface LedgerListProps {
  filterType: AccountType;
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (acc: Account) => void;
}

const LedgerList: React.FC<LedgerListProps> = ({
  filterType,
  accounts,
  transactions,
  onAddAccount
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    pincode: '',
    through: '',
    throughGstin: '',
    openingBalance: 0,
      mostBoughtGoods: ''

  });

  const filteredAccounts = useMemo(() => {
    console.log(accounts);
    return accounts
      .filter(a => a.type === filterType)
      .filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [accounts, filterType, search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      setEditingAccount(null);
      setIsAdding(true);
    }
  }, [location.search]);

  const clearAddQuery = () => {
    if (!location.search) return;
    const basePath = filterType === AccountType.CUSTOMER ? '/customers' : '/vendors';
    navigate(basePath, { replace: true });
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const payload = {
    id: editingAccount?.id || `acc-${Date.now()}`,
    name: formData.name,
    type: filterType, // CUSTOMER or VENDOR
    phone: formData.phone,
    address: formData.address,
    gstin: formData.gstin,
    pincode: formData.pincode,
    through: formData.through,
    throughGstin: formData.throughGstin,
    balance: formData.openingBalance,
    mostBoughtGoods: formData.mostBoughtGoods,
  };

  try {
    if (editingAccount) {
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/accounts/${editingAccount.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(payload)
        }
      );
    } else {
      await fetch(`${import.meta.env.VITE_API_URL}/api/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
    }

    clearAddQuery();
    window.location.reload();
  } catch (err) {
    console.error("Save failed", err);
  }
};

  const handleEdit = (acc: Account) => {
  setEditingAccount(acc);
  setIsAdding(true);

  setFormData({
    name: acc.name,
    phone: acc.phone || '',
    address: acc.address || '',
    gstin: acc.gstin || '',
    pincode: acc.pincode || '',
    through: acc.through || '',
    throughGstin: acc.throughGstin || '',
    openingBalance: acc.balance || 0
  });
};
const handleDelete = async (id: string) => {
  if (!window.confirm("Are you sure?")) return;

  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/accounts/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    window.location.reload(); // simple refresh
  } catch (err) {
    console.error("Delete failed", err);
  }
};
  const getLastPurchaseDate = (accountId: string) => {
    const tx = transactions
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return tx ? tx.date : '--';
  };

  const getMostBoughtItem = (accountId: string) => {
    const itemMap: Record<string, number> = {};

    transactions
      .filter(t => t.accountId === accountId && t.items)
      .forEach(t => {
        t.items?.forEach(item => {
          itemMap[item.name] = (itemMap[item.name] || 0) + item.quantity;
        });
      });

    const sorted = Object.entries(itemMap).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : '--';
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search customer name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-80 px-4 py-2 border rounded-xl text-sm"
        />

        <button
          onClick={() => { setEditingAccount(null); setIsAdding(true); }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
<thead className="bg-slate-100">
  <tr>
    <th className="p-3 text-left">S.No</th>
    <th className="p-3 text-left">Name</th>
    <th className="p-3 text-left">Phone</th>
    <th className="p-3 text-left">GST NO</th>
    <th className="p-3 text-left">Last Purchase</th>
    <th className="p-3 text-left">Most Bought</th>
    <th className="p-3 text-center">Actions</th>
  </tr>
</thead>
          <tbody>
  {filteredAccounts.map((acc, index) => (
    <tr key={acc.id} className="border-t hover:bg-slate-50">
      <td className="p-3">{index + 1}</td>

      <td
        className="p-3 font-semibold cursor-pointer"
        onClick={() => navigate(`/ledgers/${acc.id}`)}
      >
        {acc.name}
      </td>

      <td className="p-3">{acc.phone || "--"}</td>
      <td className="p-3">{acc.gstin || "--"}</td>

      <td className="p-3">{getLastPurchaseDate(acc.id)}</td>

      <td className="p-3">{getMostBoughtItem(acc.id)}</td>

      <td className="p-3 text-center space-x-2">
        <button
          onClick={() => handleEdit(acc)}
          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded"
        >
          Edit
        </button>

        <button
          onClick={() => handleDelete(acc.id)}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
        >
          Delete
        </button>
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>

      {/* Add Modal */}
    {isAdding && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)' }}>

    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Colored top bar */}
      <div className="h-1.5 w-full" style={{
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)'
      }} />

      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">
            {editingAccount ? 'Update Record' : 'New Entry'}
          </p>
          <h2 className="text-xl font-bold text-slate-800">
            {editingAccount ? 'Edit' : 'Add'} {filterType}
          </h2>
        </div>
        <button
          onClick={() => { setIsAdding(false); setEditingAccount(null); clearAddQuery(); }}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Body */}
      <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              placeholder="e.g. Ravi Kumar Textiles"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
            />
          </div>

          {/* GSTIN + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN</label>
              <input
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
              <input
                maxLength={10}
                placeholder="10-digit number"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
            <textarea
              rows={2}
              placeholder="Street, City..."
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition resize-none"
            />
          </div>

          {/* Pincode + Through */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pincode</label>
              <input
                maxLength={6}
                placeholder="636001"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Through</label>
              <input
                value={formData.through}
                onChange={e => setFormData({ ...formData, through: e.target.value })}
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Through GSTIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Through GSTIN</label>
            <input
              value={formData.throughGstin}
              onChange={e => setFormData({ ...formData, throughGstin: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
            />
          </div>

         

          {/* Divider */}
          <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingAccount(null); clearAddQuery(); }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {editingAccount ? 'Update' : 'Save'} {filterType}
            </button>
          </div>

        </form>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default LedgerList;
