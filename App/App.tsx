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
  LogOut,
  Building,
  Truck,
  Mail,
  DollarSign,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import SalesReceipts from './pages/SalesReceipts';
import PurchaseReceipts from './pages/PurchaseReceipts';
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
import SalesEditPage from './pages/SalesEditPage';
import PurchaseEditPage from './pages/PurchaseEditPage';
import ReportsHub from './pages/ReportsHub';
import CustomerReports from './pages/CustomerReports';
import CustomerReportDetail from './pages/CustomerReportDetail';
import PurchaseInvoicePage from "./pages/PurchaseInvoicePage";
import BarcodeScanner from "./components/BarcodeScanner";
import StockReport from "./pages/StockReport";
import StockHistory from "./pages/StockHistory";
import SalesInvoicePage from "./pages/Salesinvoicepage";
import Catalogue from "./pages/Catalogue";
import Transfer from './pages/Transfer';
import AddTransaction from './pages/AddTransaction';
import BanksPage from './pages/BanksPage';
import BankLedger from './pages/BankLedger';
import EwayBills from './pages/EwayBills';
import Returns from './pages/Returns';
import ErodeStocks from './pages/ErodeStocks';
import Envelopes from './pages/Envelopes';
import EnvelopePrint from './pages/EnvelopePrint';
import Cheques from './pages/Cheques';
import ChequePrint from './pages/ChequePrint';
import BusinessCards from './pages/BusinessCards';
import BusinessCardPrint from './pages/BusinessCardPrint';
import MemoBills from './pages/MemoBills';
import CashInHand from './pages/CashInHand';
// Erode invoice should reuse the same invoice UI as normal sales/purchases

import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
const Sidebar = ({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) => {
  const location = useLocation();
  const { shopName, logout } = useAuth();

  const words = (shopName || 'AK Fabrics').trim().split(' ');
  const initials = words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const displayName = shopName || 'AK Fabrics';

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
        { to: '/sales',             label: 'Sales Bills',              icon: Receipt },
        // { to: '/sales-receipts',    label: 'Sales Receipts',     icon: ArrowUpCircle },
        { to: '/purchases',         label: 'Purchases Bills',          icon: ShoppingCart },
        // { to: '/purchase-receipts', label: 'Purchase Receipts', icon: ArrowDownCircle },
        { to: '/memo-bills',        label: 'Memo Bills',         icon: FileText },
        { to: '/erode-sales',  label: 'Erode Sales', icon: Receipt },
        { to: '/erode-purchase', label: 'Erode Purchase', icon: ShoppingCart },
        { to: '/bank-ledger',       label: 'Bank Ledger',        icon: Landmark },
        { to: '/cash-in-hand',      label: 'Cash in Hand',      icon: DollarSign },
        { to: '/eway-bills',        label: 'E-way Bills',        icon: Truck },
      ]
    },
    {
      title: 'Inventory',
      links: [
        { to: '/categories',    label: 'Categories',    icon: Layers },
        { to: '/sub-categories',label: 'Sub-Categories',icon: Layers },
        { to: '/products',      label: 'Products',      icon: Package },
        { to: '/catalogue',     label: 'Catalogue',     icon: BookOpen },
        { to: '/stock-report',  label: 'Stock Report',  icon: BarChart3 },
        { to: '/erode-stocks', label: 'Erode Stocks', icon: Package },
          { to: '/returns',       label: 'Returns',       icon: RotateCcw },
      ]
    },
    {
      title: 'Entities',
      links: [
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/vendors', label: 'Vendors', icon: Building2 },
                { to: '/banks',             label: 'Banks',              icon: Building },
    { to: '/envelopes', label: 'Envelopes', icon: Mail },
        { to: '/cheques', label: 'Cheques', icon: CreditCard },
        { to: '/business-cards', label: 'Business Cards', icon: CreditCard },
      ]
    },
    {
      title: 'Reports',
      links: [
        { to: '/report-profit', label: 'Profit & Loss', icon: FilePieChart },
        { to: '/reports/customers', label: 'Customer-wise Reports', icon: FilePieChart },
        { to: '/reports', label: 'Overall Reports', icon: FilePieChart },
      ]
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-[55] transition-opacity bg-black/50 backdrop-blur-sm lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggle}
      />

      <div
        className={`fixed inset-y-0 left-0 z-[60] w-64 flex flex-col bg-slate-900 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-lg`}
      >
        {/* ── Shop identity block ── */}
        <div className="px-4 py-5 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <span className="text-white font-bold text-sm tracking-wide">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight truncate">{displayName}</p>
              <p className="text-indigo-400 text-[10px] font-medium mt-0.5 tracking-wide uppercase">Business Account</p>
            </div>
            <button onClick={toggle} className="lg:hidden text-slate-400 hover:text-white transition-colors ml-auto">
              ✕
            </button>
          </div>
        </div>

        {/* ── Nav links — scrollable ── */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-2">
          {groups.map((group, idx) => (
            <div key={idx} className="mb-2">
              <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`group flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-900/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                      onClick={() => { if (window.innerWidth < 1024) toggle(); }}
                    >
                      <Icon className={`w-4 h-4 mr-2.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="truncate">{link.label}</span>
                      {isActive && <ChevronRight className="ml-auto w-3.5 h-3.5 text-indigo-200" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Logout at bottom ── */}
        <div className="px-3 py-4 border-t border-slate-700/50 shrink-0">
          <button
            onClick={() => { logout(); window.location.href = '/login'; }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 text-sm font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────
const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { logout, shopName } = useAuth();
  const location = useLocation();
  const words = (shopName || 'AK').trim().split(' ');
  const initials = words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  if (location.pathname === '/transfer' || location.pathname === '/add-transaction') return null;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
      <button onClick={toggleSidebar} className="text-slate-500 focus:outline-none lg:hidden">
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex-1" />
      <div className="relative group">
        <button className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center border border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none">
          <span className="text-indigo-700 font-bold text-sm">{initials}</span>
        </button>
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800 truncate">{shopName || 'AK Fabrics'}</p>
            <p className="text-xs text-slate-500 mt-0.5">Business Account</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth guard
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
// Scan Bill page
// ─────────────────────────────────────────────────────────────────────────────
const ScanBillPage: React.FC = () => (
  <div className="min-h-full flex items-center justify-center">
    <BarcodeScanner
      onClose={() => window.history.back()}
      onFound={(id: string) => { window.location.hash = `/purchase-invoice/${id}`; }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// App content
// ─────────────────────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Allow child pages (e.g. Transactions) to open the sidebar via custom event
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener('open-sidebar', handler);
    return () => window.removeEventListener('open-sidebar', handler);
  }, []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  const API = import.meta.env.VITE_API_URL;
  console.log("API URL:", API);

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
      const res = await fetch(`${API}/api/accounts`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setAccounts(await res.json());
    } catch (e) { console.error("Failed to fetch accounts:", e); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API}/api/categories`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setCategories(await res.json());
    } catch (e) { console.error("Failed to fetch categories:", e); }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await fetch(`${API}/api/subcategories`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setSubCategories(await res.json());
    } catch (e) { console.error("Failed to fetch sub-categories:", e); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/api/products`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error("Failed to fetch products:", e); }
  };

  const addTransaction = async (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);
    if (newTx.items) {
      for (const item of newTx.items) {
        let stockType = "";
        if (newTx.type === TransactionType.PURCHASE) stockType = "PURCHASE";
        if (newTx.type === TransactionType.PURCHASE_RETURN) stockType = "RETURN";
        if (!stockType) continue;
        await fetch(`${API}/api/stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify({ product_id: item.productId, type: stockType, quantity: item.quantity, reference_id: newTx.id, note: newTx.description }),
        });
      }
      await fetchProducts();
    }
  };

  const addAccount = async (acc: Account) => {
    try {
      const res = await fetch(`${API}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(acc),
      });
      if (res.ok) await fetchAccounts();
    } catch (e) { console.error("Failed to add account:", e); }
  };

  const addCategory = async (form: FormData) => {
    try {
      const res = await fetch(`${API}/api/categories`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
      if (res.ok) { const d = await res.json(); setCategories(prev => [...prev, d]); }
    } catch (e) { console.error(e); }
  };

  const updateCategory = async (id: string, form: FormData) => {
    try {
      const res = await fetch(`${API}/api/categories/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
      if (res.ok) { const d = await res.json(); setCategories(prev => prev.map(c => c.id === d.id ? d : c)); }
    } catch (e) { console.error(e); }
  };

  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setCategories(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  };

  const addSubCategory = async (form: FormData) => {
    try {
      const res = await fetch(`${API}/api/subcategories`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || "Failed"); return; }
      const d = await res.json(); setSubCategories(prev => [...prev, d]);
    } catch (e) { console.error(e); }
  };

  const updateSubCategory = async (id: string, form: FormData) => {
    try {
      const res = await fetch(`${API}/api/subcategories/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || "Failed"); return; }
      const d = await res.json(); setSubCategories(prev => prev.map(s => s.id === d.id ? d : s));
    } catch (e) { console.error(e); }
  };

  const deleteSubCategory = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/subcategories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setSubCategories(prev => prev.filter(s => s.id !== id));
      else { const e = await res.json().catch(() => ({})); alert(e.error || "Failed"); }
    } catch (e) { console.error(e); alert("Failed to delete sub-category."); }
  };

  const addProduct = async (form: FormData) => {
    const res = await fetch(`${API}/api/products`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
    if (res.ok) { const d = await res.json(); setProducts(prev => [...prev, d]); }
  };

  const updateProduct = async (id: string, form: FormData) => {
    const res = await fetch(`${API}/api/products/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
    if (res.ok) { const d = await res.json(); setProducts(prev => prev.map(p => p.id === d.id ? d : p)); }
  };

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) setProducts(prev => prev.filter(p => p.id !== id));
      else { const e = await res.json().catch(() => ({})); alert(e.error || "Failed"); }
    } catch (e) { console.error(e); alert("Failed to delete product."); }
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 overflow-x-hidden">
        {isAuthenticated && !isLoading && (
          <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isAuthenticated && !isLoading && (
            <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          )}
          <main className={`flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth print:p-0 ${!isAuthenticated ? 'flex items-center justify-center' : ''}`}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/sales" element={
                <ProtectedRoute>
                  <Transactions typeFilter={TransactionType.SALE} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Sales Bill" />
                </ProtectedRoute>
              } />
              <Route path="/sales-receipts" element={<ProtectedRoute><SalesReceipts /></ProtectedRoute>} />
              <Route path="/sales/:id" element={<SalesInvoicePage />} />
              <Route path="/sales/:id/edit" element={<ProtectedRoute><SalesEditPage /></ProtectedRoute>} />
              <Route path="/stock-report" element={<ProtectedRoute><StockReport /></ProtectedRoute>} />
              <Route path="/purchases" element={
                <ProtectedRoute>
                  <Transactions typeFilter={TransactionType.PURCHASE} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Purchase Bill" />
                </ProtectedRoute>
              } />
              <Route path="/purchase-receipts" element={<ProtectedRoute><PurchaseReceipts /></ProtectedRoute>} />
              <Route path="/payments" element={
                <ProtectedRoute>
                  <Transactions typeFilter={TransactionType.PAYMENT} transactions={transactions} accounts={accounts} products={products} onAdd={addTransaction} title="Payments & Receipts" />
                </ProtectedRoute>
              } />
              <Route path="/returns" element={
                <ProtectedRoute>
                  <Returns />
                </ProtectedRoute>
              } />
              <Route path="/erode-stocks" element={<ProtectedRoute><ErodeStocks /></ProtectedRoute>} />
              <Route
                path="/erode-sales"
                element={
                  <ProtectedRoute>
                    <Transactions
                      typeFilter={TransactionType.SALE}
                      transactions={transactions}
                      accounts={accounts}
                      products={products.map((p) => ({
                        ...p,
                        stock: Number((p as any).erode_stock ?? 0),
                      }))}
                      onAdd={addTransaction}
                      title="Erode Sales Bill"
                      locationFilter="ERODE"
                    />
                  </ProtectedRoute>
                }
              />
              <Route path="/erode-sales-invoice/:id" element={<SalesInvoicePage />} />
              <Route path="/erode-purchase" element={
                <ProtectedRoute>
                  <Transactions
                    typeFilter={TransactionType.PURCHASE}
                    transactions={transactions}
                    accounts={accounts}
                    products={products.map((p) => ({
                      ...p,
                      stock: Number((p as any).erode_stock ?? 0),
                    }))}
                    onAdd={addTransaction}
                    title="Erode Purchase Bill"
                    locationFilter="ERODE"
                  />
                </ProtectedRoute>
              } />
              <Route path="/scan-bill" element={<ProtectedRoute><ScanBillPage /></ProtectedRoute>} />
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
              <Route path="/catalogue" element={<ProtectedRoute><Catalogue products={products} /></ProtectedRoute>} />
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
              <Route path="/envelopes" element={<ProtectedRoute><Envelopes /></ProtectedRoute>} />
              <Route path="/envelopes/:id" element={<ProtectedRoute><EnvelopePrint /></ProtectedRoute>} />
              <Route path="/cheques" element={<ProtectedRoute><Cheques /></ProtectedRoute>} />
              <Route path="/cheques/:id" element={<ProtectedRoute><ChequePrint /></ProtectedRoute>} />
              <Route path="/business-cards" element={<ProtectedRoute><BusinessCards /></ProtectedRoute>} />
              <Route path="/business-cards/:id" element={<ProtectedRoute><BusinessCardPrint /></ProtectedRoute>} />
              <Route path="/memo-bills" element={<ProtectedRoute><MemoBills /></ProtectedRoute>} />
              <Route path="/purchase-invoice/:id" element={<PurchaseInvoicePage />} />
              <Route path="/erode-purchase-invoice/:id" element={<PurchaseInvoicePage />} />
              <Route path="/purchase-invoice/:id/edit" element={<ProtectedRoute><PurchaseEditPage /></ProtectedRoute>} />
              <Route path="/stock-in" element={<ProtectedRoute><StockJournal type={TransactionType.STOCK_IN} products={products} refreshProducts={fetchProducts} /></ProtectedRoute>} />
              <Route path="/stock-out" element={<ProtectedRoute><StockJournal type={TransactionType.STOCK_OUT} products={products} refreshProducts={fetchProducts} /></ProtectedRoute>} />
              <Route path="/report-profit" element={<ProtectedRoute><ProfitReport transactions={transactions} products={products} /></ProtectedRoute>} />
              <Route path="/report-cash" element={<ProtectedRoute><CashReport accounts={accounts} transactions={transactions} /></ProtectedRoute>} />
              <Route path="/cash-in-hand" element={<ProtectedRoute><CashInHand /></ProtectedRoute>} />
            <Route path="/report-bank" element={<ProtectedRoute><BankReport accounts={accounts} transactions={transactions} /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsHub /></ProtectedRoute>} />
            <Route path="/reports/customers" element={<ProtectedRoute><CustomerReports /></ProtectedRoute>} />
            <Route path="/reports/customers/:id" element={<ProtectedRoute><CustomerReportDetail /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><LedgerList filterType={AccountType.CUSTOMER} accounts={accounts} transactions={transactions} onAddAccount={addAccount} /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><LedgerList filterType={AccountType.VENDOR} accounts={accounts} transactions={transactions} onAddAccount={addAccount} /></ProtectedRoute>} />
              <Route path="/banks" element={<ProtectedRoute><BanksPage /></ProtectedRoute>} />
              <Route path="/bank-ledger" element={<ProtectedRoute><BankLedger /></ProtectedRoute>} />
              <Route path="/eway-bills" element={<ProtectedRoute><EwayBills /></ProtectedRoute>} />
              <Route path="/transfer" element={
                <ProtectedRoute>
                  <div className="-m-4 md:-m-8">
                    <Transfer accounts={accounts} transactions={transactions} onAddTransaction={addTransaction} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/add-transaction" element={
                <ProtectedRoute>
                  <div className="-m-4 md:-m-8">
                    <AddTransaction accounts={accounts} />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/cashbook" element={<ProtectedRoute><div className="p-8"><h1 className="text-2xl font-bold mb-4">Cash Book</h1><p className="text-gray-600">Cash book functionality coming soon...</p></div></ProtectedRoute>} />
              <Route path="/ledgers/:id" element={<ProtectedRoute><LedgerDetails accounts={accounts} /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
