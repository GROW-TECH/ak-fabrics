import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Plus, X, Eye, Pencil, ScanLine, Upload, Download, Trash2,
  CheckCircle, AlertCircle, Image as ImageIcon, Camera,
  ShoppingCart, Banknote, MoreVertical,
  ArrowLeftRight, Calculator, Bell,
  Phone,
  IndianRupee,
  Users,
  Bookmark, ArrowLeft,
} from 'lucide-react';
import { Transaction, Account, TransactionType, Product } from '../types';
import VoucherEntry from './VoucherEntry';
import PurchaseForm from './PurchaseForm';
import SalesForm from './SalesForm';
import InvoiceModal from '../components/InvoiceModal';
import PurchaseInvoiceModal from '../components/PurchaseInvoiceModal';

interface TransactionsProps {
  typeFilter: TransactionType | 'RETURNS' | 'ALL';
  transactions: Transaction[];
  accounts: Account[];
  products: Product[];
  onAdd: (tx: Transaction) => void;
  title: string;
  locationFilter?: string; // e.g., 'ERODE' to fetch location-specific data
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const avatarColors = [
  'bg-blue-500','bg-indigo-500','bg-violet-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500',
  'bg-teal-500','bg-orange-500','bg-lime-600','bg-sky-500',
];
const getAvatarColor = (name: string) =>
  avatarColors[(name || '').charCodeAt(0) % avatarColors.length];
const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();
const fmt = (n: number) => n.toLocaleString('en-IN');

type ViewTab = 'ALL' | 'DUE' | 'ADVANCE' | 'CATEGORY';
type SortOption = 'NAME_ASC' | 'NAME_DESC' | 'AMOUNT_ASC' | 'AMOUNT_DESC' | 'LAST_TXN' | 'CATEGORY' | 'REPORT' | 'NAME_ADDR';

// ─── Party Row ────────────────────────────────────────────────────────────────
const PartyRow: React.FC<{
  name: string; sub: string; date: string; invoiceNo: string;
  totalAmount: number; paidAmount: number; status: string;
  type: 'sales' | 'purchases'; paymentMode?: string; bankName?: string | null;
  onView: () => void; onAddTransaction: () => void; onSettleAccount: () => void;
  onEditAccount: () => void; onDeleteAccount: () => void;
  onBookmark?: () => void; onSendReminder?: () => void; onCall?: () => void;
}> = ({ name, sub, date, invoiceNo, totalAmount, paidAmount, status, type, paymentMode, bankName,
        onView, onAddTransaction, onSettleAccount, onEditAccount, onDeleteAccount,
        onBookmark, onSendReminder, onCall }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const balance = totalAmount - paidAmount;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const balanceDisplay = balance > 0
    ? { text: `${fmt(balance)} Advance`, cls: 'text-green-900 bg-green-200 border-green-400' }
    : balance < 0
    ? { text: `${fmt(Math.abs(balance))} Due`, cls: 'text-red-900 bg-red-200 border-red-400' }
    : { text: '0', cls: 'text-blue-900 bg-blue-200 border-blue-400' };
  const rowBg = balance > 0 ? 'bg-green-100' : balance < 0 ? 'bg-red-100' : 'bg-white';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 active:bg-gray-100 cursor-pointer ${rowBg}`} onClick={onView}>
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base ${getAvatarColor(name)}`}>
        {getInitial(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-[15px] leading-tight truncate">{name || 'N/A'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-[12px] text-gray-400 truncate max-w-[140px]">{sub || 'Others'}</p>
          {bankName && (
            <>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200 truncate max-w-[110px]">
                🏦 {bankName}
              </span>
            </>
          )}
          <span className="text-gray-300 text-xs">·</span>
          <p className="text-[12px] text-gray-400 shrink-0">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className={`text-[14px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${balanceDisplay.cls}`}>
          {balanceDisplay.text}
        </p>
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100" onClick={() => setMenuOpen(v => !v)}>
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-40 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[180px] py-1">
              {[
                { label: 'Add Transaction',     icon: <Plus className="w-4 h-4" />,          action: onAddTransaction, color: 'text-gray-700' },
                { label: 'Settle Account',      icon: <ArrowLeftRight className="w-4 h-4" />, action: onSettleAccount,  color: 'text-gray-700' },
                ...(onCall         ? [{ label: 'Call',                  icon: <Phone className="w-4 h-4" />,    action: onCall,         color: 'text-blue-500' }] : []),
                ...(onSendReminder ? [{ label: 'Send payment reminder', icon: <Bell className="w-4 h-4" />,     action: onSendReminder, color: 'text-gray-700' }] : []),
                ...(onBookmark     ? [{ label: 'Bookmark',              icon: <Bookmark className="w-4 h-4" />, action: onBookmark,     color: 'text-gray-700' }] : []),
                { label: 'Edit Account',   icon: <Pencil className="w-4 h-4" />, action: onEditAccount,   color: 'text-gray-700' },
                { label: 'Delete Account', icon: <Trash2 className="w-4 h-4" />, action: onDeleteAccount, color: 'text-red-500' },
              ].map(item => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${item.color} hover:bg-gray-50`}
                  onClick={() => { setMenuOpen(false); item.action(); }}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Summary Bar ──────────────────────────────────────────────────────────────
const SummaryBar: React.FC<{ data: any[]; labelLeft?: string; labelMid?: string; labelRight?: string }> = ({
  data, labelLeft = 'Total Bill Amount', labelMid = 'Total Paid Amount', labelRight = 'Total Balance',
}) => {
  const total = data.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const paid  = data.reduce((s, i) => s + Number(i.paid_amount  || 0), 0);
  return (
    <div className="grid grid-cols-3 border-t-2 border-gray-200 bg-white text-center">
      <div className="py-2 px-1 border-r border-gray-200">
        <p className="text-[10px] font-bold text-green-600 leading-tight">{labelLeft}</p>
        <p className="text-[13px] font-extrabold text-green-700">{fmt(total)}</p>
      </div>
      <div className="py-2 px-1 border-r border-gray-200">
        <p className="text-[10px] font-bold text-red-500 leading-tight">{labelMid}</p>
        <p className="text-[13px] font-extrabold text-red-600">{fmt(paid)}</p>
      </div>
      <div className="py-2 px-1">
        <p className="text-[10px] font-bold text-gray-600 leading-tight">{labelRight}</p>
        <p className="text-[13px] font-extrabold text-gray-800">{fmt(Math.abs(total - paid))}</p>
      </div>
    </div>
  );
};

// ─── Bottom Nav Bar ───────────────────────────────────────────────────────────
const BottomNavBar: React.FC<{ onScanPress?: () => void; onTransferPress?: () => void }> = ({ onScanPress, onTransferPress }) => (
  <div className="bg-white border-t border-gray-200 px-2 py-1 grid grid-cols-4 text-center">
    {[
      { icon: <ArrowLeftRight className="w-5 h-5" />, label: 'Transfer',       action: onTransferPress },
      { icon: <IndianRupee className="w-5 h-5" />,   label: 'Cash Book',       action: undefined },
      { icon: <Calculator className="w-5 h-5" />,    label: 'Cash Calculator', action: onScanPress },
      { icon: <MoreVertical className="w-5 h-5" />,  label: 'More Optio...',   action: undefined },
    ].map(item => (
      <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-0.5 py-1 text-gray-500 active:text-blue-600">
        {item.icon}
        <span className="text-[9px] font-medium leading-tight">{item.label}</span>
      </button>
    ))}
  </div>
);

// ─── Desktop Stats ────────────────────────────────────────────────────────────
const SummaryStats: React.FC<{ data: any[]; type: 'sales' | 'purchases' }> = ({ data, type }) => {
  const today = new Date().toDateString();
  const totalRevenue = data.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const todayItems   = data.filter(i => new Date(i.created_at).toDateString() === today);
  const todayRevenue = todayItems.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const isSale = type === 'sales';
  const cards = [
    { label: `Total ${isSale ? 'Sales' : 'Purchases'}`, value: data.length.toLocaleString(),       sub: 'Overall volume', icon: <ShoppingCart className="w-4 h-4" />, accent: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100' },
    { label: `Total ${isSale ? 'Revenue' : 'Spend'}`,   value: `₹${fmt(totalRevenue)}`,            sub: 'All time',       icon: <Banknote className="w-4 h-4" />,     accent: 'from-emerald-500 to-teal-600',  bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: "Today's Count",                            value: todayItems.length.toLocaleString(), sub: 'Daily',          icon: <ShoppingCart className="w-4 h-4" />, accent: 'from-amber-500 to-orange-500',  bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100' },
    { label: "Today's Revenue",                          value: `₹${fmt(todayRevenue)}`,            sub: 'Daily earnings', icon: <Banknote className="w-4 h-4" />,     accent: 'from-sky-500 to-cyan-600',      bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-100' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(card => (
        <div key={card.label} className={`relative flex items-center gap-3 p-4 rounded-2xl border ${card.border} bg-white shadow-sm overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${card.accent}`} />
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${card.bg} ${card.text}`}>{card.icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium leading-tight truncate">{card.label}</p>
            <p className={`text-lg font-extrabold leading-tight ${card.text}`}>{card.value}</p>
            <p className="text-[10px] text-slate-400 leading-tight truncate">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const IconBtn: React.FC<{ onClick: (e: any) => void; title: string; cls?: string; children: React.ReactNode }> =
  ({ onClick, title, cls = '', children }) => (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition ${cls}`}>{children}</button>
  );

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────
const Transactions: React.FC<TransactionsProps> = ({ typeFilter, transactions, accounts, products, onAdd, title, locationFilter }) => {
  const [searchTerm, setSearchTerm]           = useState('');
  const [isAdding, setIsAdding]               = useState(false);
  const [purchases, setPurchases]             = useState<any[]>([]);
  const [sales, setSales]                     = useState<any[]>([]);
  const [viewingInvoice, setViewingInvoice]   = useState<Transaction | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [editingSale, setEditingSale]         = useState<any | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [showScanner, setShowScanner]         = useState(false);
  const [activeTab, setActiveTab]             = useState<'transactions' | 'uploaded-invoices'>('transactions');
  const [uploadedInvoices, setUploadedInvoices] = useState<any[]>([]);
  const [uploadedLoading, setUploadedLoading] = useState(false);
  const [viewTab, setViewTab]                 = useState<ViewTab>('ALL');
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [showSortMenu, setShowSortMenu]       = useState(false);
  const [sortOption, setSortOption]           = useState<SortOption>('NAME_ASC');
  const [showReminders, setShowReminders]     = useState(false);
  const [reminderTab, setReminderTab]         = useState<'TODAY' | 'ALL'>('TODAY');
  const [reminderSearch, setReminderSearch]   = useState('');

  const navigate         = useNavigate();
  const location         = useLocation();
  const isSalesRoute     = location.pathname === '/sales' || location.pathname === '/erode-sales';
  const isPurchaseRoute  = location.pathname === '/purchases' || location.pathname === '/erode-purchase';
  const isSaleFilter     = typeFilter === TransactionType.SALE;
  const isPurchaseFilter = typeFilter === TransactionType.PURCHASE;
  const purchaseInvoicePath = (id: string) =>
    locationFilter ? `/erode-purchase-invoice/${id}` : `/purchase-invoice/${id}`;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPurchases = async () => {
    const q = locationFilter ? `?location=${encodeURIComponent(locationFilter)}` : '';
    const res = await fetch(`${API}/api/purchases${q}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.ok) setPurchases(await res.json());
  };
  const fetchSales = async () => {
    const q = locationFilter ? `?location=${encodeURIComponent(locationFilter)}` : '';
    const res = await fetch(`${API}/api/sales${q}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.ok) setSales(await res.json());
  };
  const fetchUploadedInvoices = async () => {
    try {
      setUploadedLoading(true);
      const endpoint = isPurchaseFilter ? 'purchases/with-images' : 'sales/with-images';
      const q = locationFilter ? `?location=${encodeURIComponent(locationFilter)}` : '';
      const res = await fetch(`${API}/api/${endpoint}${q}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed');
      setUploadedInvoices(await res.json());
    } catch { setUploadedInvoices([]); }
    finally { setUploadedLoading(false); }
  };

  useEffect(() => {
    if (isPurchaseFilter) fetchPurchases();
    if (isSaleFilter)     fetchSales();
    if (activeTab === 'uploaded-invoices') fetchUploadedInvoices();
  }, [typeFilter, activeTab, locationFilter]);

  // ── Filter & Sort — SINGLE source used by BOTH mobile and desktop ──────────
  const applySearch = (data: any[], nameKey: string) =>
    data.filter(i =>
      !searchTerm ||
      i[nameKey]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const applyViewTab = (data: any[]) => {
    if (viewTab === 'DUE')     return data.filter(i => Number(i.total_amount || 0) - Number(i.paid_amount || 0) < 0);
    if (viewTab === 'ADVANCE') return data.filter(i => Number(i.total_amount || 0) - Number(i.paid_amount || 0) > 0);
    return data;
  };

  const sortRows = (rows: any[], nameKey: 'customer_name' | 'vendor_name') => {
    const getName     = (r: any) => String(r?.[nameKey] || '').toLowerCase();
    const getBalance  = (r: any) => Number(r?.total_amount || 0) - Number(r?.paid_amount || 0);
    const getDate     = (r: any) => new Date(r?.created_at || 0).getTime();
    const getCategory = (r: any) => String(nameKey === 'customer_name' ? (r?.customer_phone || '') : (r?.invoice_no || '')).toLowerCase();
    return [...rows].sort((a, b) => {
      if (sortOption === 'NAME_ASC')    return getName(a).localeCompare(getName(b));
      if (sortOption === 'NAME_DESC')   return getName(b).localeCompare(getName(a));
      if (sortOption === 'AMOUNT_ASC')  return getBalance(a) - getBalance(b);
      if (sortOption === 'AMOUNT_DESC') return getBalance(b) - getBalance(a);
      if (sortOption === 'LAST_TXN')    return getDate(b) - getDate(a);
      if (sortOption === 'CATEGORY')    return getCategory(a).localeCompare(getCategory(b));
      if (sortOption === 'REPORT')      return Math.abs(getBalance(b)) - Math.abs(getBalance(a));
      if (sortOption === 'NAME_ADDR')   return `${getName(a)} ${getCategory(a)}`.localeCompare(`${getName(b)} ${getCategory(b)}`);
      return 0;
    });
  };

  // ✅ ONE source for both mobile and desktop — no customerOnlySalesRows merging
  const filteredSales     = sortRows(applyViewTab(applySearch(sales,     'customer_name')), 'customer_name');
  const filteredPurchases = sortRows(applyViewTab(applySearch(purchases, 'vendor_name')),   'vendor_name');

  const searchPartyOptions = (
    isSaleFilter     ? accounts.filter(a => String(a.type || '').toUpperCase() === 'CUSTOMER') :
    isPurchaseFilter ? accounts.filter(a => String(a.type || '').toUpperCase() === 'VENDOR')   : accounts
  ).filter(a => !searchTerm || (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const reminderSource = isSaleFilter
    ? filteredSales.map((r: any) => ({ id: r.id, name: r.customer_name || 'Customer', phone: r.customer_phone || '', date: r.created_at, balance: Number(r.total_amount || 0) - Number(r.paid_amount || 0) }))
    : isPurchaseFilter
      ? filteredPurchases.map((r: any) => ({ id: r.id, name: r.vendor_name || 'Vendor', phone: r.vendor_phone || '', date: r.created_at, balance: Number(r.total_amount || 0) - Number(r.paid_amount || 0) }))
      : [];

  const reminderRows = reminderSource
    .filter(r => reminderTab === 'ALL' || new Date(r.date).toDateString() === new Date().toDateString())
    .filter(r => { const q = reminderSearch.trim().toLowerCase(); if (!q) return true; return String(r.name || '').toLowerCase().includes(q) || String(r.phone || '').includes(q); });

  const reminderReceive = reminderRows.reduce((s, r) => s + (r.balance > 0 ? r.balance : 0), 0);
  const reminderPay     = reminderRows.reduce((s, r) => s + (r.balance < 0 ? Math.abs(r.balance) : 0), 0);
  const reminderBalance = Math.abs(reminderReceive - reminderPay);

  const filtered = transactions.filter(t => {
    const matchesType = typeFilter === 'ALL' ? true : typeFilter === 'RETURNS' ? (t.type === TransactionType.SALES_RETURN || t.type === TransactionType.PURCHASE_RETURN) : t.type === typeFilter;
    const account = accounts.find(a => a.id === t.accountId);
    return matchesType && (!searchTerm || account?.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const closeForm = () => { setIsAdding(false); setEditingSale(null); setEditingPurchase(null); };

  // ── Actions ────────────────────────────────────────────────────────────────
  const downloadInvoice = async (module: 'sales' | 'purchases', id: string, invoiceNo: string) => {
    try {
      const res = await fetch(`${API}/api/${module}/${id}/download`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) return alert((await res.json().catch(() => ({}))).error || 'Download failed');
      const blob = await res.blob(), url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${invoiceNo || 'invoice'}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  const deleteSale = async (id: string) => {
    if (!window.confirm('Delete this sale?')) return;
    const res = await fetch(`${API}/api/sales/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.ok) fetchSales(); else alert('Delete failed');
  };

  const deletePurchase = async (id: string) => {
    if (!window.confirm('Delete this purchase?')) return;
    const res = await fetch(`${API}/api/purchases/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.ok) fetchPurchases(); else alert('Delete failed');
  };

  const deleteAccount = async (id: string, label: string) => {
    if (!window.confirm(`Delete this ${label}?`)) return;
    const res = await fetch(`${API}/api/accounts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) return alert('Delete failed');
    if (isSaleFilter) fetchSales();
    if (isPurchaseFilter) fetchPurchases();
  };

  const sendPaymentReminderPdf = async (accountId: string, partyName: string, phone: string | undefined, _balance: number, module: 'sales' | 'purchases') => {
    if (!accountId) return alert('Account not found for this party');
    if (!phone)     return alert('No phone number available for this party');
    const digits = String(phone).replace(/\D/g, '');
    if (!digits)    return alert('Invalid phone number');
    try {
      const res = await fetch(`${API}/api/accounts/${accountId}/reminder-pdf?module=${module}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return alert(e.error || 'Failed to generate reminder PDF'); }
      const blob = await res.blob();
      const fileName = `${(partyName || 'party').replace(/[^a-zA-Z0-9-_]/g, '_')}-payment-reminder.pdf`;
      const nav: any = navigator;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: 'Payment Reminder' }); return; }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      const opened = window.open(`whatsapp://send?phone=91${digits}`, '_blank');
      if (!opened) window.open(`https://wa.me/91${digits}`, '_blank', 'noopener,noreferrer');
      alert('PDF downloaded and WhatsApp opened.');
    } catch { alert('Failed to send payment reminder PDF'); }
  };

  const resolvePartyAccountId = (explicitId: string | undefined, partyName: string | undefined, phone: string | undefined, partyType: 'CUSTOMER' | 'VENDOR') => {
    if (explicitId) return explicitId;
    const normalizedName  = String(partyName || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    const match = accounts.find(a => {
      if (String(a.type || '').toUpperCase() !== partyType) return false;
      const nameOk  = normalizedName  && String(a.name  || '').trim().toLowerCase() === normalizedName;
      const phoneOk = normalizedPhone && String(a.phone || '').replace(/\D/g, '')   === normalizedPhone;
      return nameOk || phoneOk;
    });
    return match?.id;
  };

  const openEditSale = async (id: string) => {
    const res = await fetch(`${API}/api/sales/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) return alert('Failed');
    setEditingPurchase(null); setEditingSale(await res.json()); setIsAdding(false);
  };

  const openEditPurchase = async (id: string) => {
    const res = await fetch(`${API}/api/purchases/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) return alert('Failed');
    setEditingSale(null); setEditingPurchase(await res.json()); setIsAdding(false);
  };

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  if (isAdding || editingSale || editingPurchase) {
    if (isPurchaseFilter || editingPurchase) {
      return (
        <div className="space-y-5 max-w-6xl mx-auto">
          <PurchaseForm accounts={accounts} products={products} initialData={editingPurchase || undefined}
            onSubmit={async (data) => {
              try {
                const isEdit = Boolean(editingPurchase?.id);
                const res = await fetch(isEdit ? `${API}/api/purchases/${editingPurchase.id}` : `${API}/api/purchases`, {
                  method: isEdit ? 'PUT' : 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                  body: JSON.stringify({ vendor_id: data.vendor_id, payment_mode: data.payment_mode || 'CREDIT', paid_amount: data.paid_amount || 0, bankId: data.bankId || null, through_agent: data.through_agent || null, notes: data.notes || null, total_amount: data.total_amount, poe: data.poe || 0, items: data.items.map((item: any) => ({ productId: item.productId || '', hsn: item.hsn || '', size: item.size || '', description: item.description || '', rate: item.rate || 0, qty: item.qty || 1, discount: item.discount || 0, total: item.total || 0 })), ...(locationFilter ? { location: locationFilter } : {}) }),
                });
                if (!res.ok) return alert('Save failed: ' + ((await res.json().catch(() => ({}))).error || res.statusText));
                closeForm(); fetchPurchases();
              } catch { alert('Network error'); }
            }}
          />
        </div>
      );
    }
    if (isSaleFilter || editingSale) {
      return (
        <div className="space-y-5 max-w-6xl mx-auto">
          <SalesForm accounts={accounts} products={products} initialData={editingSale || undefined}
            onSubmit={async (data) => {
              try {
                const res = await fetch(editingSale ? `${API}/api/sales/${editingSale.id}` : `${API}/api/sales`, {
                  method: editingSale ? 'PUT' : 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                  body: JSON.stringify({ customerId: data.customerId, items: data.items, grandTotal: data.grandTotal, paidAmount: data.paidAmount || 0, paymentMode: data.paymentMode || 'CREDIT', bankId: data.bankId || null, through: data.through || '', notes: data.notes || '', customerPincode: data.customerPincode || '', ...(locationFilter ? { location: locationFilter } : {}) }),
                });
                if (!res.ok) return alert('Save failed: ' + ((await res.json().catch(() => ({}))).error || res.statusText));
                closeForm(); fetchSales();
              } catch { alert('Network error'); }
            }}
          />
        </div>
      );
    }
    return (
      <div className="space-y-5 max-w-6xl mx-auto">
        <VoucherEntry accounts={accounts} products={products} onAdd={tx => { onAdd(tx); closeForm(); }}
          initialType={typeFilter === 'RETURNS' ? TransactionType.SALES_RETURN : typeFilter === 'ALL' ? TransactionType.SALE : typeFilter}
        />
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen md:h-auto bg-gray-50 md:bg-transparent md:space-y-4">

      {selectedPurchase && <PurchaseInvoiceModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />}
      {viewingInvoice && <InvoiceModal transaction={viewingInvoice} account={accounts.find(a => a.id === viewingInvoice.accountId)!} products={products} onClose={() => setViewingInvoice(null)} />}

      {/* ══ MOBILE HEADER ════════════════════════════════════════════════════ */}
      <div className="md:hidden bg-blue-600 fixed inset-x-0 top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="text-white" onClick={() => window.dispatchEvent(new Event('open-sidebar'))}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-white font-black text-base tracking-wide uppercase">
                {isSaleFilter ? 'Sales' : isPurchaseFilter ? 'Purchases' : title}
              </span>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowPartySearch(true)} className="w-8 h-8 flex items-center justify-center text-white"><Search className="w-5 h-5" /></button>
            <button onClick={() => setShowReminders(true)}   className="w-8 h-8 flex items-center justify-center text-white"><Bell className="w-5 h-5" /></button>
            <button onClick={() => setShowSortMenu(v => !v)} className="w-8 h-8 flex items-center justify-center text-white"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {showSortMenu && (
          <>
            <button type="button" aria-label="Close" className="fixed inset-0 z-[74]" onClick={() => setShowSortMenu(false)} />
            <div className="absolute right-2 top-12 bg-white text-gray-800 rounded-md shadow-2xl border border-gray-200 z-[75] w-[190px] overflow-hidden">
              {[
                { id: 'NAME_ASC', label: 'Name Ascending' }, { id: 'NAME_DESC', label: 'Name Descending' },
                { id: 'AMOUNT_ASC', label: 'Amount Ascending' }, { id: 'AMOUNT_DESC', label: 'Amount Descending' },
                { id: 'LAST_TXN', label: 'Last Transaction' }, { id: 'CATEGORY', label: 'Category' },
                { id: 'REPORT', label: 'Report' }, { id: 'NAME_ADDR', label: 'Your Name and Address' },
              ].map(opt => (
                <label key={opt.id} className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                  <span>{opt.label}</span>
                  <input type="checkbox" checked={sortOption === opt.id} onChange={() => setSortOption(opt.id as SortOption)} className="w-4 h-4 accent-teal-600" />
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex border-t border-blue-500">
          {(['ALL', 'DUE', 'ADVANCE', 'CATEGORY'] as ViewTab[]).map(tab => (
            <button key={tab} onClick={() => setViewTab(tab)}
              className={`flex-1 py-2.5 text-xs font-bold transition border-r border-blue-500 last:border-r-0 ${viewTab === tab ? 'text-white border-b-2 border-white bg-blue-700' : 'text-blue-200'}`}>
              {tab === 'ALL' ? 'All' : tab === 'DUE' ? 'Due' : tab === 'ADVANCE' ? 'Advance' : 'Category'}
            </button>
          ))}
        </div>

        {isPurchaseFilter && (
          <div className="flex border-t border-blue-500">
            {(['transactions', 'uploaded-invoices'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[11px] font-semibold transition border-r border-blue-500 last:border-r-0 ${activeTab === tab ? 'text-white border-b-2 border-white bg-blue-700' : 'text-blue-300'}`}>
                {tab === 'transactions' ? 'All Transactions' : 'Uploaded Bills'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Party Search Overlay */}
      {showPartySearch && (
        <div className="md:hidden fixed inset-0 z-[80] bg-black/45 flex items-end pb-44" onClick={() => setShowPartySearch(false)}>
          <div className="mx-1.5 w-full bg-white rounded-md shadow-2xl p-3" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-semibold text-blue-700 mb-2">Name</p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={`Search ${isSaleFilter ? 'customer' : isPurchaseFilter ? 'vendor' : 'party'}`}
                className="w-full pl-9 pr-9 py-2.5 rounded-full border border-gray-700 text-sm outline-none" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4" /></button>}
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {searchPartyOptions.map(acc => (
                <button key={acc.id} onClick={() => { setSearchTerm(acc.name || ''); setShowPartySearch(false); }} className="w-full text-left text-base text-gray-800 py-1">{acc.name}</button>
              ))}
              {searchPartyOptions.length === 0 && <p className="text-xs text-gray-400 py-1">No matches</p>}
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => { setShowPartySearch(false); navigate(isSaleFilter ? '/customers?add=1' : '/vendors?add=1'); }} className="text-blue-700 font-semibold text-xs">
                {isSaleFilter ? 'ADD CUSTOMER' : 'ADD VENDOR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Overlay */}
      {showReminders && (
        <div className="md:hidden fixed inset-0 z-[85] bg-[#dfe3e8]">
          <div className="bg-[#2196f3] text-white">
            <div className="px-3 py-3 flex items-center gap-3">
              <button onClick={() => setShowReminders(false)}><ArrowLeft className="w-5 h-5" /></button>
              <h2 className="text-[26px] font-medium">Reminders</h2>
            </div>
            <div className="grid grid-cols-2 text-center text-[12px]">
              <button onClick={() => setReminderTab('TODAY')} className={`py-2 ${reminderTab === 'TODAY' ? 'border-b-2 border-[#0b6ec4] font-semibold' : 'opacity-80'}`}>TODAY</button>
              <button onClick={() => setReminderTab('ALL')}   className={`py-2 ${reminderTab === 'ALL'   ? 'border-b-2 border-[#0b6ec4] font-semibold' : 'opacity-80'}`}>ALL</button>
            </div>
          </div>
          <div className="p-2 pb-28">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
              <input value={reminderSearch} onChange={e => setReminderSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300 text-sm outline-none" placeholder="Search reminders" />
            </div>
            {reminderRows.length === 0
              ? <div className="text-center text-xs text-gray-500 py-8">No reminders</div>
              : <div className="space-y-1">{reminderRows.map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 px-3 py-2 rounded-md">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      <p className={`text-sm font-bold ${r.balance < 0 ? 'text-red-600' : r.balance > 0 ? 'text-green-700' : 'text-blue-700'}`}>
                        {Math.abs(r.balance).toLocaleString('en-IN')} {r.balance < 0 ? 'Due' : r.balance > 0 ? 'Advance' : ''}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                ))}</div>
            }
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-white grid grid-cols-3 border-t border-gray-400 text-center">
            <div className="py-1.5 border-r border-gray-400"><p className="text-[20px] text-green-700">Receive</p><p className="text-[22px] text-green-700 font-semibold">{fmt(reminderReceive)}</p></div>
            <div className="py-1.5 border-r border-gray-400"><p className="text-[20px] text-red-600">Pay</p><p className="text-[22px] text-red-600 font-semibold">{fmt(reminderPay)}</p></div>
            <div className="py-1.5"><p className="text-[20px] text-gray-900">Balance</p><p className="text-[22px] text-blue-700 font-semibold">{fmt(reminderBalance)}</p></div>
          </div>
        </div>
      )}

      {/* ══ DESKTOP HEADER ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm">Review history or generate GST-compliant invoices.</p>
        </div>
        <div className="flex gap-2">
          {isPurchaseFilter && (
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#0891b2,#6366f1)' }}>
              <ScanLine className="w-4 h-4" /> Scan Bill
            </button>
          )}
          <button onClick={() => { setEditingSale(null); setEditingPurchase(null); setIsAdding(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md transition">
            <Plus className="w-4 h-4" />
            {isPurchaseFilter ? 'New Purchase' : isSaleFilter ? 'New Sale' : 'New Voucher'}
          </button>
        </div>
      </div>

      <div className="hidden md:block">
        {isSaleFilter     && <SummaryStats data={sales}     type="sales" />}
        {isPurchaseFilter && <SummaryStats data={purchases} type="purchases" />}
      </div>

      {isPurchaseFilter && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['transactions', 'uploaded-invoices'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab === 'transactions' ? 'All Transactions' : 'Uploaded Invoices'}
              </button>
            ))}
          </div>
        </div>
      )}

      {(isSaleFilter || isPurchaseFilter) && (
        <div className="hidden md:flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-1.5 ml-auto">
            {(['ALL', 'DUE', 'ADVANCE', 'CATEGORY'] as ViewTab[]).map(f => (
              <button key={f} onClick={() => setViewTab(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${viewTab === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                {f === 'ALL' ? 'All' : f === 'DUE' ? 'Due' : f === 'ADVANCE' ? 'Advance' : 'Category'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ SCROLLABLE BODY ══════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto md:overflow-visible">

        {isPurchaseFilter && activeTab === 'uploaded-invoices' && (
          <div className="p-4 md:bg-white md:rounded-2xl md:border md:border-slate-100 md:shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Uploaded Purchase Bills</h3>
            {uploadedLoading ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm">Loading...</p>
              </div>
            ) : uploadedInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Upload className="w-8 h-8 text-slate-400" /></div>
                <p className="text-slate-500 text-sm">No uploaded invoices</p>
                <p className="text-slate-400 text-xs mt-1">Use Scan Bill to upload</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedInvoices.map(invoice => (
                  <div key={`${invoice.type}-${invoice.id}`} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => invoice.imageUrl && window.open(invoice.imageUrl, '_blank', 'noopener,noreferrer')}>
                    <div className="aspect-video bg-slate-100 relative">
                      {invoice.imageUrl ? <img src={invoice.imageUrl} alt={`Invoice ${invoice.invoice_no}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-slate-300" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-slate-800 text-xs">{invoice.invoice_no}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 truncate">{invoice.type === 'SALE' ? invoice.customer_name : invoice.vendor_name}</p>
                      {invoice.bank_name && <p className="text-[10px] text-blue-600 font-medium mt-0.5">🏦 {invoice.bank_name}</p>}
                      {invoice.total_amount && Number(invoice.total_amount) > 0 && <p className="text-xs font-bold text-slate-900 mt-1">₹{Number(invoice.total_amount).toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <>
            {/* ══ SALES ══ */}
            {isSaleFilter && (
              <>
                {/* ✅ MOBILE — same filteredSales as desktop, no extra customerOnlySalesRows */}
                <div className="md:hidden bg-white pt-2">
                  {filteredSales.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Users className="w-8 h-8 text-gray-300" /></div>
                      <p className="text-gray-400 text-sm font-medium">No sales found</p>
                      <p className="text-gray-300 text-xs mt-1">Add a new sale to get started</p>
                    </div>
                  ) : filteredSales.map(sale => (
                    <PartyRow key={sale.id}
                      name={sale.customer_name}
                      sub={sale.customer_phone || 'Others'}
                      date={new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, ' ')}
                      invoiceNo={sale.invoice_no}
                      totalAmount={Number(sale.total_amount)}
                      paidAmount={Number(sale.paid_amount || 0)}
                      status={sale.status || 'NOT_PAID'}
                      type="sales"
                      paymentMode={sale.payment_mode}
                      bankName={sale.bank_name || null}
                      onView={() => {
                        const ledgerId = resolvePartyAccountId(sale.customer_id, sale.customer_name, sale.customer_phone, 'CUSTOMER');
                        if (!ledgerId) return alert('Account not found');
                        navigate(`/ledgers/${ledgerId}`);
                      }}
                      onAddTransaction={() => { setEditingSale(null); setEditingPurchase(null); setIsAdding(true); }}
                      onSettleAccount={() => navigate('/transfer', { state: { module: 'sales' } })}
                      onEditAccount={() => navigate('/customers')}
                      onDeleteAccount={() => deleteSale(sale.id)}
                      onBookmark={() => alert('Bookmarked')}
                      onSendReminder={sale.customer_phone ? () => {
                        const accountId = resolvePartyAccountId(sale.customer_id, sale.customer_name, sale.customer_phone, 'CUSTOMER');
                        if (!accountId) return alert('Account not found');
                        return sendPaymentReminderPdf(accountId, sale.customer_name, sale.customer_phone, Number(sale.total_amount || 0) - Number(sale.paid_amount || 0), 'sales');
                      } : undefined}
                      onCall={sale.customer_phone ? () => window.open(`tel:${sale.customer_phone}`) : undefined}
                    />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['#', 'Created', 'Updated', 'Invoice', 'Customer', 'Qty', 'Amount', 'Paid', 'Bank', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.length === 0
                          ? <tr><td colSpan={11} className="py-16 text-center text-slate-400 italic text-sm">No sales found.</td></tr>
                          : filteredSales.map((sale, idx) => (
                            <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                              <td className="px-3 py-3 text-xs text-slate-400 text-center">{idx + 1}</td>
                              <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                              <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(sale.updated_at || sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                              <td className="px-3 py-3"><span className="text-[10px] font-mono text-indigo-500">{sale.invoice_no}</span></td>
                              <td className="px-3 py-3"><p className="font-semibold text-slate-800 text-sm">{sale.customer_name}</p>{sale.customer_phone && <p className="text-[10px] text-slate-400">{sale.customer_phone}</p>}</td>
                              <td className="px-3 py-3 text-center text-sm font-medium text-slate-700">{sale.total_qty}</td>
                              <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">₹{Number(sale.total_amount).toLocaleString()}</td>
                              <td className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">₹{(sale.status === 'HALF_PAID' ? Number(sale.paid_amount || 0) : 0).toLocaleString()}</td>
                              <td className="px-3 py-3">
                                {sale.bank_name
                                  ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">🏦 {sale.bank_name}</span>
                                  : <span className="text-xs text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${sale.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : sale.status === 'HALF_PAID' ? 'bg-amber-200 text-amber-900 border-amber-400' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                                  {(sale.status || 'NOT_PAID').replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex justify-center gap-1">
                                   <IconBtn onClick={() => navigate(locationFilter ? `/erode-sales-invoice/${sale.id}` : `/sales/${sale.id}`)} title="View" cls="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"><Eye className="w-3.5 h-3.5" /></IconBtn>
                                  <IconBtn onClick={() => openEditSale(sale.id)} title="Edit" cls="bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white"><Pencil className="w-3.5 h-3.5" /></IconBtn>
                                  <IconBtn onClick={() => downloadInvoice('sales', sale.id, sale.invoice_no)} title="Download" cls="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"><Download className="w-3.5 h-3.5" /></IconBtn>
                                  <IconBtn onClick={() => deleteSale(sale.id)} title="Delete" cls="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══ PURCHASES ══ */}
            {isPurchaseFilter && (
              <>
                {/* ✅ MOBILE — same filteredPurchases as desktop */}
                <div className="md:hidden bg-white">
                  {filteredPurchases.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Users className="w-8 h-8 text-gray-300" /></div>
                      <p className="text-gray-400 text-sm font-medium">No purchases found</p>
                    </div>
                  ) : filteredPurchases.map(purchase => (
                    <PartyRow key={purchase.id}
                      name={purchase.vendor_name || 'N/A'}
                      sub={purchase.invoice_no || 'Others'}
                      date={new Date(purchase.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, ' ')}
                      invoiceNo={purchase.invoice_no}
                      totalAmount={Number(purchase.total_amount)}
                      paidAmount={Number(purchase.paid_amount || 0)}
                      status={purchase.payment_status || 'NOT_PAID'}
                      type="purchases"
                      paymentMode={purchase.payment_mode}
                      bankName={purchase.bank_name || null}
                      onView={() => {
                        const ledgerId = resolvePartyAccountId(purchase.vendor_id, purchase.vendor_name, purchase.vendor_phone, 'VENDOR');
                        if (!ledgerId) return alert('Account not found');
                        navigate(`/ledgers/${ledgerId}`);
                      }}
                      onAddTransaction={() => { setEditingSale(null); setEditingPurchase(null); setIsAdding(true); }}
                      onSettleAccount={() => navigate('/transfer', { state: { module: 'purchases' } })}
                      onEditAccount={() => navigate('/vendors')}
                      onDeleteAccount={() => deletePurchase(purchase.id)}
                      onBookmark={() => alert('Bookmarked')}
                      onSendReminder={purchase.vendor_phone ? () => {
                        const accountId = resolvePartyAccountId(purchase.vendor_id, purchase.vendor_name, purchase.vendor_phone, 'VENDOR');
                        if (!accountId) return alert('Account not found');
                        return sendPaymentReminderPdf(accountId, purchase.vendor_name || 'Vendor', purchase.vendor_phone, Number(purchase.total_amount || 0) - Number(purchase.paid_amount || 0), 'purchases');
                      } : undefined}
                      onCall={purchase.vendor_phone ? () => window.open(`tel:${purchase.vendor_phone}`) : undefined}
                    />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['#', 'Invoice', 'Created', 'Updated', 'Vendor', 'Amount', 'Paid', 'Bank', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPurchases.length === 0
                          ? <tr><td colSpan={10} className="py-16 text-center text-slate-400 italic text-sm">No purchases found.</td></tr>
                          : filteredPurchases.map((p, idx) => (
                            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => navigate(purchaseInvoicePath(p.id))}>
                              <td className="px-3 py-3 text-xs text-slate-400 text-center">{idx + 1}</td>
                              <td className="px-3 py-3"><span className="text-[10px] font-mono text-indigo-500">{p.invoice_no}</span></td>
                              <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                              <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(p.updated_at || p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                              <td className="px-3 py-3"><p className="font-semibold text-slate-800">{p.vendor_name || 'N/A'}</p>{p.vendor_phone && <p className="text-[10px] text-slate-400">{p.vendor_phone}</p>}</td>
                              <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">₹{Number(p.total_amount).toLocaleString()}</td>
                              <td className="px-3 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">₹{(p.payment_status === 'HALF_PAID' ? Number(p.paid_amount || 0) : 0).toLocaleString()}</td>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                {p.bank_name
                                  ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">🏦 {p.bank_name}</span>
                                  : <span className="text-xs text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${p.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : p.payment_status === 'HALF_PAID' ? 'bg-amber-200 text-amber-900 border-amber-400' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                                  {(p.payment_status || 'NOT_PAID').replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex justify-center gap-1">
                                  <IconBtn onClick={e => { e.stopPropagation(); navigate(purchaseInvoicePath(p.id)); }} title="View" cls="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"><Eye className="w-3.5 h-3.5" /></IconBtn>
                                  <IconBtn onClick={e => { e.stopPropagation(); openEditPurchase(p.id); }} title="Edit" cls="bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white"><Pencil className="w-3.5 h-3.5" /></IconBtn>
                                  <IconBtn onClick={e => { e.stopPropagation(); downloadInvoice('purchases', p.id, p.invoice_no); }} title="Download" cls="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"><Download className="w-3.5 h-3.5" /></IconBtn>
                                  <IconBtn onClick={e => { e.stopPropagation(); deletePurchase(p.id); }} title="Delete" cls="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* OTHER */}
            {!isSaleFilter && !isPurchaseFilter && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-100 md:shadow-sm overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Invoice No', 'Date', 'Account', 'Total', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={5} className="py-16 text-center text-slate-400 italic text-sm">No entries found.</td></tr>
                      : filtered.map(tx => {
                          const account = accounts.find(a => a.id === tx.accountId);
                          return (
                            <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                              <td className="px-5 py-3 font-semibold text-slate-800">{tx.invoiceNo || `#${tx.id.slice(-6).toUpperCase()}`}</td>
                              <td className="px-5 py-3 text-xs text-slate-500">{tx.date}</td>
                              <td className="px-5 py-3"><p className="font-semibold text-slate-800">{account?.name || 'N/A'}</p></td>
                              <td className="px-5 py-3 text-right font-bold text-slate-900">₹{tx.amount.toLocaleString()}</td>
                              <td className="px-5 py-3"><div className="flex justify-center"><IconBtn onClick={() => setViewingInvoice(tx)} title="View" cls="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"><Eye className="w-3.5 h-3.5" /></IconBtn></div></td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="md:hidden h-52" />
      </div>

      {/* ══ MOBILE FIXED BOTTOM ══════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        {isSaleFilter     && <SummaryBar data={filteredSales} />}
        {isPurchaseFilter && <SummaryBar data={filteredPurchases} />}
        <BottomNavBar
          onScanPress={isPurchaseFilter ? () => setShowScanner(true) : undefined}
          onTransferPress={() => navigate('/transfer', { state: { module: isSalesRoute ? 'sales' : isPurchaseRoute ? 'purchases' : 'general' } })}
        />
      </div>

      {/* ══ MOBILE FABs ══════════════════════════════════════════════════════ */}
      {(isSalesRoute || isPurchaseRoute) && (
        <div className="md:hidden fixed z-50 bottom-[calc(3rem+48px)] left-0 right-0 px-4 flex gap-2">
          <button
            onClick={() => navigate('/add-transaction', { state: { module: isSalesRoute ? 'sales' : isPurchaseRoute ? 'purchases' : 'general' } })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border-2 border-blue-600 text-blue-600 text-[13px] font-bold shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
            </svg>
            Transactions
          </button>
          <button
            onClick={() => {
              if (isSalesRoute)    { navigate('/customers?add=1'); return; }
              if (isPurchaseRoute) { navigate('/vendors?add=1');   return; }
              setEditingSale(null); setEditingPurchase(null); setIsAdding(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-blue-600 text-white text-[13px] font-bold shadow-lg">
            <Plus className="w-4 h-4" />
            {isSalesRoute ? 'Add Customer' : 'Add Vendor'}
          </button>
        </div>
      )}

      {isPurchaseRoute && (
        <button onClick={() => setShowScanner(true)}
          className="md:hidden fixed z-50 right-4 bottom-[calc(3rem+96px)] w-12 h-12 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#0891b2,#6366f1)' }}>
          <ScanLine className="w-5 h-5" />
        </button>
      )}

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          type={typeFilter as TransactionType.SALE | TransactionType.PURCHASE}
          onFound={id => {
            if (isSaleFilter) navigate(locationFilter ? `/erode-sales-invoice/${id}` : `/sales/${id}`);
            if (isPurchaseFilter) navigate(purchaseInvoicePath(id));
          }}
          onUploaded={() => { fetchUploadedInvoices().then(() => setActiveTab('uploaded-invoices')); }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Scanner Modal
// ─────────────────────────────────────────────────────────────────────────────
const ScannerModal: React.FC<{
  onClose: () => void; type: TransactionType.SALE | TransactionType.PURCHASE;
  onFound: (id: string) => void; onUploaded: () => void;
}> = ({ onClose, type, onFound, onUploaded }) => {
  const [mode, setMode]               = useState<'choose' | 'camera' | 'upload'>('choose');
  const [status, setStatus]           = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (mode !== 'camera') return;
    setCameraReady(false);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setCameraReady(true); } })
      .catch(() => { setErrorMsg('Camera access denied.'); setStatus('error'); setMode('choose'); });
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  }, [mode]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
      setMode('choose');
      handleImageUpload(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }, []);

  const handleImageUpload = async (file: File) => {
    setLoading(true); setStatus('scanning');
    try {
      const formData = new FormData(); formData.append('image', file);
      const endpoint = type === TransactionType.SALE ? 'sales/scan-image' : 'purchases/scan-image';
      const res = await fetch(`${API}/api/${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed'); }
      const data = await res.json();
      if (!data.success) throw new Error('Failed to upload');
      setScannedData({ id: type === TransactionType.SALE ? data.salesId : data.purchaseId, invoice_no: data.invoiceNo, imageUrl: data.imageUrl });
      setStatus('success');
    } catch (err: any) { setErrorMsg(err.message || 'Upload failed'); setStatus('error'); }
    finally { setLoading(false); }
  };

  const reset = () => {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    setStatus('idle'); setScannedData(null); setErrorMsg(''); setMode('choose'); setCameraReady(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center md:p-4"
      style={{ background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) { reset(); onClose(); } }}>
      <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl" style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)' }} />
        <div className="md:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-600 rounded-full" /></div>
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}><ScanLine className="w-5 h-5 text-indigo-400" /></div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">Scan {type === TransactionType.SALE ? 'Sales' : 'Purchase'} Bill</h2>
              <p className="text-slate-500 text-xs mt-0.5">Camera or upload invoice image</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 pb-8 space-y-4">
          {mode === 'choose' && status !== 'success' && status !== 'error' && !loading && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('camera')} className="flex flex-col items-center gap-3 p-5 rounded-2xl border transition hover:border-indigo-500" style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}><Camera className="w-7 h-7 text-indigo-400" /></div>
                <div className="text-center"><p className="text-white font-semibold text-sm">Camera</p><p className="text-slate-400 text-xs">Take a photo</p></div>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-5 rounded-2xl border transition hover:border-emerald-500" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}><Upload className="w-7 h-7 text-emerald-400" /></div>
                <div className="text-center"><p className="text-white font-semibold text-sm">Upload</p><p className="text-slate-400 text-xs">From gallery</p></div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            </div>
          )}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ border: '2px solid rgba(99,102,241,0.4)' }}>
                <video ref={videoRef} className="w-full h-56 object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {cameraReady && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-44 border-2 border-indigo-400 rounded-xl opacity-60 relative">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
                    </div>
                  </div>
                )}
                {!cameraReady && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>}
              </div>
              <button onClick={capturePhoto} disabled={!cameraReady} className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>📸 Capture</button>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">Back</button>
            </div>
          )}
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Processing image...</p>
            </div>
          )}
          {status === 'success' && scannedData && (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">{scannedData.imageUrl ? 'Uploaded!' : 'Invoice Found!'}</p>
              <p className="text-slate-400 text-sm mb-3">{scannedData.invoice_no}</p>
              {scannedData.imageUrl && <img src={scannedData.imageUrl} alt="invoice" className="w-28 h-28 object-cover rounded-lg mx-auto border-2 border-emerald-500 mb-3" />}
              <div className="space-y-2">
                <button onClick={() => { if (scannedData.imageUrl) { onUploaded(); onClose(); return; } onFound(scannedData.id); onClose(); }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition">
                  {scannedData.imageUrl ? 'View Uploaded' : 'Complete Details'}
                </button>
                {scannedData.imageUrl && <button onClick={() => window.open(scannedData.imageUrl, '_blank', 'noopener,noreferrer')} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">Open Image</button>}
                <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">Scan Another</button>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center py-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">Error</p>
              <p className="text-slate-400 text-sm mb-4">{errorMsg}</p>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
