
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Calendar, Receipt, FileText, X } from 'lucide-react';
import { Account, Product, Transaction, TransactionType, TransactionItem } from '../types';

interface VoucherEntryProps {
  accounts: Account[];
  products: Product[];
  onAdd: (tx: Transaction) => void;
  initialType?: TransactionType;
}

const VoucherEntry: React.FC<VoucherEntryProps> = ({ accounts, products, onAdd, initialType = TransactionType.SALE }) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [amount, setAmount] = useState(0);
  const [gstRate, setGstRate] = useState(5);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, rate: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: keyof TransactionItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
       const product = products.find(p => p.id === value);
       if (product) {
         item.rate = product.price;
         setGstRate(product.gstRate || 5);
       }
    }
    
    item.total = item.quantity * item.rate;
    newItems[index] = item;
    setItems(newItems);
    calculateTotals(newItems, gstRate);
  };

  const calculateTotals = (currentItems: TransactionItem[], currentGst: number) => {
    const taxable = currentItems.reduce((sum, i) => sum + i.total, 0);
    const tax = taxable * (currentGst / 100);
    setTaxableAmount(taxable);
    setTaxAmount(tax);
    setAmount(taxable + tax);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    calculateTotals(newItems, gstRate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || (items.length === 0 && amount === 0)) {
      alert('Please fill in all required fields.');
      return;
    }

    const isInventoryVoucher = [TransactionType.SALE, TransactionType.PURCHASE].includes(type);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date,
      type,
      accountId,
      amount: isInventoryVoucher ? amount : taxableAmount, // if payment, taxable is actually total
      taxableAmount: isInventoryVoucher ? taxableAmount : amount,
      taxAmount: isInventoryVoucher ? taxAmount : 0,
      gstRate: isInventoryVoucher ? gstRate : undefined,
      description,
      invoiceNo: type === TransactionType.SALE ? `AK/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}` : undefined,
      items: items.length > 0 ? items : undefined
    };

    onAdd(newTx);
    setItems([]);
    setAmount(0);
    setTaxableAmount(0);
    setTaxAmount(0);
    setDescription('');
    alert('Entry recorded and posted to ledger.');
  };

  const isInventoryVoucher = [
    TransactionType.SALE, 
    TransactionType.PURCHASE, 
    TransactionType.SALES_RETURN, 
    TransactionType.PURCHASE_RETURN
  ].includes(type);

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              {Object.values(TransactionType).map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Party/Ledger</label>
            <select 
              required
              value={accountId} 
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Choose Account --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20" 
            />
          </div>
        </div>

        {isInventoryVoucher && (
           <div className="flex items-center space-x-4 bg-indigo-50/50 p-4 rounded-2xl">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Tax Setup:</span>
              <div className="flex space-x-2">
                {[5, 12, 18, 28].map(rate => (
                  <button 
                    key={rate} 
                    type="button" 
                    onClick={() => { setGstRate(rate); calculateTotals(items, rate); }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${gstRate === rate ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    {rate}% GST
                  </button>
                ))}
              </div>
           </div>
        )}

        {isInventoryVoucher ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Itemized Breakdown</h4>
               <button 
                type="button" 
                onClick={handleAddItem}
                className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all flex items-center"
              >
                <Plus className="w-3 h-3 mr-2" /> Add Row
              </button>
            </div>
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-4 py-4">Quantity</th>
                    <th className="px-4 py-4">Rate (₹)</th>
                    <th className="px-4 py-4">Total</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {items.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <select 
                          required
                          value={item.productId}
                          onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                          className="w-full p-2 bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm font-medium"
                        >
                          <option value="">Select Item</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-20 p-2 bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                          className="w-24 p-2 bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm font-bold"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">
                        ₹{item.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Add some items to calculate GST Taxable value.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-2xl space-y-2">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment/Receipt Amount (₹)</label>
             <input 
               type="number"
               required
               value={amount}
               onChange={(e) => setAmount(Number(e.target.value))}
               className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-3xl font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
               placeholder="0.00"
             />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Narration / Internal Notes</label>
          <textarea 
            rows={2}
            placeholder="Additional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
           <div className="text-center sm:text-left space-y-1">
             <div className="flex space-x-4 text-[10px] font-bold text-slate-400 uppercase">
                {isInventoryVoucher && <span>Taxable: ₹{taxableAmount.toLocaleString()}</span>}
                {isInventoryVoucher && <span>Tax ({gstRate}%): ₹{taxAmount.toLocaleString()}</span>}
             </div>
             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Final Grand Total</p>
             <h2 className="text-4xl font-black text-slate-900">₹{amount.toLocaleString()}</h2>
           </div>
           <button 
             type="submit"
             className="w-full sm:w-auto flex items-center justify-center px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95"
           >
             <Save className="w-5 h-5 mr-3" /> Save & Post
           </button>
        </div>
      </form>
    </div>
  );
};

export default VoucherEntry;
