import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Eye, Download, Pencil, Trash2, ScanLine, Camera, Upload, Keyboard, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Transaction, Account, TransactionType, Product } from '../types';
import VoucherEntry from './VoucherEntry';
import PurchaseForm from './PurchaseForm';
import SalesForm from "./SalesForm";
import InvoiceModal from '../components/InvoiceModal';
import PurchaseInvoiceModal from "../components/PurchaseInvoiceModal";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/library";

interface TransactionsProps {
  typeFilter: TransactionType | 'RETURNS' | 'ALL';
  transactions: Transaction[];
  accounts: Account[];
  products: Product[];
  onAdd: (tx: Transaction) => void;
  title: string;
}

const API = import.meta.env.VITE_API_URL;

const Transactions: React.FC<TransactionsProps> = ({
  typeFilter, transactions, accounts, products, onAdd, title,
}) => {
  const [searchTerm, setSearchTerm]             = useState('');
  const [isAdding, setIsAdding]                 = useState(false);
  const [purchases, setPurchases]               = useState<any[]>([]);
  const [sales, setSales]                       = useState<any[]>([]);
  const [viewingInvoice, setViewingInvoice]     = useState<Transaction | null>(null);
  const [editingPurchase, setEditingPurchase]   = useState<any | null>(null);
  const [editingSale, setEditingSale]           = useState<any | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [showScanner, setShowScanner]           = useState(false);
  const [activeTab, setActiveTab]               = useState<'transactions' | 'uploaded-invoices'>('transactions');
  const [uploadedInvoices, setUploadedInvoices] = useState<any[]>([]);
  const navigate = useNavigate();

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPurchases = async () => {
    const res = await fetch(`${API}/api/purchases`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setPurchases(await res.json());
  };

  const fetchSales = async () => {
    const res = await fetch(`${API}/api/sales`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setSales(await res.json());
  };

  const fetchUploadedInvoices = async () => {
    try {
      const [salesRes, purchasesRes] = await Promise.all([
        fetch(`${API}/api/sales/with-images`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API}/api/purchases/with-images`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      ]);

      const salesData = salesRes.ok ? await salesRes.json() : [];
      const purchasesData = purchasesRes.ok ? await purchasesRes.json() : [];

      const combined = [
        ...salesData.map((item: any) => ({ ...item, type: 'SALE' })),
        ...purchasesData.map((item: any) => ({ ...item, type: 'PURCHASE' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUploadedInvoices(combined);
    } catch (error) {
      console.error('Failed to fetch uploaded invoices:', error);
      setUploadedInvoices([]);
    }
  };

  useEffect(() => {
    if (typeFilter === TransactionType.PURCHASE) fetchPurchases();
    if (typeFilter === TransactionType.SALE)     fetchSales();
    if (activeTab === 'uploaded-invoices') fetchUploadedInvoices();
  }, [typeFilter, activeTab]);

  // ── Filtered (for non-purchase/sale tabs) ─────────────────────────────────
  const filtered = transactions.filter((t) => {
    const matchesType =
      typeFilter === 'ALL' ? true
      : typeFilter === 'RETURNS'
        ? t.type === TransactionType.SALES_RETURN || t.type === TransactionType.PURCHASE_RETURN
        : t.type === typeFilter;
    const account = accounts.find((a) => a.id === t.accountId);
    return matchesType && (
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // ── Purchase handlers ─────────────────────────────────────────────────────
  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Delete this purchase?")) return;
    const res = await fetch(`${API}/api/purchases/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) fetchPurchases();
  };

  const handleEditPurchase = async (id: string) => {
    const res = await fetch(`${API}/api/purchases/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("Fetched purchase for edit:", data);
      setEditingPurchase(data);
      setIsAdding(true);
    }
  };

  const handleDownloadPurchase = async (id: string, invoiceNo: string) => {
    const res = await fetch(`${API}/api/purchases/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) return alert("Download failed");
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(await res.blob());
    a.download = `${invoiceNo}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  // ── Sales handlers ────────────────────────────────────────────────────────
  const handleDeleteSale = async (id: string) => {
    if (!confirm("Delete this sale? Stock will be restored.")) return;
    const res = await fetch(`${API}/api/sales/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) fetchSales();
  };

  const handleEditSale = async (id: string) => {
    const res = await fetch(`${API}/api/sales/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) { setEditingSale(await res.json()); setIsAdding(true); }
  };

  const handleDownloadSale = async (id: string, invoiceNo: string) => {
    const res = await fetch(`${API}/api/sales/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) return alert("Download failed");
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(await res.blob());
    a.download = `${invoiceNo}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openInvoice = async (id: string) => {
    const res = await fetch(`${API}/api/purchases/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setSelectedPurchase(await res.json());
  };

  const handleScan = async (invoiceNo: string) => {
    const res = await fetch(`${API}/api/purchases?invoice=${invoiceNo}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) openInvoice(data[0].id);
    }
  };

  const statusBadge = (status: string) => ({
    PAID:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    NOT_PAID:  "bg-red-50 text-red-700 border-red-200",
    HALF_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  } as Record<string, string>)[status] || "bg-slate-100 text-slate-600 border-slate-200";

  const IconBtn = ({ onClick, title, cls, children }: {
    onClick: () => void; title: string; cls: string; children: React.ReactNode;
  }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${cls}`}>
      {children}
    </button>
  );

  // ── ADD / EDIT MODE ───────────────────────────────────────────────────────
  if (isAdding) {
    const closeForm = () => { setIsAdding(false); setEditingPurchase(null); setEditingSale(null); };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {editingPurchase || editingSale ? "Edit" : "New"}{" "}
            {typeFilter === TransactionType.SALE ? "Sale" : typeFilter === TransactionType.PURCHASE ? "Purchase" : "Entry"}
          </h2>
          <button onClick={closeForm} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {typeFilter === TransactionType.PURCHASE ? (
          <PurchaseForm
            accounts={accounts}
            products={products}
            initialData={editingPurchase}
            onSubmit={async (data) => {
              // ✅ FIX: PurchaseForm now sends vendor_id, total_amount, items directly
              const url    = editingPurchase ? `${API}/api/purchases/${editingPurchase.id}` : `${API}/api/purchases`;
              const method = editingPurchase ? "PUT" : "POST";

              // ✅ Map correctly — PurchaseForm sends these field names:
              const payload = {
                vendor_id:     data.vendor_id,       // ✅ was data.vendorId (wrong)
                total_amount:  data.total_amount,     // ✅ was data.grandTotal (wrong)
                payment_mode:  data.payment_mode  || "CREDIT",
                paid_amount:   data.paid_amount   || 0,
                through_agent: data.through_agent || null,
                notes:         data.notes         || null,
                items: data.items.map((item: any) => ({
                  productId:   item.productId,        // ✅ backend expects productId
                  hsn:         item.hsn         || "",
                  size:        item.size        || "",
                  description: item.description || "",
                  rate:        item.rate        || 0,
                  qty:         item.qty         || 1, // ✅ was item.quantity (wrong)
                  discount:    item.discount    || 0,
                  total:       item.total       || 0,
                })),
              };

              console.log("Sending purchase payload:", payload);

              const res = await fetch(url, {
                method,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return alert("Save failed: " + (err.error || res.statusText));
              }

              closeForm();
              fetchPurchases();
            }}
          />

        ) : typeFilter === TransactionType.SALE ? (
          <SalesForm
            accounts={accounts}
            products={products}
            initialData={editingSale}
            onSubmit={async (data) => {
              try {
                const url    = editingSale ? `${API}/api/sales/${editingSale.id}` : `${API}/api/sales`;
                const method = editingSale ? "PUT" : "POST";

                const res = await fetch(url, {
                  method,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({
                    customerId:  data.customerId,
                    items:       data.items,
                    grandTotal:  data.grandTotal,
                    paidAmount:  data.paidAmount  || 0,
                    paymentMode: data.paymentMode || "CREDIT",
                    through:     data.through     || "",
                    notes:       data.notes       || "",
                  }),
                });

                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  return alert("Save failed: " + (err.error || res.statusText));
                }

                closeForm();
                fetchSales();
              } catch (err) {
                console.error(err);
                alert("Network error");
              }
            }}
          />

        ) : (
          <VoucherEntry
            accounts={accounts}
            products={products}
            onAdd={(tx) => { onAdd(tx); closeForm(); }}
            initialType={
              typeFilter === 'RETURNS' ? TransactionType.SALES_RETURN
              : typeFilter === 'ALL'   ? TransactionType.SALE
              : typeFilter
            }
          />
        )}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {selectedPurchase && (
        <PurchaseInvoiceModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />
      )}
      {viewingInvoice && (
        <InvoiceModal
          transaction={viewingInvoice}
          account={accounts.find((a) => a.id === viewingInvoice.accountId)!}
          products={products}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm">Review history or generate GST-compliant invoices.</p>
        </div>
        <div className="flex gap-2">
          {/* Scan Bill Button - Only for Sales and Purchases */}
          {(typeFilter === TransactionType.SALE || typeFilter === TransactionType.PURCHASE) && (
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0891b2, #6366f1)" }}>
              <ScanLine className="w-4 h-4" />
              Scan Bill
            </button>
          )}
          <button
            onClick={() => { setEditingSale(null); setEditingPurchase(null); setIsAdding(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md transition">
            <Plus className="w-4 h-4" /> New Voucher
          </button>
        </div>
      </div>

      {/* Tab Navigation - Only for Sales and Purchases */}
      {(typeFilter === TransactionType.SALE || typeFilter === TransactionType.PURCHASE) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All Transactions
            </button>
            <button
              onClick={() => setActiveTab('uploaded-invoices')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'uploaded-invoices'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Uploaded Invoices
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Search bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {/* Hidden USB scanner */}
        <input type="text" autoFocus className="absolute opacity-0 pointer-events-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") { handleScan(e.currentTarget.value); e.currentTarget.value = ""; }
          }} />

        <div className="overflow-x-auto">

          {/* ══════════════════ UPLOADED INVOICES TAB ══════════════════ */}
          {activeTab === 'uploaded-invoices' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Uploaded Invoice Images</h3>
              {uploadedInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">No uploaded invoices found</p>
                  <p className="text-slate-400 text-xs mt-1">Upload invoice images using the Scan Bill button</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedInvoices.map((invoice) => (
                    <div key={`${invoice.type}-${invoice.id}`} 
                         className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                         onClick={() => {
                           if (invoice.type === 'SALE') {
                             navigate(`/sales/${invoice.id}`);
                           } else {
                             navigate(`/purchase-invoice/${invoice.id}`);
                           }
                         }}>
                      <div className="aspect-video bg-slate-100 relative">
                        {invoice.imageUrl ? (
                          <img 
                            src={invoice.imageUrl} 
                            alt={`${invoice.type} Invoice ${invoice.invoice_no}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-slate-300" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            invoice.type === 'SALE' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {invoice.type}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-slate-800 text-sm">{invoice.invoice_no}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {invoice.type === 'SALE' ? invoice.customer_name : invoice.vendor_name || 'N/A'}
                        </p>
                        {invoice.total_amount && (
                          <p className="text-sm font-bold text-slate-900 mt-2">
                            ₹{Number(invoice.total_amount).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ TRANSACTIONS TAB ══════════════════ */}
          {activeTab === 'transactions' && (
            <>
              {/* ══════════════════ SALES TABLE ══════════════════ */}
              {typeFilter === TransactionType.SALE && (() => {
            const filteredSales = sales.filter(s =>
              !searchTerm ||
              s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Through</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan={11} className="py-16 text-center text-slate-400 italic text-sm">No sales found.</td></tr>
                  ) : filteredSales.map((sale, idx) => (
                    <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3 text-xs text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-mono text-indigo-500 block">{sale.invoice_no}</span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800 text-sm leading-tight">{sale.customer_name}</p>
                        {sale.customer_phone && <p className="text-[10px] text-slate-400 mt-0.5">{sale.customer_phone}</p>}
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-medium text-slate-700">{sale.total_qty}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(sale.total_amount).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${statusBadge(sale.status)}`}>
                          {(sale.status || "NOT_PAID").replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">
                        {Number(sale.balance_amount) > 0
                          ? <span className="text-red-500">₹{Number(sale.balance_amount).toLocaleString()}</span>
                          : <span className="text-emerald-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                          {sale.payment_mode}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">
                        {sale.through_agent || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <IconBtn onClick={() => navigate(`/sales/${sale.id}`)} title="View Invoice"
                            cls="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </IconBtn>
                          <IconBtn onClick={() => handleDownloadSale(sale.id, sale.invoice_no)} title="Download PDF"
                            cls="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white">
                            <Download className="w-3.5 h-3.5" />
                          </IconBtn>
                          <IconBtn onClick={() => handleEditSale(sale.id)} title="Edit Sale"
                            cls="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white">
                            <Pencil className="w-3.5 h-3.5" />
                          </IconBtn>
                          <IconBtn onClick={() => handleDeleteSale(sale.id)} title="Delete Sale"
                            cls="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white">
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}

          {/* ══════════════════ PURCHASE TABLE ══════════════════ */}
          {typeFilter === TransactionType.PURCHASE && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-slate-400 italic text-sm">No purchases found.</td></tr>
                ) : purchases
                    .filter(p =>
                      !searchTerm ||
                      p.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((purchase, idx) => (
                  <tr key={purchase.id}
                    className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/purchase-invoice/${purchase.id}`)}>

                    <td className="px-3 py-3 text-xs text-slate-400 text-center">{idx + 1}</td>

                    {/* Invoice number */}
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-mono text-indigo-500 block">{purchase.invoice_no}</span>
                    </td>

                    <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(purchase.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>

                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{purchase.vendor_name || "N/A"}</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${statusBadge(purchase.payment_status || "NOT_PAID")}`}>
                        {(purchase.payment_status || "NOT_PAID").replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(purchase.total_amount).toLocaleString()}
                    </td>

                    <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">
                      {Number(purchase.balance_amount) > 0
                        ? <span className="text-red-500">₹{Number(purchase.balance_amount).toLocaleString()}</span>
                        : <span className="text-emerald-400">—</span>}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <IconBtn onClick={() => navigate(`/purchase-invoice/${purchase.id}`)} title="View"
                          cls="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white">
                          <Eye className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn onClick={() => handleDownloadPurchase(purchase.id, purchase.invoice_no)} title="Download PDF"
                          cls="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white">
                          <Download className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn onClick={() => handleEditPurchase(purchase.id)} title="Edit"
                          cls="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white">
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn onClick={() => handleDeletePurchase(purchase.id)} title="Delete"
                          cls="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white">
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ══════════════════ OTHER TRANSACTIONS ══════════════════ */}
          {typeFilter !== TransactionType.SALE && typeFilter !== TransactionType.PURCHASE && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Account</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center text-slate-400 italic text-sm">No entries found.</td></tr>
                ) : filtered.map((tx) => {
                  const account = accounts.find((a) => a.id === tx.accountId);
                  return (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-800">{tx.invoiceNo || `#${tx.id.slice(-6).toUpperCase()}`}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{tx.date}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">{account?.name || "N/A"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{account?.gstin}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">₹{tx.amount.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          <IconBtn onClick={() => setViewingInvoice(tx)} title="View"
                            cls="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </>
          )}
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          type={typeFilter}
          onFound={(id) => {
            if (typeFilter === TransactionType.SALE) {
              navigate(`/sales/${id}`);
            } else if (typeFilter === TransactionType.PURCHASE) {
              navigate(`/purchase-invoice/${id}`);
            }
          }}
        />
      )}
    </div>
  );
};

// ── Scanner Modal Component ───────────────────────────────────────────────
const ScannerModal: React.FC<{ 
  onClose: () => void; 
  type: TransactionType.SALE | TransactionType.PURCHASE;
  onFound: (id: string) => void;
}> = ({ onClose, type, onFound }) => {
  const [mode, setMode] = useState<'choose' | 'camera' | 'upload' | 'usb'>('choose');
  const [usbInput, setUsbInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const fetchByInvoice = async (invoiceNumber: string) => {
    setLoading(true);
    setStatus('scanning');
    try {
      const endpoint = type === TransactionType.SALE ? 'sales' : 'purchases';
      const res = await fetch(`${API}/api/${endpoint}/barcode/${invoiceNumber.trim()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      if (!res.ok) throw new Error(`Invoice not found: ${invoiceNumber.trim()}`);
      const data = await res.json();
      setScannedData(data);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setLoading(true);
    setStatus('scanning');
    try {
      // Create a FormData object to send the image
      const formData = new FormData();
      formData.append('image', file);
      
      const endpoint = type === TransactionType.SALE ? 'sales/scan-image' : 'purchases/scan-image';
      const res = await fetch(`${API}/api/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process image');
      }
      
      const data = await res.json();
      
      if (data.success) {
        setScannedData({
          id: type === TransactionType.SALE ? data.salesId : data.purchaseId,
          invoice_no: data.invoiceNo,
          imageUrl: data.imageUrl
        });
        setStatus('success');
      } else {
        throw new Error('Failed to create invoice from image');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus('idle');
    setScannedData(null);
    setErrorMsg('');
    setUsbInput('');
    setMode('choose');
  };

  // Initialize camera when mode changes to camera
  useEffect(() => {
    if (mode !== 'camera') return;
    
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    
    reader.listVideoInputDevices().then(devices => {
      if (devices.length > 0 && videoRef.current) {
        reader.decodeFromVideoDevice(devices[0].deviceId, videoRef.current, result => {
          if (result) {
            reader.reset();
            setMode('choose');
            fetchByInvoice(result.getText());
          }
        });
      }
    });
    
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
           style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)' }} />
        <div className="flex justify-between items-center px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" 
                 style={{ background: 'rgba(99,102,241,0.2)' }}>
              <ScanLine className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Scan {type === TransactionType.SALE ? 'Sales' : 'Purchase'} Bill</h2>
              <p className="text-slate-500 text-xs mt-0.5">Scan barcode or upload invoice image</p>
            </div>
          </div>
          <button onClick={onClose} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 pb-7 space-y-4">
          {mode === 'choose' && status !== 'success' && status !== 'error' && !loading && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { 
                  m: 'camera' as const, 
                  icon: <Camera className="w-7 h-7 text-indigo-400" />, 
                  label: 'Camera Scan', 
                  sub: 'Use webcam to scan barcode',
                  bg: 'rgba(99,102,241,0.06)', 
                  border: 'rgba(99,102,241,0.2)', 
                  hover: '#6366f1' 
                },
                { 
                  m: 'upload' as const, 
                  icon: <Upload className="w-7 h-7 text-emerald-400" />, 
                  label: 'Upload Image', 
                  sub: 'Upload invoice image',
                  bg: 'rgba(16,185,129,0.06)', 
                  border: 'rgba(16,185,129,0.2)', 
                  hover: '#10b981' 
                },
                { 
                  m: 'usb' as const, 
                  icon: <Keyboard className="w-7 h-7 text-cyan-400" />, 
                  label: 'USB Scanner', 
                  sub: 'Barcode gun or manual entry',
                  bg: 'rgba(6,182,212,0.06)', 
                  border: 'rgba(6,182,212,0.2)', 
                  hover: '#06b6d4' 
                },
              ].map(({ m, icon, label, sub, bg, border, hover }) => (
                <button key={m} onClick={() => setMode(m)}
                        className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all"
                        style={{ background: bg, borderColor: border }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = hover)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" 
                       style={{ background: bg.replace('0.06','0.15') }}>
                    {icon}
                  </div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-slate-400 text-xs">{sub}</p>
                </button>
              ))}
            </div>
          )}

          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black" 
                   style={{ border: '2px solid rgba(99,102,241,0.4)' }}>
                <video ref={videoRef} className="w-full h-56 object-cover" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-8 right-8 h-0.5 bg-indigo-400" 
                       style={{ animation: "scanline 2s ease-in-out infinite", top:"50%", boxShadow:"0 0 8px #6366f1" }} />
                </div>
              </div>
              <button onClick={reset} 
                      className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">
                ← Back
              </button>
              <style>{`@keyframes scanline{0%,100%{top:20%}50%{top:80%}}`}</style>
            </div>
          )}

          {mode === 'upload' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" 
                   style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-slate-400 text-sm mb-3">Upload invoice image to scan:</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition"
                >
                  Choose Image File
                </button>
              </div>
              <button onClick={reset} 
                      className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                ← Back
              </button>
            </div>
          )}

          {mode === 'usb' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" 
                   style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <p className="text-slate-400 text-sm mb-3">Scan with USB barcode gun OR type invoice number:</p>
                <form onSubmit={e => { e.preventDefault(); if (usbInput.trim()) fetchByInvoice(usbInput.trim()); }}
                      className="flex gap-3">
                  <input
                    value={usbInput}
                    onChange={e => setUsbInput(e.target.value)}
                    placeholder="e.g., SAL0000001 or PUR0000001"
                    className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    autoFocus
                  />
                  <button type="submit" 
                          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-semibold transition">
                    Search
                  </button>
                </form>
              </div>
              <button onClick={reset} 
                      className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                ← Back
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm">Scanning...</p>
            </div>
          )}

          {status === 'success' && scannedData && (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                {scannedData.imageUrl ? 'Invoice Created!' : 'Invoice Found!'}
              </p>
              <p className="text-slate-400 text-sm mb-2">{scannedData.invoice_no}</p>
              
              {scannedData.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={scannedData.imageUrl} 
                    alt="Uploaded invoice" 
                    className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-emerald-500"
                  />
                  <p className="text-slate-400 text-xs mt-2">Invoice image uploaded</p>
                </div>
              )}
              
              <div className="space-y-2">
                <button
                  onClick={() => onFound(scannedData.id)}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition"
                >
                  {scannedData.imageUrl ? 'Complete Invoice Details' : 'View Invoice'}
                </button>
                <button onClick={reset} 
                        className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">Not Found</p>
              <p className="text-slate-400 text-sm mb-4">{errorMsg}</p>
              <button onClick={reset} 
                      className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;