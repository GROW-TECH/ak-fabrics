import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, X } from 'lucide-react';
import { Transaction, Account, TransactionType, Product } from '../types';
import VoucherEntry from './VoucherEntry';
import PurchaseForm from './PurchaseForm'; // ✅ import this
import SalesForm from "./SalesForm";
import InvoiceModal from '../components/InvoiceModal';
import PurchaseInvoiceModal from "../components/PurchaseInvoiceModal";
import Barcode from "react-barcode";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";


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
  typeFilter,
  transactions,
  accounts,
  products,
  onAdd,
  title,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);


  const navigate = useNavigate();

  const fetchPurchases = async () => {
    const res = await fetch(`${API}/api/purchases`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      setPurchases(data);
    }
  };


  useEffect(() => {
    if (typeFilter === TransactionType.PURCHASE) {
      fetchPurchases();
    }
  }, [typeFilter]);


  const filtered = transactions.filter((t) => {
    const matchesType =
      typeFilter === 'ALL'
        ? true
        : typeFilter === 'RETURNS'
          ? t.type === TransactionType.SALES_RETURN ||
          t.type === TransactionType.PURCHASE_RETURN
          : t.type === typeFilter;

    const account = accounts.find((a) => a.id === t.accountId);

    const matchesSearch =
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesSearch;
  });

  const getBadgeClass = (type: TransactionType) => {
    switch (type) {
      case TransactionType.SALE:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case TransactionType.PURCHASE:
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case TransactionType.RECEIPT:
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case TransactionType.PAYMENT:
        return 'bg-orange-50 text-orange-700 border-orange-100';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  useEffect(() => {
    console.log('Transactions:', transactions);
  }, [transactions]);


  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase?")) return;

    const res = await fetch(`${API}/api/purchases/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      fetchPurchases(); // reload list
    }
  };

  const handleEdit = async (id: string) => {
    const res = await fetch(`${API}/api/purchases/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      const data = await res.json();

      setEditingPurchase(data);   // store purchase
      setIsAdding(true);          // open form
    }
  };

  // ✅ ADD MODE
  if (isAdding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            New {title.slice(0, -1)} Entry
          </h2>
          <button
            onClick={() => setIsAdding(false)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* ✅ IF PURCHASE → OPEN PURCHASE FORM */}
        {typeFilter === TransactionType.PURCHASE ? (
          <PurchaseForm
            accounts={accounts}
            products={products}
            initialData={editingPurchase}
            onSubmit={async (data) => {
              if (editingPurchase) {
                await fetch(`${API}/api/purchases/${editingPurchase.id}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({
                    vendor_id: data.vendorId,
                    total_amount: data.grandTotal,
                    items: data.items,
                  }),
                });
              } else {
                await fetch(`${API}/api/purchases`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                  body: JSON.stringify({
                    vendor_id: data.vendorId,
                    total_amount: data.grandTotal,
                    items: data.items,
                  }),
                });
              }

              setEditingPurchase(null);
              setIsAdding(false);
              fetchPurchases();
            }}
          />
        ) : typeFilter === TransactionType.SALE ? (
          <SalesForm
            accounts={accounts}
            products={products}
            onSubmit={async (data) => {
              await fetch(`${API}/api/sales`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                  customer_id: data.customerId,
                  total_amount: data.grandTotal,
                  items: data.items,
                }),
              });

              setIsAdding(false);
            }}
          />
        ) : (
          <VoucherEntry
            accounts={accounts}
            products={products}
            onAdd={(tx) => {
              onAdd(tx);
              setIsAdding(false);
            }}
            initialType={
              typeFilter === 'RETURNS'
                ? TransactionType.SALES_RETURN
                : typeFilter === 'ALL'
                  ? TransactionType.SALE
                  : typeFilter
            }
          />
        )}
      </div>
    );
  }

  const openInvoice = async (id: string) => {
    const res = await fetch(`${API}/api/purchases/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      setSelectedPurchase(data);
    }
  };

  const handleScan = async (invoiceNo: string) => {
    const res = await fetch(`${API}/api/purchases?invoice=${invoiceNo}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        openInvoice(data[0].id);
      }
    }
  };

  const handleDownload = async (id: string) => {
    const res = await fetch(`${API}/api/purchases/${id}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) return alert("Download failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Purchase-Invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };


  return (
    <div className="space-y-6">

      {selectedPurchase && (
        <PurchaseInvoiceModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}

      {viewingInvoice && (
        <InvoiceModal
          transaction={viewingInvoice}
          account={
            accounts.find((a) => a.id === viewingInvoice.accountId)!
          }
          products={products}
          onClose={() => setViewingInvoice(null)}
        />
      )}
      {viewingInvoice && (
        <InvoiceModal
          transaction={viewingInvoice}
          account={
            accounts.find((a) => a.id === viewingInvoice.accountId)!
          }
          products={products}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm">
            Review history or generate GST-compliant invoices.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> New Voucher
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <input
            type="text"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleScan(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
            className="absolute opacity-0 pointer-events-none"
          />
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-6 py-4">Invoice No</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {typeFilter === TransactionType.PURCHASE
                ? purchases.map((purchase) => {
                  const vendor = accounts.find(
                    (a) => a.id === purchase.vendor_id
                  );

                  return (
                    <tr
                      key={purchase.id}
                      onClick={() => openInvoice(purchase.id)}

                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 text-center">
                        <Barcode
                          value={purchase.invoice_no}
                          width={1}
                          height={40}
                          fontSize={10}
                        />
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">
                          {vendor?.name || "N/A"}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">
                          {vendor?.gstin}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ₹{Number(purchase.total_amount).toLocaleString()}
                      </td>

                      <td
                        className="px-6 py-4 text-center space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 👁 View */}
                        <button
                          onClick={() => navigate(`/purchase-invoice/${purchase.id}`)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                        >
                          <Eye size={16} />
                        </button>

                        {/* ⬇ Download */}
                        <button
                          onClick={() => handleDownload(purchase.id)}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition"
                        >
                          ⬇
                        </button>

                        {/* ✏ Edit */}
                        <button
                          onClick={() => handleEdit(purchase.id)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition"
                        >
                          Edit
                        </button>

                        {/* 🗑 Delete */}
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
                : filtered.map((tx) => {
                  const account = accounts.find(
                    (a) => a.id === tx.accountId
                  );

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {tx.invoiceNo ||
                          `#${tx.id.slice(-6).toUpperCase()}`}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {tx.date}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">
                          {account?.name || "N/A"}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">
                          {account?.gstin}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ₹{tx.amount.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setViewingInvoice(tx)}
                          className="px-3 py-1 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {(typeFilter === TransactionType.PURCHASE
            ? purchases.length === 0
            : filtered.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-slate-400 text-sm italic">
                  No entries found.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;    