import React, { useState, useEffect } from 'react';
import { Package, History } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Product {
  id: string;
  name: string;
  stock: number;
  erode_stock?: number;
  category?: string;
  category_name?: string;
  sku?: string;
  price?: number;
  isActive?: boolean;
  images?: string[];
}

interface StockTransfer {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  created_at: string;
  notes?: string;
}

const ErodeStocks: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transferHistory, setTransferHistory] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    console.log('Auth token from localStorage:', token ? 'exists' : 'missing');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    console.log('ErodeStocks component mounted');
    fetchProducts();
    fetchTransferHistory();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      console.log('Fetching products from:', `${API}/api/products`);
      const response = await fetch(`${API}/api/products`, {
        headers: authHeaders(),
      });
      
      if (!response.ok) {
        console.error('Failed to fetch products:', response.status, response.statusText);
        setProducts([]);
        return;
      }
      
      const data = await response.json();
      console.log('Products data received:', data);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferHistory = async () => {
    setTransferHistoryLoading(true);
    try {
      console.log('Fetching transfer history from:', `${API}/api/stock-transfers`);
      const response = await fetch(`${API}/api/stock-transfers`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        console.error('Failed to fetch transfer history:', response.status, response.statusText);
        setTransferHistory([]);
        return;
      }
      const data = await response.json();
      console.log('Transfer history data received:', data);
      setTransferHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching transfer history:', err);
      setTransferHistory([]);
    } finally {
      setTransferHistoryLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-7 h-7 text-indigo-600" />
              Erode Stock Management
            </h1>
            <p className="text-slate-600 mt-2">Monitor and transfer inventory between main location and Erode branch</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
              {products.length} Products
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
              {transferHistory.length} Transfers
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === 'current'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Current Stock
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              activeTab === 'history'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            Transfer History
          </button>
        </div>

        {/* Current Erode Stock Tab */}
        {activeTab === 'current' && (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-3 border-indigo-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Products Found</h3>
                <p className="text-slate-500">No products available in inventory.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wide">
                      <th className="px-6 py-4 text-left">S.No</th>
                      <th className="px-6 py-4 text-left">Product Name</th>
                      <th className="px-6 py-4 text-right">Erode Stock</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-left">Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product, index) => {
                      const image = product.images && product.images.length > 0 ? product.images[0] : null;
                      const erodeStock = product.erode_stock || 0;

                      return (
                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 font-medium">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            {product.sku && (
                              <div className="text-xs text-slate-500 mt-1">SKU: {product.sku}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-lg font-bold text-emerald-600">{erodeStock}</span>
                              <span className="text-xs text-slate-500">units</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {product.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {image ? (
                              <img
                                src={`${API}/uploads/products/${image}`}
                                alt={product.name}
                                className="w-14 h-14 object-cover rounded-xl border-2 border-slate-200"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center">
                                <Package className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Transfer History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            {transferHistoryLoading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-3 border-indigo-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading transfer history...</p>
              </div>
            ) : transferHistory.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Transfer History</h3>
                <p className="text-slate-500">No stock transfers have been recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wide">
                      <th className="px-6 py-4 text-left">S.No</th>
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Product</th>
                      <th className="px-6 py-4 text-center">Quantity</th>
                      <th className="px-6 py-4 text-left">From</th>
                      <th className="px-6 py-4 text-left">To</th>
                      <th className="px-6 py-4 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferHistory.map((transfer, index) => (
                      <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-600 font-medium">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-medium">
                              {new Date(transfer.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(transfer.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{transfer.product_name}</div>
                          <div className="text-xs text-slate-500 mt-1">ID: {transfer.product_id}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                            <span className="font-bold text-indigo-700">{transfer.quantity}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {transfer.from_location}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            {transfer.to_location}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {transfer.notes ? (
                              <span className="text-slate-600 text-sm">{transfer.notes}</span>
                            ) : (
                              <span className="text-slate-400 text-sm italic">No notes</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErodeStocks;