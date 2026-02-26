
import React, { useState } from 'react';
// Added missing icon imports from lucide-react to fix undefined component errors
import { Package, Search, Plus, X, Tag, IndianRupee, Layers, Palette, Hash, History, ArrowDownLeft, ArrowUpRight, FileText, Activity, MoreHorizontal, Eye, Image as ImageIcon } from 'lucide-react';
import { Product, Category, Transaction } from '../types';

interface InventoryProps {
  products: Product[];
  onAddProduct: (prod: Product) => void;
  categories: Category[];
  transactions: Transaction[];
}

const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, categories, transactions }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'Meters' as 'Meters' | 'Pcs' | 'Kg',
    price: 0,
    stock: 0,
    designNo: '',
    color: '',
    hsnCode: ''
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    categories.find(c => c.id === p.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.designNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  const renderHistory = (productId: string) => {
    const history = transactions.filter(t => t.items?.some(i => i.productId === productId));
    const product = products.find(p => p.id === productId);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Stock Movement History</h3>
              <p className="text-xs text-indigo-600 font-bold">{product?.name} ({product?.designNo || 'No Design No'})</p>
            </div>
            <button onClick={() => setViewingHistory(null)} className="p-1 hover:bg-slate-200 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="p-0 max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Quantity</th>
                  <th className="px-6 py-3">Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((h, i) => {
                  const item = h.items?.find(i => i.productId === productId);
                  const isIn = ['PURCHASE', 'RECEIPT', 'STOCK_IN', 'SALES_RETURN'].includes(h.type);
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-500">{h.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIn ? '+' : '-'}{item?.quantity}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">#{h.id.slice(-6)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {history.length === 0 && <div className="p-12 text-center text-slate-400 italic">No movements recorded yet.</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderImagePopup = (imageUrl: string) => {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setViewingImage(null)}>
        <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => setViewingImage(null)} 
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={imageUrl} 
            alt="Product Preview" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Textile Inventory Master</h1>
          <p className="text-slate-500 text-sm">Manage fabrics by Design No, Color, and Roll attributes.</p>
        </div>
      </div>

      {viewingHistory && renderHistory(viewingHistory)}
      {viewingImage && renderImagePopup(viewingImage)}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Name, Design No or Category..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20" 
            />
          </div>
          <div className="flex space-x-2">
             <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"><History className="w-4 h-4" /></button>
             <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"><FileText className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Fabric Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Design/Color</th>
                <th className="px-6 py-4 text-right">In Stock</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center mr-3 border border-indigo-100">
                        <Package className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase">{getCategoryName(p.categoryId)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-bold text-slate-700 flex items-center"><Hash className="w-3 h-3 mr-1 text-slate-300" /> {p.designNo || '-'}</span>
                      <span className="text-xs text-slate-400 flex items-center"><Palette className="w-3 h-3 mr-1 text-slate-300" /> {p.color || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`font-black text-sm ${p.stock < 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {p.stock.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 uppercase">Units</span>
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.images && p.images.length > 0 && (
                        <button 
                          onClick={() => setViewingImage(p.images[0])} 
                          className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-600" 
                          title="View Image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setViewingHistory(p.id)} className="p-2 hover:bg-indigo-50 rounded-xl text-indigo-600" title="Stock History">
                        <Activity className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
