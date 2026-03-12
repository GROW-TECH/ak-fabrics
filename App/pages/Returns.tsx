import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Plus, RotateCcw, Eye } from 'lucide-react';
import { Account } from '../types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SaleItem {
  product_id: string;
  product_name: string;
  sold_quantity: number;
  returned_quantity: number;
  available_quantity: number;
  rate: number;
  can_return: boolean;
  stock: number;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  total: number;
  return_reason: string;
  max_quantity: number;
}

interface SalesReturn {
  id: string;
  original_sale_id: string;
  customer_id: string;
  shop_id: string;
  return_reason: string;
  return_status: string;
  total_amount: string;
  refund_method: string;
  notes: string;
  created_at: string;
  original_invoice_no?: string;
  original_sale_date?: string;
  customer_name?: string;
}

const Returns: React.FC = () => {
  const [view, setView] = useState<'list' | 'form'>('list');

  // List state
  const [returnsList, setReturnsList] = useState<SalesReturn[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Form state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedSale, setSelectedSale] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>('CREDIT');
  const [notes, setNotes] = useState('');
  const [gstRate, setGstRate] = useState(5);
  const [availableSales, setAvailableSales] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<SaleItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    fetchReturnsList();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchAvailableSales(selectedAccount);
      setSelectedSale('');
      setAvailableItems([]);
      setReturnItems([]);
    } else {
      setAvailableSales([]);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (selectedSale) {
      fetchAvailableItems(selectedSale);
      setReturnItems([]);
    } else {
      setAvailableItems([]);
    }
  }, [selectedSale]);

  const fetchReturnsList = async () => {
    setLoadingList(true);
    try {
      const response = await fetch(`${API}/api/sales-returns`, { headers: authHeaders() });
      const data = await response.json();
      setReturnsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching returns list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API}/api/accounts?accountType=CUSTOMER`, { headers: authHeaders() });
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const fetchAvailableSales = async (customerId: string) => {
    try {
      const response = await fetch(`${API}/api/sales?customer_id=${customerId}`, { headers: authHeaders() });
      const data = await response.json();
      const allSales = Array.isArray(data) ? data : [];
      const filtered = allSales.filter((sale: any) => {
        const saleCustomer = String(sale.customer_id ?? sale.account_id ?? sale.party_id ?? '').trim();
        return saleCustomer === customerId.trim();
      });
      setAvailableSales(filtered);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setAvailableSales([]);
    }
  };

  const fetchAvailableItems = async (saleId: string) => {
    setFetchingItems(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/sales-returns/available-items/${saleId}`, { headers: authHeaders() });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch items');
        setAvailableItems([]);
        return;
      }
      const data = await response.json();
      setAvailableItems(Array.isArray(data) ? data.filter((i: SaleItem) => i.can_return) : []);
    } catch (err) {
      setError('Network error fetching items.');
      setAvailableItems([]);
    } finally {
      setFetchingItems(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return 'N/A'; }
  };

  const addReturnItem = (item: SaleItem) => {
    if (returnItems.find(ri => ri.product_id === item.product_id)) return;
    setReturnItems(prev => [...prev, {
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: 1,
      rate: item.rate,
      total: item.rate,
      return_reason: '',
      max_quantity: item.available_quantity,
    }]);
  };

  const updateReturnItem = (index: number, field: keyof ReturnItem, value: any) => {
    setReturnItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity') {
        const qty = Math.max(1, Math.min(Number(value) || 1, item.max_quantity));
        item.quantity = qty;
        item.total = qty * item.rate;
      }
      updated[index] = item;
      return updated;
    });
  };

  const removeReturnItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  const isItemAdded = (productId: string) => returnItems.some(ri => ri.product_id === productId);

  const calculateTotals = () => {
    const subtotal = returnItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (gstRate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnItems.length === 0) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API}/api/sales-returns`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          original_sale_id: selectedSale,
          customer_id: selectedAccount,
          items: returnItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            rate: item.rate,
            return_reason: item.return_reason || 'Customer return',
          })),
          return_reason: returnReason,
          refund_method: refundMethod,
          notes,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setSuccess('Return processed successfully! Stock has been updated.');
        handleReset();
        fetchReturnsList();
        setTimeout(() => setView('list'), 1500);
      } else {
        setError(result.error || 'Failed to process return');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedAccount('');
    setSelectedSale('');
    setReturnItems([]);
    setReturnReason('');
    setNotes('');
    setAvailableSales([]);
    setAvailableItems([]);
    setError('');
    setSuccess('');
    setGstRate(5);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PROCESSED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getRefundBadge = (method: string) => {
    const styles: Record<string, string> = {
      CREDIT: 'bg-blue-100 text-blue-800',
      CASH: 'bg-green-100 text-green-800',
      BANK: 'bg-purple-100 text-purple-800',
    };
    return styles[method] || 'bg-gray-100 text-gray-800';
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Returns</h1>
            <p className="text-gray-600 mt-1">View and manage all customer returns</p>
          </div>
          <button
            onClick={() => { handleReset(); setView('form'); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Return
          </button>
        </div>

        {loadingList ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Loading returns...</p>
          </div>
        ) : returnsList.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Returns Yet</h3>
            <p className="text-gray-500 mb-6">No sales returns have been processed.</p>
            <button
              onClick={() => { handleReset(); setView('form'); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mx-auto"
            >
              <Plus className="w-4 h-4" />
              Process First Return
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Refund</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returnsList.map((ret, index) => (
                    <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(ret.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-blue-700">
                          {ret.original_invoice_no || ret.original_sale_id?.slice(0, 8) + '...'}
                        </span>
                        {ret.original_sale_date && (
                          <p className="text-xs text-gray-400">{formatDate(ret.original_sale_date)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {ret.return_reason || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRefundBadge(ret.refund_method)}`}>
                          {ret.refund_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ₹{Number(ret.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(ret.return_status)}`}>
                          {ret.return_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₹{returnsList.reduce((sum, r) => sum + Number(r.total_amount || 0), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { handleReset(); setView('list'); }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Returns
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Sales Return</h1>
          <p className="text-gray-600 mt-0.5">Process a customer return and update inventory</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Choose Customer --</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Sale Invoice
                {selectedAccount && availableSales.length === 0 && (
                  <span className="ml-2 text-xs text-orange-500">(No invoices for this customer)</span>
                )}
              </label>
              <select value={selectedSale} onChange={(e) => setSelectedSale(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required disabled={!selectedAccount || availableSales.length === 0}>
                <option value="">-- Choose Sale --</option>
                {availableSales.map(sale => (
                  <option key={sale.id} value={sale.id}>
                    {sale.invoice_no} - {formatDate(sale.date || sale.created_at)} - ₹{Number(sale.total_amount).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund Method</label>
              <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="CREDIT">Credit to Account</option>
                <option value="CASH">Cash Refund</option>
                <option value="BANK">Bank Refund</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
              <input type="text" value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g., Defective product, Wrong item delivered"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Available Items */}
        {selectedSale && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Available Items for Return</h2>
            {fetchingItems ? (
              <p className="text-gray-500 text-sm">Loading items...</p>
            ) : availableItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No returnable items found for this sale.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableItems.map(item => {
                  const added = isItemAdded(item.product_id);
                  return (
                    <div key={item.product_id} className={`border rounded-lg p-4 transition-colors ${added ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Sold: <span className="font-medium">{item.sold_quantity}</span>
                            {item.returned_quantity > 0 && <span className="ml-2 text-orange-600">Returned: {item.returned_quantity}</span>}
                          </p>
                          <p className="text-sm text-gray-500">Available: <span className="font-semibold text-blue-700">{item.available_quantity}</span></p>
                          <p className="text-sm text-gray-500">Rate: ₹{Number(item.rate).toFixed(2)}</p>
                        </div>
                        <button type="button" onClick={() => addReturnItem(item)} disabled={added}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${added ? 'bg-green-200 text-green-800 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                          {added ? 'Added ✓' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Return Items */}
        {returnItems.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Items to Return</h2>
            <div className="space-y-3">
              {returnItems.map((item, index) => (
                <div key={item.product_id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                      <span className="text-xs text-gray-500">Max: {item.max_quantity}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qty <span className="text-red-500">*</span></label>
                        <input type="number" min="1" max={item.max_quantity} value={item.quantity}
                          onChange={(e) => updateReturnItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                        <input type="number" value={item.rate} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
                        <input type="text" value={`₹${item.total.toFixed(2)}`} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-medium" />
                      </div>
                    </div>
                    <input type="text" placeholder="Item return reason (optional)" value={item.return_reason}
                      onChange={(e) => updateReturnItem(index, 'return_reason', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-3" />
                  </div>
                  <button type="button" onClick={() => removeReturnItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax */}
        {returnItems.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Tax Setup</h2>
            <div className="flex flex-wrap gap-6">
              {[0, 5, 12, 18, 28].map(rate => (
                <label key={rate} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gstRate" value={rate} checked={gstRate === rate}
                    onChange={(e) => setGstRate(parseInt(e.target.value))} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">{rate === 0 ? 'No GST' : `${rate}% GST`}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {returnItems.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              {gstRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">GST ({gstRate}%):</span>
                  <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Refund:</span>
                <span className="text-blue-700">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Narration / Internal Notes</h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..." rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => { handleReset(); setView('list'); }}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            Cancel
          </button>
          <button type="submit" disabled={loading || returnItems.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium">
            {loading ? 'Processing...' : `Process Return (₹${total.toFixed(2)})`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Returns;