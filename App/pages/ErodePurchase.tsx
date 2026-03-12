import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ErodeProduct {
  id: string;
  name: string;
  erode_stock: number;
  price: number;
  category_name?: string;
  sku?: string;
  images?: string[];
  isActive?: boolean;
}

interface ErodePurchase {
  id: string;
  vendor_id: string;
  vendor_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  total_amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

const ErodePurchase = () => {
  const [purchases, setPurchases] = useState<ErodePurchase[]>([]);
  const [products, setProducts] = useState<ErodeProduct[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: '',
    product_id: '',
    quantity: '',
    rate: '',
    payment_method: 'CASH',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<any>({});

  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchVendors();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/purchases?location=ERODE`, { headers: authHeaders() });
      if (!response.ok) { setPurchases([]); return; }
      const data = await response.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching Erode purchases:', error);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API}/api/products`, { headers: authHeaders() });
      if (!response.ok) { setProducts([]); return; }
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchVendors = async () => {
    try {
      // Vendors are stored as accounts with type VENDOR
      const response = await fetch(`${API}/api/accounts?type=VENDOR`, { headers: authHeaders() });
      if (!response.ok) { setVendors([]); return; }
      const data = await response.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: any = {};
    if (!formData.vendor_id) errors.vendor_id = 'Vendor is required';
    if (!formData.product_id) errors.product_id = 'Product is required';
    if (!formData.quantity || Number(formData.quantity) <= 0) errors.quantity = 'Valid quantity is required';
    if (!formData.rate || Number(formData.rate) <= 0) errors.rate = 'Valid rate is required';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    try {
      const response = await fetch(`${API}/api/purchases`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          rate: Number(formData.rate),
          total_amount: Number(formData.quantity) * Number(formData.rate),
          location: 'ERODE'
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ vendor_id: '', product_id: '', quantity: '', rate: '', payment_method: 'CASH', notes: '' });
        setFormErrors({});
        fetchPurchases();
        fetchProducts();
      } else {
        const errorData = await response.json();
        setFormErrors({ general: errorData.error || 'Failed to create purchase' });
      }
    } catch {
      setFormErrors({ general: 'Network error occurred' });
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = !searchTerm ||
      (purchase.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (purchase.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || new Date(purchase.created_at).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
    const matchesVendor = !vendorFilter || purchase.vendor_id === vendorFilter;
    return matchesSearch && matchesDate && matchesVendor;
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredPurchases.map((p, index) => ({
      'S.No': index + 1,
      'Date': new Date(p.created_at).toLocaleDateString(),
      'Vendor': p.vendor_name || '—',
      'Product': p.product_name || '—',
      'Quantity': p.quantity || 0,
      'Rate': p.rate || 0,
      'Total': p.total_amount || 0,
      'Payment Method': p.payment_method || '—',
      'Notes': p.notes || '—'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Erode Purchases');
    XLSX.writeFile(workbook, 'erode_purchases_report.xlsx');
  };

  const fmt = (val: any) => Number(val || 0).toLocaleString();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <ShoppingCart className="w-7 h-7 text-orange-600" />
              Erode Purchases
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Manage purchases from Erode branch location</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">{purchases.length} Purchases</span>
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">{products.length} Products</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          />
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Add Purchase
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
              <p className="text-slate-500">Loading purchases...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-14 h-14 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-1">No Purchases Found</h3>
              <p className="text-slate-400 text-sm">No Erode purchases recorded yet.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-5 py-4">S.No</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4 text-center">Qty</th>
                  <th className="px-5 py-4 text-right">Rate</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((purchase, index) => (
                  <tr key={purchase.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 text-slate-600 text-sm">
                      {purchase.created_at ? new Date(purchase.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{purchase.vendor_name || '—'}</td>
                    <td className="px-5 py-4 text-slate-700">{purchase.product_name || '—'}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold">
                        {purchase.quantity || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-800">₹{fmt(purchase.rate)}</td>
                    <td className="px-5 py-4 text-right font-bold text-orange-600">₹{fmt(purchase.total_amount)}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {purchase.payment_method || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-600" /> Add Erode Purchase
            </h2>

            {formErrors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                <select
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                {formErrors.vendor_id && <p className="text-red-500 text-xs mt-1">{formErrors.vendor_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setFormData({ ...formData, product_id: e.target.value, rate: product ? String(product.price) : formData.rate });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.erode_stock || 0})</option>
                  ))}
                </select>
                {formErrors.product_id && <p className="text-red-500 text-xs mt-1">{formErrors.product_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter quantity"
                  min="1"
                />
                {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rate (₹)</label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter rate"
                  min="0"
                  step="0.01"
                />
                {formErrors.rate && <p className="text-red-500 text-xs mt-1">{formErrors.rate}</p>}
              </div>

              {/* Live Total Preview */}
              {formData.quantity && formData.rate && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                  <span className="text-orange-700 font-medium">Total: </span>
                  <span className="text-orange-800 font-bold">
                    ₹{(Number(formData.quantity) * Number(formData.rate)).toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormErrors({}); }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold text-sm"
                >
                  Create Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErodePurchase;