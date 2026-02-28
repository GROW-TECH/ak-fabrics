import React, { useState, useMemo } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
          onClick={() => setIsAdding(true)}
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
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">

      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">
          {editingAccount ? "Edit" : "Add"} {filterType}
        </h2>
        <X
          className="cursor-pointer text-slate-500 hover:text-red-500"
          onClick={() => setIsAdding(false)}
        />
      </div>

      {/* Body */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">

          {/* Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-sm font-medium mb-1">GSTIN</label>
            <input
              maxLength={15}
              value={formData.gstin}
              onChange={e =>
                setFormData({
                  ...formData,
                  gstin: e.target.value.toUpperCase()
                })
              }
              className="w-full border border-slate-300 px-4 py-2 rounded-lg tracking-widest uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              maxLength={10}
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Pin Code */}
          <div>
            <label className="block text-sm font-medium mb-1">Pin Code</label>
            <input
              maxLength={6}
              value={formData.pincode}
              onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Through */}
          <div>
            <label className="block text-sm font-medium mb-1">Through</label>
            <input
              value={formData.through}
              onChange={e => setFormData({ ...formData, through: e.target.value })}
              className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Through GSTIN */}
          <div>
            <label className="block text-sm font-medium mb-1">Through GSTIN</label>
            <input
              value={formData.throughGstin}
              onChange={e => setFormData({ ...formData, throughGstin: e.target.value })}
              className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Address */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Most Bought Goods (Only Vendor) */}
          {filterType === AccountType.VENDOR && (
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Most Bought Goods
              </label>
              <input
                value={formData.mostBoughtGoods}
                onChange={e =>
                  setFormData({ ...formData, mostBoughtGoods: e.target.value })
                }
                className="w-full border border-slate-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save
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