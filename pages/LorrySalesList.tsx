import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, Truck, Eye, Edit, Trash2, Calendar, User, IndianRupee, Package } from "lucide-react";
import { Account, Product } from "../types";

interface LorrySalesProps {
  accounts: Account[];
  products: Product[];
  onAdd: (data: any) => void;
  onUpdate?: (data: any) => void;
  onDelete?: (id: string) => void;
}

interface LorrySale {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  paid_amount: number;
  status: 'NOT_PAID' | 'HALF_PAID' | 'PAID';
  payment_mode: 'CASH' | 'CREDIT' | 'BANK' | 'UPI' | 'CHEQUE';
  notes: string;
  through_agent: string;
  created_at: string;
  items?: any[];
}

const LorrySalesList: React.FC<LorrySalesProps> = ({ accounts, products, onAdd, onUpdate, onDelete }) => {
  console.log("LorrySalesList component mounted");
  console.log("Props received:", { accounts: accounts?.length, products: products?.length, onAdd: typeof onAdd, onUpdate: typeof onUpdate, onDelete: typeof onDelete });
  
  const navigate = useNavigate();
  const [sales, setSales] = useState<LorrySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchLorrySales();
  }, []);

  const fetchLorrySales = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log("Fetching lorry sales from:", `${API}/api/lorry-sales`);
      
      const response = await fetch(`${API}/api/lorry-sales`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched data:", data);
        // Handle the API response structure
        if (data.success && data.data) {
          setSales(Array.isArray(data.data) ? data.data : []);
        } else {
          setSales(Array.isArray(data) ? data : []);
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch lorry sales:", errorText);
        
        // Handle specific authentication errors
        if (response.status === 401 || errorText.includes("Access denied")) {
          setError("Authentication error: Please check your login status or contact administrator. The lorry sales API requires proper authentication.");
        } else if (response.status === 403) {
          setError("Permission denied: You don't have permission to access lorry sales data.");
        } else if (response.status === 404) {
          setError("Lorry sales endpoint not found. Please check if the backend API is properly configured.");
        } else {
          setError(`Failed to fetch lorry sales: ${response.status} ${response.statusText}`);
        }
        
        setSales([]);
      }
    } catch (error) {
      console.error("Error fetching lorry sales:", error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Add sample data for demonstration when API fails
      setSales([
        {
          id: "sample-1",
          invoice_no: "INV-001",
          invoice_date: "2024-01-15",
          customer_name: "John Doe",
          customer_phone: "9876543210",
          total_amount: 5000,
          paid_amount: 2000,
          status: "HALF_PAID",
          payment_mode: "CASH",
          notes: "Sample lorry sale - API not responding",
          through_agent: "Agent Smith",
          created_at: "2024-01-15T10:00:00Z"
        },
        {
          id: "sample-2", 
          invoice_no: "INV-002",
          invoice_date: "2024-01-16",
          customer_name: "Jane Smith",
          customer_phone: "9876543211",
          total_amount: 7500,
          paid_amount: 7500,
          status: "PAID",
          payment_mode: "BANK",
          notes: "Sample lorry sale - API not responding",
          through_agent: "Agent Johnson",
          created_at: "2024-01-16T11:30:00Z"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Don't return early on error - show sample data with error notification

  const filteredSales = (sales || []).filter(sale => {
    if (!sale) return false;
    
    const matchesSearch = (sale.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sale.invoice_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sale.customer_phone && sale.customer_phone.includes(searchQuery));
    
    const matchesStatus = !filterStatus || sale.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Debug logging
  console.log("Sales data:", sales);
  console.log("Filtered sales count:", filteredSales.length);
  console.log("Search query:", searchQuery);
  console.log("Filter status:", filterStatus);
  
  // Log first sale item to see data structure
  if (sales.length > 0) {
    console.log("First sale item:", sales[0]);
    console.log("Available fields:", Object.keys(sales[0]));
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'HALF_PAID': return 'bg-yellow-100 text-yellow-800';
      case 'NOT_PAID': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentModeColor = (mode: string) => {
    switch (mode) {
      case 'CASH': return 'bg-blue-100 text-blue-800';
      case 'CREDIT': return 'bg-purple-100 text-purple-800';
      case 'BANK': return 'bg-indigo-100 text-indigo-800';
      case 'UPI': return 'bg-green-100 text-green-800';
      case 'CHEQUE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    // Handle NaN, undefined, null, and non-numeric values
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
      return '₹0.00';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleViewInvoice = (id: string) => {
    navigate(`/lorry-sales-invoice/${id}`);
  };

  const handleEditSale = (id: string) => {
    navigate(`/lorry-sales/edit/${id}`);
  };

  const handleDeleteSale = (id: string) => {
    if (window.confirm('Are you sure you want to delete this lorry sale? This action cannot be undone.')) {
      if (onDelete) {
        onDelete(id);
      } else {
        console.log('Delete lorry sale:', id);
        alert('Delete functionality not available. Please check backend connection.');
      }
    }
  };

  const handleCreateNewSale = () => {
    navigate('/lorry-sales/create');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading lorry sales...</div>
        <div className="ml-4 text-xs text-slate-400">
          Debug: Loading state active
        </div>
      </div>
    );
  }

  console.log("About to render LorrySalesList");
  console.log("Sales array length:", (sales || []).length);
  console.log("Error state:", error);
  console.log("Filtered sales length:", filteredSales.length);
  
  // Debug: Log first sale data
  if (filteredSales.length > 0) {
    console.log("First sale data:", filteredSales[0]);
    console.log("First sale fields:", {
      lorry_number: filteredSales[0].lorry_number,
      paid_amount: filteredSales[0].paid_amount,
      items_count: filteredSales[0].items_count,
      total_amount: filteredSales[0].total_amount,
      status: filteredSales[0].status,
      payment_mode: filteredSales[0].payment_mode
    });
    
    // Debug: Check if values are being displayed correctly
    console.log("Display values for first sale:", {
      lorryDisplay: filteredSales[0].lorry_number || 'N/A',
      paidDisplay: filteredSales[0].paid_amount || 0,
      statusDisplay: filteredSales[0].status || 'NOT_PAID',
      paymentDisplay: filteredSales[0].payment_mode || 'CASH'
    });
  }

  try {
    return (
      <div className="space-y-6">
        {/* Summary Cards at the Top */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Sales</p>
                <p className="text-2xl font-bold text-slate-900">{(sales || []).length}</p>
              </div>
              <Truck className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency((sales || []).reduce((sum, sale) => {
                    const totalAmount = sale.total_amount || sale.totalAmount || sale.amount || 0;
                    return sum + Number(totalAmount);
                  }, 0))}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Paid Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency((sales || []).reduce((sum, sale) => {
                    const paidAmount = sale.paid_amount || sale.paidAmount || 0;
                    return sum + Number(paidAmount);
                  }, 0))}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Amount</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency((sales || []).reduce((sum, sale) => {
                    const totalAmount = sale.total_amount || sale.totalAmount || sale.amount || 0;
                    const paidAmount = sale.paid_amount || sale.paidAmount || 0;
                    return sum + (Number(totalAmount) - Number(paidAmount));
                  }, 0))}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 font-bold">!</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-amber-800">API Connection Issue</h3>
                <p className="mt-1 text-sm text-amber-700">{error}</p>
                <button
                  onClick={fetchLorrySales}
                  className="mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm hover:bg-amber-200 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Lorry Sales</h1>
            <p className="text-slate-500 text-sm">Manage your lorry sales invoices and payments</p>
          </div>
          <button
            onClick={handleCreateNewSale}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Lorry Sale
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, invoice number, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Status</option>
            <option value="PAID">Paid</option>
            <option value="HALF_PAID">Half Paid</option>
            <option value="NOT_PAID">Not Paid</option>
          </select>
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredSales.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No lorry sales found</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchQuery || filterStatus ? "Try adjusting your filters" : "Create your first lorry sale to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Lorry No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id || sale.invoice_no} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-slate-400 mr-2" />
                          <div>
                            <div className="font-medium text-slate-900">{sale.invoice_no || 'N/A'}</div>
                            {sale.through_agent && (
                              <div className="text-xs text-slate-500">Agent: {sale.through_agent}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{sale.customer_name || 'N/A'}</div>
                          {sale.customer_phone && (
                            <div className="text-xs text-slate-500">{sale.customer_phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(sale.invoice_date || sale.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sale.lorry_number || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-slate-400 mr-2" />
                          <div className="font-medium text-slate-900">
                            {sale.items_count || sale.total_qty || sale.totalQty || sale.items?.length || 0}
                          </div>
                          <div className="text-xs text-slate-500 ml-1">
                            items
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">
                          <div className="font-medium">{formatCurrency(sale.total_amount || sale.totalAmount || sale.amount || 0)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">
                          <div className="font-medium">{formatCurrency(sale.paid_amount || sale.paidAmount || 0)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status || 'NOT_PAID')}`}>
                          {(sale.status || 'NOT_PAID').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentModeColor(sale.payment_mode || 'CASH')}`}>
                          {sale.payment_mode || 'CASH'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewInvoice(sale.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditSale(sale.id)}
                            className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSale(sale.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
  } catch (renderError) {
    console.error("Render error in LorrySalesList:", renderError);
    console.error("Render error stack:", renderError.stack);
    return (
      <div className="space-y-6 p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-800">Rendering Error</h3>
          <p className="mt-2 text-sm text-red-700">
            {renderError instanceof Error ? renderError.message : 'Unknown rendering error'}
          </p>
          <div className="mt-4 p-4 bg-red-100 rounded">
            <p className="text-xs text-red-800 font-mono">
              Error: {renderError instanceof Error ? renderError.message : String(renderError)}
            </p>
            <p className="text-xs text-red-800 font-mono mt-2">
              Stack: {renderError instanceof Error ? renderError.stack : 'No stack available'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
        
        {/* Minimal test render */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Lorry Sales - Test Render</h2>
          <p className="text-slate-600 mt-2">This is a minimal test render to check if the component works.</p>
          <div className="mt-4">
            <p className="text-sm text-slate-500">Loading: {loading ? 'Yes' : 'No'}</p>
            <p className="text-sm text-slate-500">Error: {error ? 'Yes - ' + error : 'No'}</p>
            <p className="text-sm text-slate-500">Sales Count: {(sales || []).length}</p>
            <p className="text-sm text-slate-500">Filtered Count: {filteredSales.length}</p>
          </div>
        </div>
      </div>
    );
  }
};

export default LorrySalesList;
