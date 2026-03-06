import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Users,
  Package,
  ChevronRight,
  Menu,
  RotateCcw,
  CreditCard,
  Building2,
  Search,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Wallet,
  Landmark,
  FilePieChart,
  FileText,
  ScanLine,
  BookOpen,
  Truck,
  ChevronDown
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import LedgerList from './pages/LedgerList';
import LedgerDetails from './pages/LedgerDetails';
import Inventory from './pages/Inventory';
import CategoryMaster from './pages/CategoryMaster';
import SubCategoryMaster from './pages/SubCategoryMaster';
import ProductMaster from './pages/ProductMaster';
import StockJournal from './pages/StockJournal';
import ProfitReport from './pages/ProfitReport';
import CashReport from './pages/CashReport';
import BankReport from './pages/BankReport';
import { Account, Product, Transaction, TransactionType, AccountType, Category, SubCategory } from './types';
import { INITIAL_ACCOUNTS, INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, INITIAL_CATEGORIES } from './constants';
import PurchaseInvoicePage from "./components/PurchaseInvoiceModal";
import BarcodeScanner from "./components/BarcodeScanner";
import StockReport from "./pages/StockReport";
import StockHistory from "./pages/StockHistory";
import SalesInvoicePage from "./pages/Salesinvoicepage";
import Catalogue from "./pages/Catalogue";
import LorrySales from "./pages/LorrySales";
import LorrySalesList from "./pages/LorrySalesList";
import LorrySalesEdit from "./pages/LorrySalesEdit";
import LorrySaleInvoicePage from "./pages/LorrySaleInvoicePage";
import LorrySalesInvoiceWrapper from "./pages/LorrySalesInvoiceWrapper";
import FullLedger from "./pages/FullLedger";

// Add this route (after purchase-invoice route):
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) => {
  const location = useLocation();
  const [stockReportDropdown, setStockReportDropdown] = useState(false);

  const groups = [
    {
      title: 'General',
      links: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Accounting',
      links: [
        { to: '/sales', label: 'Sales ', icon: Receipt },
        { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
        { to: '/payments', label: 'Payments', icon: CreditCard },
        { to: '/returns', label: 'Returns', icon: RotateCcw },
        { to: '/lorry-sales', label: 'Lorry Sales', icon: Truck },
        { to: '/full-ledger', label: 'Full Ledger', icon: FileText },
      ]
    },
    {
      title: 'Inventory',
      links: [
        { to: '/products', label: 'Product Master', icon: Package },
        { to: '/categories', label: 'Categories Master', icon: Layers },
        { to: '/sub-categories', label: 'Sub-Categories Master', icon: Layers },
        { to: '/catalogue', label: 'Catalogue', icon: BookOpen },
      ]
    },
    {
      title: 'Reports',
      links: [
        { to: '/report-profit', label: 'Profit & Loss', icon: FilePieChart },
        { to: '/report-cash', label: 'Cash in Hand', icon: Wallet },
        { to: '/report-bank', label: 'Bank Reports', icon: Landmark },
      ]
    },
    {
      title: 'Entities',
      links: [
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/vendors', label: 'Vendors', icon: Building2 },
      ]
    }
  ];

  return (
    <>
      <div className={`fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={toggle}></div>
      <div className={`fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto transition duration-300 transform bg-slate-900 lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'}`}>
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center space-x-2 px-6">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AK</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Fabrics</span>
          </div>
        </div>

        <nav className="mt-10 px-4 space-y-8 pb-10">
          {groups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.title}</p>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      onClick={() => { if (window.innerWidth < 1024) toggle(); }}
                    >
                      <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'group-hover:text-white transition-colors'}`} />
                      <span className="font-medium text-sm">{link.label}</span>
                      {isActive && <ChevronRight className="ml-auto w-3 h-3" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Stock Report Dropdown */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory</p>
            <div className="space-y-1">
              <button
                onClick={() => setStockReportDropdown(!stockReportDropdown)}
                className={`w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  location.pathname === '/stock-report' || location.pathname === '/stock-history'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className={`w-4 h-4 mr-3 ${
                  location.pathname === '/stock-report' || location.pathname === '/stock-history'
                    ? 'text-white'
                    : 'group-hover:text-white transition-colors'
                }`} />
                <span className="font-medium text-sm">Stock Report</span>
                <ChevronDown className={`ml-auto w-3 h-3 transition-transform ${
                  stockReportDropdown ? 'rotate-180' : ''
                }`} />
              </button>
              
              {stockReportDropdown && (
                <div className="ml-4 space-y-1">
                  <Link
                    to="/stock-report"
                    className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 group ${
                      location.pathname === '/stock-report'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    onClick={() => { if (window.innerWidth < 1024) toggle(); }}
                  >
                    <span className="font-medium text-sm">Current Stock</span>
                    {location.pathname === '/stock-report' && <ChevronRight className="ml-auto w-3 h-3" />}
                  </Link>
                  <Link
                    to="/stock-history"
                    className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 group ${
                      location.pathname === '/stock-history'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    onClick={() => { if (window.innerWidth < 1024) toggle(); }}
                  >
                    <span className="font-medium text-sm">Stock History</span>
                    {location.pathname === '/stock-history' && <ChevronRight className="ml-auto w-3 h-3" />}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-slate-500 focus:outline-none lg:hidden mr-4">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input className="w-48 lg:w-80 pl-10 pr-4 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" type="text" placeholder="Search accounts, bills..." />
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-200">AK</div>
        <button 
          onClick={handleLogout}
          className="text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ✅ NEW: Scan Bill Page wrapper — renders scanner as a full page
const ScanBillPage: React.FC = () => {
  const navigate = React.useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center">
      <BarcodeScanner
        onClose={() => window.history.back()}
        onFound={(id: string) => {
          window.location.hash = `/purchase-invoice/${id}`;
        }}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]); 
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);


  const API = import.meta.env.VITE_API_URL;
  console.log("API URL:", API);
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`
  });
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchCategories();
      fetchSubCategories();
      fetchProducts();
      fetchAccounts();
    }
  }, [isAuthenticated, isLoading]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API}/api/accounts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || data);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API}/api/categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const response = await fetch(`${API}/api/subcategories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch sub-categories:", error);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    console.log("Local storage Token", token);

    try {
      const response = await fetch(`${API}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const addTransaction = async (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);

    if (newTx.items) {
      for (const item of newTx.items) {
        let stockType = "";

        if (newTx.type === TransactionType.PURCHASE)
          stockType = "PURCHASE";

        if (newTx.type === TransactionType.PURCHASE_RETURN)
          stockType = "RETURN";

        if (!stockType) continue;

        await fetch(`${API}/api/stock`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            product_id: item.productId,
            type: stockType,
            quantity: item.quantity,
            reference_id: newTx.id,
            note: newTx.description
          })
        });
      }

      await fetchProducts();
    }
  };

  const addLorrySale = async (lorrySaleData: any) => {
    try {
      const response = await fetch(`${API}/api/lorry-sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(lorrySaleData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Server error response:", error);
        alert(error.error || "Failed to create lorry sale");
        return;
      }

      const result = await response.json();
      alert("Lorry sale created successfully!");
      
      // Refresh data
      await fetchProducts();
      await fetchAccounts();
      
      return result.data;
    } catch (error) {
      console.error("Failed to create lorry sale:", error);
      alert("Failed to create lorry sale. Check console for details.");
    }
  };

  const updateLorrySale = async (lorrySaleData: any) => {
    try {
      const response = await fetch(`${API}/api/lorry-sales/${lorrySaleData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(lorrySaleData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Server error response:", error);
        alert(error.error || "Failed to update lorry sale");
        return;
      }

      const result = await response.json();
      alert("Lorry sale updated successfully!");
      
      // Refresh data
      await fetchProducts();
      await fetchAccounts();
      
      return result.data;
    } catch (error) {
      console.error("Failed to update lorry sale:", error);
      alert("Failed to update lorry sale. Check console for details.");
    }
  };

  const deleteLorrySale = async (id: string) => {
    try {
      const response = await fetch(`${API}/api/lorry-sales/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("Server error response:", error);
        alert(error.error || "Failed to delete lorry sale");
        return;
      }

      alert("Lorry sale deleted successfully!");
      
      // Refresh data
      await fetchProducts();
      await fetchAccounts();
      
      return true;
    } catch (error) {
      console.error("Failed to delete lorry sale:", error);
      alert("Failed to delete lorry sale. Check console for details.");
    }
  };

  const addAccount = async (acc: Account) => {
    try {
      const response = await fetch(`${API}/api/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(acc)
      });

      if (response.ok) {
        await fetchAccounts();
      }
    } catch (error) {
      console.error("Failed to add account:", error);
    }
  };

  const addCategory = async (form: FormData) => {
    try {
      const response = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: form
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(prev => [...prev, data]);
      }
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  };

  const updateCategory = async (id: string, form: FormData) => {
    try {
      const response = await fetch(`${API}/api/categories/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: form
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(prev =>
          prev.map(cat => (cat.id === data.id ? data : cat))
        );
      }
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`${API}/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const addSubCategory = async (form: FormData) => {
    try {
      const response = await fetch(`${API}/api/subcategories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: form
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.log("SERVER ERROR:", err);
        alert(err.error || "Failed to create sub-category");
        return;
      }

      const data = await response.json();
      setSubCategories(prev => [...prev, data]);

    } catch (error) {
      console.error("Failed to add sub-category:", error);
    }
  };

  const updateSubCategory = async (id: string, form: FormData) => {
    try {
      const response = await fetch(`${API}/api/subcategories/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: form
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to update sub-category");
        return;
      }

      const data = await response.json();
      setSubCategories(prev =>
        prev.map(sub => sub.id === data.id ? data : sub)
      );

    } catch (error) {
      console.error("Failed to update sub-category:", error);
    }
  };

  const deleteSubCategory = async (id: string) => {
    try {
      const response = await fetch(`${API}/api/subcategories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        setSubCategories(prev => prev.filter(sub => sub.id !== id));
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to delete sub-category: ${errorData.error || response.statusText}`);
      }

    } catch (error) {
      console.error("Failed to delete sub-category:", error);
      alert("Failed to delete sub-category. Check console for details.");
    }
  };

  const addProduct = async (form: FormData) => {
    const token = localStorage.getItem("token");
    console.log("Sending token:", localStorage.getItem("token"));

    try {
      const response = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(prev => [...prev, data]);
        alert("Product added successfully!");
      } else {
        // Handle non-JSON responses (like 404 HTML pages)
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to add product: ${response.status} ${response.statusText}`;
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = `Failed to add product: ${errorData.message || response.statusText}`;
          } catch (jsonError) {
            console.error("Failed to parse error JSON:", jsonError);
          }
        } else {
          // Handle HTML responses (like 404 pages)
          const text = await response.text();
          console.error("Server returned non-JSON response:", text);
          if (response.status === 404) {
            errorMessage = "Product endpoint not found. Please check the server configuration.";
          }
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product. Please check your connection and try again.");
    }
  };

  const updateProduct = async (id: string, form: FormData) => {
    const token = localStorage.getItem("token");
    console.log("Updating product with ID:", id);
    console.log("Available products:", products.map(p => ({ id: p.id, name: p.name })));

    try {
      // Try PATCH method first (more common for updates)
      let response = await fetch(`${API}/api/products/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });

      // If PATCH fails, try POST to /api/products/update
      if (!response.ok) {
        console.log("PATCH failed, trying POST to /api/products/update");
        response = await fetch(`${API}/api/products/update`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: form
        });
      }

      // If that also fails, try POST with ID in form data (this one works but gets 500)
      if (!response.ok) {
        console.log("POST to /update failed, trying POST with ID in form");
        
        // Create a new FormData to avoid mutating the original
        const updateForm = new FormData();
        
        // Copy all existing form data
        for (let [key, value] of form.entries()) {
          updateForm.append(key, value);
        }
        
        // Add the ID with different possible field names
        updateForm.append("id", id);
        updateForm.append("_id", id);
        updateForm.append("productId", id);
        
        // Add update flags to tell backend this is an update, not create
        updateForm.append("update", "true");
        updateForm.append("action", "update");
        updateForm.append("method", "PUT");
        updateForm.append("_method", "PUT");
        
        console.log("Form data entries:");
        for (let [key, value] of updateForm.entries()) {
          console.log(`${key}:`, value);
        }
        
        response = await fetch(`${API}/api/products`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: updateForm
        });
      }

      // If still fails, try a different approach - maybe backend expects specific update endpoint
      if (!response.ok) {
        console.log("Standard POST failed, trying with update-specific endpoint");
        
        const updateForm = new FormData();
        
        // Copy all existing form data
        for (let [key, value] of form.entries()) {
          updateForm.append(key, value);
        }
        
        // Add ID and update flag
        updateForm.append("id", id);
        updateForm.append("update", "true");
        
        response = await fetch(`${API}/api/products/${id}`, {
          method: "POST",  // Using POST instead of PUT/PATCH
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: updateForm
        });
      }

      // If all update methods fail, implement workaround: delete and recreate
      if (!response.ok) {
        console.log("All update methods failed, implementing delete-and-recreate workaround");
        
        // First, delete the old product
        const deleteResponse = await fetch(`${API}/api/products/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (deleteResponse.ok) {
          console.log("Old product deleted successfully");
          
          // Create a new FormData for the new product
          const newProductForm = new FormData();
          
          // Copy all form data but ensure the original ID is used
          for (let [key, value] of form.entries()) {
            if (key !== 'id' && key !== '_id' && key !== 'productId') {
              newProductForm.append(key, value);
            }
          }
          
          // Add the original ID to maintain consistency
          newProductForm.append("id", id);
          
          console.log("Creating new product with same ID");
          const createResponse = await fetch(`${API}/api/products`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: newProductForm
          });
          
          if (createResponse.ok) {
            const data = await createResponse.json();
            setProducts(prev =>
              prev.map(p => p.id === data.id ? data : p)
            );
            alert("Product updated successfully! (Used delete-and-recreate method)");
            return; // Success, exit function
          } else {
            const errorText = await createResponse.text();
            console.error("Failed to create new product:", errorText);
            alert("Failed to update product. Backend doesn't support updates and delete-and-recreate also failed.");
            return;
          }
        } else {
          console.error("Failed to delete old product");
          alert("Failed to update product. Backend doesn't support updates and couldn't delete the old product.");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setProducts(prev =>
          prev.map(p => p.id === data.id ? data : p)
        );
        alert("Product updated successfully!");
      } else {
        // Handle non-JSON responses (like 404 HTML pages)
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to update product: ${response.status} ${response.statusText}`;
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = `Failed to update product: ${errorData.message || response.statusText}`;
            console.error("Server error details:", errorData);
          } catch (jsonError) {
            console.error("Failed to parse error JSON:", jsonError);
          }
        } else {
          // Handle HTML responses (like 404 pages)
          const text = await response.text();
          console.error("Server returned non-JSON response:", text);
          if (response.status === 404) {
            errorMessage = "Product update endpoint not found. The backend may not support product updates yet.";
          } else if (response.status === 500) {
            errorMessage = "Server error during product update. The backend exists but there's an issue with the data format. Check console for details.";
          }
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product. Please check your connection and try again.");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`${API}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to delete product: ${errorData.error || response.statusText}`);
      }

    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product. Check console for details.");
    }
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {isAuthenticated && !isLoading && <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isAuthenticated && !isLoading && <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
          <main className={`flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth print:p-0 ${!isAuthenticated ? 'flex items-center justify-center' : ''}`}>
            <Routes>

              <Route path="/login" element={<Login />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/sales" element={
                <ProtectedRoute>
                  <Transactions typeFilter={TransactionType.SALE} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Sales Receipts" />
                </ProtectedRoute>
              } />
<Route path="/sales/:id" element={<SalesInvoicePage />} />
              <Route path="/stock-report" element={
                <ProtectedRoute>
                  <StockReport showOnlyCurrentStock={true} />
                </ProtectedRoute>
              } />

              <Route path="/stock-history" element={
                <ProtectedRoute>
                  <StockHistory />
                </ProtectedRoute>
              } />

              <Route path="/purchases" element={
                <ProtectedRoute>
                  <Transactions typeFilter={TransactionType.PURCHASE} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Purchase Orders" />
                </ProtectedRoute>
              } />

              <Route path="/payments" element={
                <ProtectedRoute>
                  <Transactions typeFilter={TransactionType.PAYMENT} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Payments & Receipts" />
                </ProtectedRoute>
              } />

              <Route path="/returns" element={
                <ProtectedRoute>
                  <Transactions typeFilter="RETURNS" transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Returns Management" />
                </ProtectedRoute>
              } />

              <Route path="/lorry-sales" element={
                <ProtectedRoute>
                  <LorrySalesList accounts={accounts} products={products} onAdd={addLorrySale} onUpdate={updateLorrySale} onDelete={deleteLorrySale} />
                </ProtectedRoute>
              } />

              <Route path="/lorry-sales/create" element={
                <ProtectedRoute>
                  <LorrySales accounts={accounts} products={products} onSubmit={addLorrySale} />
                </ProtectedRoute>
              } />

              <Route path="/lorry-sales/edit/:id" element={
                <ProtectedRoute>
                  <LorrySalesEdit accounts={accounts} products={products} onSubmit={updateLorrySale} />
                </ProtectedRoute>
              } />

              <Route path="/lorry-sales-invoice/:id" element={
                <ProtectedRoute>
                  <LorrySalesInvoiceWrapper />
                </ProtectedRoute>
              } />

              <Route path="/full-ledger" element={
                <ProtectedRoute>
                  <FullLedger />
                </ProtectedRoute>
              } />

              {/* ✅ NEW: Scan Bill Route */}
              <Route path="/scan-bill" element={
                <ProtectedRoute>
                  <ScanBillPage />
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute>
                  <Inventory products={products} onAddProduct={addProduct} categories={categories} transactions={transactions} />
                </ProtectedRoute>
              } />

              <Route path="/products" element={
                <ProtectedRoute>
                  <ProductMaster categories={categories} subCategories={subCategories} products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} />
                </ProtectedRoute>
              } />

              <Route path="/catalogue" element={
                <ProtectedRoute>
                  <Catalogue products={products} />
                </ProtectedRoute>
              } />

              <Route path="/categories" element={
                <ProtectedRoute>
                  <CategoryMaster categories={categories} onAddCategory={addCategory} onUpdateCategory={updateCategory} onDeleteCategory={deleteCategory} />
                </ProtectedRoute>
              } />

              <Route path="/sub-categories" element={
                <ProtectedRoute>
                  <SubCategoryMaster categories={categories} subCategories={subCategories} onAddSubCategory={addSubCategory} onUpdateSubCategory={updateSubCategory} onDeleteSubCategory={deleteSubCategory} />
                </ProtectedRoute>
              } />

              <Route path="/purchase-invoice/:id" element={<PurchaseInvoicePage />} />

              <Route path="/stock-in" element={
                <ProtectedRoute>
                  <StockJournal type={TransactionType.STOCK_IN} products={products} refreshProducts={fetchProducts} />
                </ProtectedRoute>
              } />

              <Route path="/stock-out" element={
                <ProtectedRoute>
                  <StockJournal type={TransactionType.STOCK_OUT} products={products} refreshProducts={fetchProducts} />
                </ProtectedRoute>
              } />

              <Route path="/report-profit" element={
                <ProtectedRoute>
                  <ProfitReport transactions={transactions} products={products} />
                </ProtectedRoute>
              } />

              <Route path="/report-cash" element={
                <ProtectedRoute>
                  <CashReport accounts={accounts} transactions={transactions} />
                </ProtectedRoute>
              } />

              <Route path="/report-bank" element={
                <ProtectedRoute>
                  <BankReport accounts={accounts} transactions={transactions} />
                </ProtectedRoute>
              } />

              <Route path="/customers" element={
                <ProtectedRoute>
                  <LedgerList filterType={AccountType.CUSTOMER} accounts={accounts} transactions={transactions} onAddAccount={addAccount} />
                </ProtectedRoute>
              } />

              <Route path="/vendors" element={
                <ProtectedRoute>
                  <LedgerList filterType={AccountType.VENDOR} accounts={accounts} transactions={transactions} onAddAccount={addAccount} />
                </ProtectedRoute>
              } />

              <Route path="/ledgers/:id" element={
                <ProtectedRoute>
                  <LedgerDetails accounts={accounts} transactions={transactions} />
                </ProtectedRoute>
              } />

            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;