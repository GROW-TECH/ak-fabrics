import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Search, Download, Package } from 'lucide-react';
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
  color_stock?: { color: string; qty: number }[];
}

interface ErodeSale {
  id: string;
  customer_id: string;
  customer_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  total_amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
  color_split?: { color: string; qty: number }[];
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
}

const ErodeSales: React.FC = () => {
  const [sales, setSales] = useState<ErodeSale[]>([]);
  const [products, setProducts] = useState<ErodeProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity: '',
    rate: '',
    payment_method: 'CASH',
    notes: '',
    color_split: [] as { color: string; qty: number }[]
  });
  const [formErrors, setFormErrors] = useState<any>({});

  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/sales?location=ERODE`, { headers: authHeaders() });
      if (!response.ok) { setSales([]); return; }
      const data = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching Erode sales:', error);
      setSales([]);
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

  const fetchCustomers = async () => {
    try {
      // Customers are stored as accounts with type CUSTOMER
      const response = await fetch(`${API}/api/accounts?type=CUSTOMER`, { headers: authHeaders() });
      if (!response.ok) { setCustomers([]); return; }
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const colorsRaw = product?.color_stock;
    const parsedColors = Array.isArray(colorsRaw)
      ? colorsRaw
      : (() => { try { return JSON.parse(colorsRaw || "[]"); } catch { return []; } })();
    
    setFormData({
      ...formData,
      product_id: productId,
      rate: product ? String(product.price) : formData.rate,
      color_split: parsedColors.map((c: any) => ({ color: c.color || c, qty: 0 }))
    });
  };

  const getColorName = (colorCode: string): string => {
    // If it's already a name (not a hex code), return as is
    if (!colorCode.startsWith('#')) return colorCode;
    
    // Common color mapping for hex codes
    const colorMap: { [key: string]: string } = {
      '#FF0000': 'Red',
      '#00FF00': 'Green', 
      '#0000FF': 'Blue',
      '#FFFF00': 'Yellow',
      '#FF00FF': 'Magenta',
      '#00FFFF': 'Cyan',
      '#FFA500': 'Orange',
      '#800080': 'Purple',
      '#FFC0CB': 'Pink',
      '#A52A2A': 'Brown',
      '#808080': 'Gray',
      '#000000': 'Black',
      '#FFFFFF': 'White',
      '#3b82f6': 'Blue',
      '#eaf73b': 'Yellow',
      '#ef4444': 'Red',
      '#10b981': 'Green',
      '#f59e0b': 'Orange',
      '#8b5cf6': 'Purple',
      '#ec4899': 'Pink',
      '#6b7280': 'Gray'
    };
    
    return colorMap[colorCode.toUpperCase()] || colorCode;
  };

  const handleColorQtyChange = (colorIndex: number, qty: number) => {
    const updated = [...formData.color_split];
    updated[colorIndex].qty = Math.max(0, qty);
    const totalQty = updated.reduce((sum, c) => sum + c.qty, 0);
    setFormData({
      ...formData,
      color_split: updated,
      quantity: String(totalQty)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: any = {};
    if (!formData.customer_id) errors.customer_id = 'Customer is required';
    if (!formData.product_id) errors.product_id = 'Product is required';
    if (!formData.quantity || Number(formData.quantity) <= 0) errors.quantity = 'Valid quantity is required';
    if (!formData.rate || Number(formData.rate) <= 0) errors.rate = 'Valid rate is required';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    try {
      const response = await fetch(`${API}/api/sales`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          rate: Number(formData.rate),
          total_amount: Number(formData.quantity) * Number(formData.rate),
          location: 'ERODE',
          color_split: formData.color_split
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ customer_id: '', product_id: '', quantity: '', rate: '', payment_method: 'CASH', notes: '', color_split: [] });
        setFormErrors({});
        fetchSales();
        fetchProducts();
      } else {
        const errorData = await response.json();
        setFormErrors({ general: errorData.error || 'Failed to create sale' });
      }
    } catch {
      setFormErrors({ general: 'Network error occurred' });
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchTerm ||
      (sale.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || new Date(sale.created_at).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
    const matchesCustomer = !customerFilter || sale.customer_id === customerFilter;
    return matchesSearch && matchesDate && matchesCustomer;
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredSales.map((p, index) => ({
      'S.No': index + 1,
      'Date': new Date(p.created_at).toLocaleDateString(),
      'Customer': p.customer_name || '—',
      'Product': p.product_name || '—',
      'Quantity': p.quantity || 0,
      'Rate': p.rate || 0,
      'Total': p.total_amount || 0,
      'Payment Method': p.payment_method || '—',
      'Notes': p.notes || '—'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Erode Sales');
    XLSX.writeFile(workbook, 'erode_sales_report.xlsx');
  };

  const fmt = (val: any) => Number(val || 0).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-600" />
              Erode Sales
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Manage sales from Erode branch location</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">{sales.length} Sales</span>
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
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Add Sale
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
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-slate-500">Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="w-14 h-14 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-1">No Sales Found</h3>
              <p className="text-slate-400 text-sm">No Erode sales recorded yet.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-5 py-4">S.No</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4 text-center">Qty</th>
                  <th className="px-5 py-4 text-right">Rate</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale, index) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 text-slate-600 text-sm">
                      {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{sale.customer_name || '—'}</td>
                    <td className="px-5 py-4 text-slate-700">{sale.product_name || '—'}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold">
                        {sale.quantity || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-800">₹{fmt(sale.rate)}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">₹{fmt(sale.total_amount)}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {sale.payment_method || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button 
                        onClick={() => window.open(`/erode-sales-invoice/${sale.id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Add Erode Sale
            </h2>

            {formErrors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.customer_id && <p className="text-red-500 text-xs mt-1">{formErrors.customer_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.erode_stock || 0})</option>
                  ))}
                </select>
                {formErrors.product_id && <p className="text-red-500 text-xs mt-1">{formErrors.product_id}</p>}
              </div>

              {/* Color Selection Section */}
              {formData.product_id && formData.color_split && formData.color_split.length > 0 && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-emerald-800">Color-wise Quantity</h4>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        Total: {formData.quantity || 0} pcs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {formData.color_split.map((colorItem, colorIndex) => (
                        <div key={colorIndex} className="bg-white rounded-lg p-2 border border-emerald-100">
                          <div className="flex items-center gap-2 mb-1">
                            {colorItem.color.startsWith('#') ? (
                              <>
                                <div 
                                  className="w-3 h-3 rounded border border-slate-300" 
                                  style={{ backgroundColor: colorItem.color }}
                                />
                                <label className="text-xs font-medium text-slate-600 block">
                                  {getColorName(colorItem.color)}
                                </label>
                              </>
                            ) : (
                              <label className="text-xs font-medium text-slate-600 block">
                                {colorItem.color}
                              </label>
                            )}
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={colorItem.qty}
                            onChange={(e) => handleColorQtyChange(colorIndex, Number(e.target.value))}
                            className="w-full border border-slate-200 bg-white px-2 py-1 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm font-medium text-slate-700"
                  placeholder="Auto-calculated from colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rate (₹)</label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter rate"
                  min="0"
                  step="0.01"
                />
                {formErrors.rate && <p className="text-red-500 text-xs mt-1">{formErrors.rate}</p>}
              </div>

              {/* Live Total Preview */}
              {formData.quantity && formData.rate && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                  <span className="text-emerald-700 font-medium">Total: </span>
                  <span className="text-emerald-800 font-bold">
                    ₹{(Number(formData.quantity) * Number(formData.rate)).toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
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
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm"
                >
                  Create Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErodeSales;