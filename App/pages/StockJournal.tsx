import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Save, Hash } from 'lucide-react';
import { TransactionType, Product } from '../types';

interface StockJournalProps {
  type: TransactionType.STOCK_IN | TransactionType.STOCK_OUT;
  products: Product[];
  refreshProducts: () => void;
}

const StockJournal: React.FC<StockJournalProps> = ({ type, products, refreshProducts }) => {

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<{ productId: string, quantity: number, rollNo?: string }[]>([]);

  const API = import.meta.env.VITE_API_URL;
  const isIn = type === TransactionType.STOCK_IN;

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, rollNo: '' }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    try {
      for (const item of items) {

        await fetch(`${API}/api/stock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            product_id: item.productId,
            type: isIn ? "PURCHASE" : "SALE",
            quantity: item.quantity,
            reference_id: `SJ-${Date.now()}`,
            note: description || (isIn ? "Stock In Entry" : "Stock Out Entry")
          })
        });

      }

      alert("Stock journal recorded successfully.");

      setItems([]);
      setDescription("");

      // 🔥 Refresh stock from backend
      refreshProducts();

    } catch (error) {
      console.error("Stock journal error:", error);
      alert("Failed to record stock.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      <div className={`p-8 rounded-3xl border flex items-center space-x-6 ${
        isIn ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
      }`}>
        <div className={`p-4 rounded-2xl ${isIn ? 'bg-emerald-500' : 'bg-rose-500'} text-white shadow-xl`}>
          {isIn ? <ArrowDownCircle className="w-10 h-10" /> : <ArrowUpCircle className="w-10 h-10" />}
        </div>
        <div>
          <h1 className={`text-3xl font-black ${isIn ? 'text-emerald-900' : 'text-rose-900'}`}>
            {isIn ? 'Material Stock In' : 'Material Stock Out'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Adjustment Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Reference</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Batch / Ref No" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm" 
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-500 uppercase">Entry Items</h3>
            <button type="button" onClick={addItem} className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold">
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase">
                <th className="px-6 py-4">Product</th>
                <th className="px-4 py-4">Roll No</th>
                <th className="px-4 py-4 text-right">Qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-3">
                    <select
                      required
                      value={item.productId}
                      onChange={e => updateItem(idx, 'productId', e.target.value)}
                      className="w-full border-b border-slate-200 text-sm font-bold"
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.designNo})
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.rollNo}
                      onChange={e => updateItem(idx, 'rollNo', e.target.value)}
                      className="w-full border-b border-slate-200 text-sm"
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-20 border-b border-slate-200 text-right font-black"
                    />
                  </td>

                  <td className="px-4">
                    <button type="button" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
            placeholder="Reason / Notes"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-10 py-4 rounded-2xl font-black text-white ${
              isIn ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <Save className="w-5 h-5 mr-2 inline" />
            Record {isIn ? "Stock In" : "Stock Out"}
          </button>
        </div>

      </form>
    </div>
  );
};

export default StockJournal;