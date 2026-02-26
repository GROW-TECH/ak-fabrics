
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
  FilePieChart
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
import Login from './pages/Login';
const Sidebar = ({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) => {
  const location = useLocation();

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
        { to: '/sales', label: 'Sales Receipts', icon: Receipt },
        { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
        { to: '/payments', label: 'Payments', icon: CreditCard },
        { to: '/returns', label: 'Returns', icon: RotateCcw },
      ]
    },
    {
      title: 'Inventory',
      links: [
        { to: '/inventory', label: 'Current Stock', icon: Package },
        { to: '/products', label: 'Product Master', icon: Package },
        { to: '/categories', label: 'Categories Master', icon: Layers },
        { to: '/sub-categories', label: 'Sub-Categories Master', icon: Layers },
        { to: '/stock-in', label: 'Stock In', icon: ArrowDownCircle },
        { to: '/stock-out', label: 'Stock Out', icon: ArrowUpCircle },
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
        </nav>
      </div>
    </>
  );
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
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
      </div>
    </header>
  );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("token");
console.log("Checking auth token:", token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
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
    fetchCategories();
    fetchSubCategories();
    fetchProducts();
  }, []);

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
      console.log("Local storage Token",token);
      

    try {
      const response = await fetch(`${API}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

const addTransaction = async (newTx: Transaction) => {
  setTransactions(prev => [newTx, ...prev]);

  // 🔹 Call stock API for each item
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

    // 🔹 Refresh products from DB
    await fetchProducts();
  }
};

  const addAccount = (acc: Account) => setAccounts(prev => [...prev, acc]);


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
          // ❌ DO NOT SET Content-Type HERE
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
    const response = await fetch(`${API}/api/products`, {
      method: "POST",
      headers: {
Authorization: `Bearer ${token}`      },
      body: form
    });

    if (response.ok) {
      const data = await response.json();
      setProducts(prev => [...prev, data]);
    }
  };

  const updateProduct = async (id: string, form: FormData) => {
      const token = localStorage.getItem("token");

    const response = await fetch(`${API}/api/products/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    if (response.ok) {
      const data = await response.json();
      setProducts(prev =>
        prev.map(p => p.id === data.id ? data : p)
      );
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
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth print:p-0">
            <Routes>

              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard transactions={transactions} accounts={accounts} />
                </ProtectedRoute>

              } />
              <Route path="/sales" element={
                <ProtectedRoute>

                  <Transactions typeFilter={TransactionType.SALE} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Sales Receipts" />
                </ProtectedRoute>
              } />
              <Route path="/purchases" element={<ProtectedRoute>
                <Transactions typeFilter={TransactionType.PURCHASE} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Purchase Orders" />
              </ProtectedRoute>

              } />
              <Route path="/payments" element={<ProtectedRoute>
                <Transactions typeFilter={TransactionType.PAYMENT} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Payments & Receipts" />     </ProtectedRoute>
              } />
              <Route path="/returns" element={<ProtectedRoute>
                <Transactions typeFilter="RETURNS" transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Returns Management" />    </ProtectedRoute>
              } />

              <Route path="/inventory" element={<ProtectedRoute>
                <Inventory products={products} onAddProduct={addProduct} categories={categories} transactions={transactions} />    </ProtectedRoute>
              } />
              <Route path="/products" element={<ProtectedRoute>
                <ProductMaster categories={categories} subCategories={subCategories} products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} />    </ProtectedRoute>
              } />
              <Route path="/categories" element={<ProtectedRoute>
                <CategoryMaster categories={categories} onAddCategory={addCategory} onUpdateCategory={updateCategory} onDeleteCategory={deleteCategory} />    </ProtectedRoute>
              } />
              <Route path="/sub-categories" element={<ProtectedRoute>
                <SubCategoryMaster categories={categories} subCategories={subCategories} onAddSubCategory={addSubCategory} onUpdateSubCategory={updateSubCategory} onDeleteSubCategory={deleteSubCategory} />    </ProtectedRoute>
              } />
              <Route path="/stock-in" element={
  <ProtectedRoute>
    <StockJournal 
      type={TransactionType.STOCK_IN} 
      products={products} 
      refreshProducts={fetchProducts}
    />
  </ProtectedRoute>
} />

<Route path="/stock-out" element={
  <ProtectedRoute>
    <StockJournal 
      type={TransactionType.STOCK_OUT} 
      products={products} 
      refreshProducts={fetchProducts}
    />
  </ProtectedRoute>
} />

              <Route path="/report-profit" element={<ProtectedRoute>
                <ProfitReport transactions={transactions} products={products} />    </ProtectedRoute>
              } />
              <Route path="/report-cash" element={<ProtectedRoute>
                <CashReport accounts={accounts} transactions={transactions} />    </ProtectedRoute>
              } />
              <Route path="/report-bank" element={<ProtectedRoute>
                <BankReport accounts={accounts} transactions={transactions} />    </ProtectedRoute>
              } />

              <Route path="/customers" element={<ProtectedRoute>
                <LedgerList filterType={AccountType.CUSTOMER} accounts={accounts} transactions={transactions} onAddAccount={addAccount} />    </ProtectedRoute>
              } />
              <Route path="/vendors" element={<ProtectedRoute>
                <LedgerList filterType={AccountType.VENDOR} accounts={accounts} transactions={transactions} onAddAccount={addAccount} />    </ProtectedRoute>
              } />
              <Route path="/ledgers/:id" element={<ProtectedRoute>
                <LedgerDetails accounts={accounts} transactions={transactions} />    </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
