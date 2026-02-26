
import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Save, X, Hash } from 'lucide-react';
import { Transaction, TransactionType, Product, AccountType } from '../types';

interface StockJournalProps {
  type: TransactionType.STOCK_IN | TransactionType.STOCK_OUT;
  products: Product[];
  onAdd: (tx: Transaction) => void;
}

const StockJournal: React.FC<StockJournalProps> = ({ type, products, onAdd }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<{ productId: string, quantity: number, rollNo?: string }[]>([]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const tx: Transaction = {
      id: `sj-${Date.now()}`,
      date,
      type,
      accountId: 'acc-internal', // Synthetic internal account
      amount: 0,
      taxableAmount: 0,
      taxAmount: 0,
      description: description || `${isIn ? 'Production Stock In' : 'Stock Consumption/Loss'} Entry`,
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        rate: 0,
        total: 0,
        rollNo: i.rollNo
      }))
    };

    onAdd(tx);
    alert('Stock journal recorded successfully.');
    setItems([]);
    setDescription('');
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
          <h1 className={`text-3xl font-black tracking-tighter ${isIn ? 'text-emerald-900' : 'text-rose-900'}`}>
            {isIn ? 'Material Stock In' : 'Material Stock Out'}
          </h1>
          <p className="text-sm opacity-70 font-medium">Record internal inventory adjustments, production, or wastage.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjustment Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference / Batch No.</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input type="text" placeholder="e.g. BATCH-2024-001" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Entry Items</h3>
            <button type="button" onClick={addItem} className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center">
              <Plus className="w-3 h-3 mr-1" /> Add Fabric
            </button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <th className="px-6 py-4">Fabric / Item</th>
                <th className="px-4 py-4">Roll/Bolt No</th>
                <th className="px-4 py-4 text-right">Quantity</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30">
                  <td className="px-6 py-3">
                    <select 
                      required 
                      value={item.productId} 
                      onChange={e => updateItem(idx, 'productId', e.target.value)}
                      className="w-full p-2 bg-transparent border-b border-slate-200 focus:border-indigo-500 text-sm font-bold"
                    >
                      <option value="">-- Choose Fabric --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.designNo})</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={item.rollNo} onChange={e => updateItem(idx, 'rollNo', e.target.value)} className="w-full p-2 bg-transparent border-b border-slate-200 text-sm" placeholder="Roll #" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" required min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="w-24 p-2 bg-transparent border-b border-slate-200 text-sm text-right font-black" />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-300 italic text-sm">Add rows to record stock movement.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Reason / Narration</label>
          <textarea 
            rows={3} 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm" 
            placeholder="Describe why this stock is being adjusted (e.g. Received from dyeing, Waste due to damage...)" 
          />
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className={`px-12 py-4 rounded-2xl font-black shadow-xl transition-all transform active:scale-95 flex items-center ${
            isIn ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
          } text-white`}>
            <Save className="w-5 h-5 mr-3" /> Record {isIn ? 'Stock In' : 'Stock Out'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockJournal;
