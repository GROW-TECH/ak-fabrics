import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Printer, Eye, Trash2, Search, Calendar } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "-";

// Convert number to words (Indian numbering) for quick cheque filling
const numberToWords = (num: number) => {
  if (!isFinite(num) || num < 0) return "";
  if (num === 0) return "Zero";
  const belowTwenty = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number) => n < 20 ? belowTwenty[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? " " + belowTwenty[n % 10] : ""}`;

  const threeDigits = (n: number) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return `${hundred ? belowTwenty[hundred] + " Hundred" + (rest ? " " : "") : ""}${rest ? twoDigits(rest) : ""}`;
  };

  const parts = [];
  const crore = Math.floor(num / 1_00_00_000);
  const lakh = Math.floor((num / 1_00_000) % 100);
  const thousand = Math.floor((num / 1000) % 100);
  const hundred = Math.floor(num % 1000);

  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(threeDigits(lakh) + " Lakh");
  if (thousand) parts.push(threeDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ").trim();
};

const Cheques: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wordsEdited, setWordsEdited] = useState(false);
  const [form, setForm] = useState({
    payee_name: "",
    amount: "",
    amount_words: "",
    cheque_date: "",
    bank_name: "",
    account_no: "",
    branch: "",
    notes: "",
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/cheques`, { headers: authHeaders() });
      if (!res.ok) return setRows([]);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  // Auto-fill amount in words when amount changes (unless user edited words manually)
  useEffect(() => {
    if (wordsEdited) return;
    const amt = Number(form.amount);
    if (!isNaN(amt) && form.amount !== "") {
      const words = numberToWords(Math.floor(amt));
      setForm((p) => ({ ...p, amount_words: words ? `${words} Only` : "" }));
    } else if (form.amount === "") {
      setForm((p) => ({ ...p, amount_words: "" }));
    }
  }, [form.amount, wordsEdited]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.payee_name || "").toLowerCase().includes(q) ||
      String(r.bank_name || "").toLowerCase().includes(q) ||
      String(r.branch || "").toLowerCase().includes(q) ||
      String(r.amount || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const createCheque = async () => {
    if (!form.payee_name.trim()) return alert("Payee name is required");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/cheques`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          payee_name: form.payee_name.trim(),
          amount: Number(form.amount) || 0,
          amount_words: form.amount_words.trim() || null,
          cheque_date: form.cheque_date || null,
          bank_name: form.bank_name.trim() || null,
          account_no: form.account_no.trim() || null,
          branch: form.branch.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed to create cheque");
        return;
      }
      setShowAdd(false);
      setWordsEdited(false);
      setForm({ payee_name: "", amount: "", amount_words: "", cheque_date: "", bank_name: "", account_no: "", branch: "", notes: "" });
      await fetchRows();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!window.confirm("Delete this cheque?")) return;
    const res = await fetch(`${API}/api/cheques/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) return alert("Delete failed");
    fetchRows();
  };

  const openPrint = (id: string) => window.open(`/#/cheques/${id}`, "_blank");

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-indigo-600" />
              Cheques
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Create, store, and print cheques.</p>
          </div>
          <button
            onClick={() => { 
              setShowAdd(true); 
              setWordsEdited(false);
              setForm({ payee_name: "", amount: "", amount_words: "", cheque_date: "", bank_name: "", account_no: "", branch: "", notes: "" });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> New Cheque
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payee / bank / amount..."
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-sm text-slate-500 whitespace-nowrap">{filtered.length} / {rows.length}</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
              <p className="text-slate-500">Loading cheques...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-14 h-14 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-1">No Cheques</h3>
              <p className="text-slate-400 text-sm">Create your first cheque to print.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Payee</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Bank</th>
                  <th className="px-5 py-4">Branch</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600 text-sm whitespace-nowrap">{fmtDate(r.created_at || r.cheque_date)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{r.payee_name || "-"}</td>
                    <td className="px-5 py-4 text-slate-700">₹{Number(r.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-4 text-slate-700">{r.bank_name || "-"}</td>
                    <td className="px-5 py-4 text-slate-700">{r.branch || "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openPrint(r.id)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold inline-flex items-center gap-2">
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button onClick={() => openPrint(r.id)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold inline-flex items-center gap-2">
                          <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={() => del(r.id)} className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold inline-flex items-center gap-2">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> New Cheque
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Payee Name</label>
                <input value={form.payee_name} onChange={e => setForm(p => ({ ...p, payee_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => { setWordsEdited(false); setForm(p => ({ ...p, amount: e.target.value })); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount in Words</label>
                <input value={form.amount_words} onChange={e => { setWordsEdited(true); setForm(p => ({ ...p, amount_words: e.target.value })); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cheque Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input type="date" value={form.cheque_date} onChange={e => setForm(p => ({ ...p, cheque_date: e.target.value }))} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account No</label>
                <input value={form.account_no} onChange={e => setForm(p => ({ ...p, account_no: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <input value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
              <button onClick={createCheque} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold">
                {saving ? "Saving..." : "Save Cheque"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cheques;
