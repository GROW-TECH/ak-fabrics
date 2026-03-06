import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, DollarSign, Eye, Edit, Trash2, TrendingUp, TrendingDown, Receipt, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  invoice_no: string;
  type: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'RETURN';
  customer_name?: string;
  total_amount: number;
  paid_amount: number;
  status: 'PAID' | 'NOT_PAID' | 'HALF_PAID';
  payment_mode: 'CASH' | 'CREDIT' | 'BANK' | 'UPI' | 'CHEQUE';
  created_at: string;
  notes?: string;
  balance_amount?: number;
}

interface FullLedgerProps {
  // Props can be added later if needed
}

const FullLedger: React.FC<FullLedgerProps> = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SALE' | 'PURCHASE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'NOT_PAID' | 'HALF_PAID'>('ALL');
  const [filterCustomer, setFilterCustomer] = useState<string>('ALL');
  const [filterVendor, setFilterVendor] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    console.log('Fetching sales and purchases data...');
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Fetch only sales and purchases
      const [salesRes, purchasesRes] = await Promise.all([
        fetch(`${API}/api/sales`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/api/purchases`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const allTransactions: Transaction[] = [];

      // Process sales
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        console.log('Sales data:', salesData);
        
        if (Array.isArray(salesData)) {
          salesData.forEach((sale: any) => {
            console.log('Processing sale:', sale);
            allTransactions.push({
              id: sale.id,
              invoice_no: sale.invoice_no,
              type: 'SALE',
              customer_name: sale.customer_name,
              total_amount: parseFloat(sale.total_amount),
              paid_amount: parseFloat(sale.paid_amount),
              status: sale.status,
              payment_mode: sale.payment_mode,
              created_at: sale.created_at,
              notes: sale.notes,
              balance_amount: parseFloat(sale.total_amount) - parseFloat(sale.paid_amount)
            });
          });
        } else {
          console.log('Sales data is not an array:', salesData);
        }
      } else {
        console.log('Sales API failed:', salesRes.status);
      }

      // Process purchases
      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json();
        console.log('Purchases data:', purchasesData);
        
        if (Array.isArray(purchasesData)) {
          purchasesData.forEach((purchase: any) => {
            console.log('Processing purchase:', purchase);
            allTransactions.push({
              id: purchase.id,
              invoice_no: purchase.invoice_no,
              type: 'PURCHASE',
              customer_name: purchase.vendor_name,
              total_amount: parseFloat(purchase.total_amount),
              paid_amount: parseFloat(purchase.paid_amount),
              status: purchase.payment_status,
              payment_mode: purchase.payment_mode,
              created_at: purchase.created_at,
              notes: purchase.notes,
              balance_amount: parseFloat(purchase.total_amount) - parseFloat(purchase.paid_amount)
            });
          });
        } else {
          console.log('Purchases data is not an array:', purchasesData);
        }
      } else {
        console.log('Purchases API failed:', purchasesRes.status);
      }

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Extract unique customers and vendors
      const uniqueCustomers = [...new Set(allTransactions
        .filter(t => t.type === 'SALE')
        .map(t => t.customer_name)
        .filter(Boolean)
      )];
      
      const uniqueVendors = [...new Set(allTransactions
        .filter(t => t.type === 'PURCHASE')
        .map(t => t.customer_name)
        .filter(Boolean)
      )];
      
      setCustomers(uniqueCustomers);
      setVendors(uniqueVendors);
      
      console.log('Loaded transactions:', allTransactions.length);
      console.log('Customers:', uniqueCustomers);
      console.log('Vendors:', uniqueVendors);
      setTransactions(allTransactions);

    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'PURCHASE': return <Package className="w-4 h-4 text-blue-600" />;
      default: return <Receipt className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SALE': return 'bg-green-50 text-green-700 border-green-200';
      case 'PURCHASE': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      NOT_PAID: 'bg-red-50 text-red-700 border-red-200',
      HALF_PAID: 'bg-amber-50 text-amber-700 border-amber-200'
    };
    return styles[status as keyof typeof styles] || '';
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.customer_name && transaction.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'ALL' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || transaction.status === filterStatus;
    
    // Separate customer and vendor filtering
    let matchesCustomerVendor = true;
    if (transaction.type === 'SALE' && filterCustomer !== 'ALL') {
      matchesCustomerVendor = transaction.customer_name === filterCustomer;
    } else if (transaction.type === 'PURCHASE' && filterVendor !== 'ALL') {
      matchesCustomerVendor = transaction.customer_name === filterVendor;
    }
    
    // Date range filtering
    let matchesDateRange = true;
    if (fromDate && toDate) {
      const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0];
      matchesDateRange = transactionDate >= fromDate && transactionDate <= toDate;
    } else if (fromDate) {
      const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0];
      matchesDateRange = transactionDate >= fromDate;
    } else if (toDate) {
      const transactionDate = new Date(transaction.created_at).toISOString().split('T')[0];
      matchesDateRange = transactionDate <= toDate;
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesCustomerVendor && matchesDateRange;
  });

  const handleView = (transaction: Transaction) => {
    // Navigate to appropriate view based on transaction type
    switch (transaction.type) {
      case 'SALE':
        navigate(`/sales-invoice/${transaction.id}`);
        break;
      case 'PURCHASE':
        navigate(`/purchase-invoice/${transaction.id}`);
        break;
      default:
        console.log('Unknown transaction type:', transaction.type);
    }
  };

  const totalSales = transactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.total_amount, 0);
  const totalPurchases = transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.total_amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)" }} />
        <div className="px-6 py-4 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg,#f8faff,#f1f5ff)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Full Ledger</h2>
              <p className="text-sm text-slate-500">Complete transaction history</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="text-lg font-bold text-slate-900">₹{totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Purchases</p>
              <p className="text-lg font-bold text-slate-900">₹{totalPurchases.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by invoice or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="SALE">Sales</option>
              <option value="PURCHASE">Purchases</option>
            </select>
            
            {/* Customer Filter - Show only when Sales is selected */}
            {filterType === 'SALE' && (
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Customers</option>
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            )}
            
            {/* Vendor Filter - Show only when Purchases is selected */}
            {filterType === 'PURCHASE' && (
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            )}
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="NOT_PAID">Not Paid</option>
              <option value="HALF_PAID">Half Paid</option>
            </select>
            
            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="date"
                  placeholder="From Date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-slate-500">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="date"
                  placeholder="To Date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)" }} />
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-500">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No transactions found</h3>
            <p className="text-slate-500 mb-4">No transactions match your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(transaction.type)}`}>
                          {transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{transaction.invoice_no}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {formatDate(transaction.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-slate-900">
                        <User className="w-3 h-3" />
                        {transaction.customer_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-medium text-slate-900">
                        <DollarSign className="w-3 h-3" />
                        ₹{transaction.total_amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                        <DollarSign className="w-3 h-3" />
                        ₹{transaction.paid_amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
                        <DollarSign className="w-3 h-3" />
                        ₹{(transaction.balance_amount || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(transaction.status)}`}>
                        {transaction.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullLedger;
