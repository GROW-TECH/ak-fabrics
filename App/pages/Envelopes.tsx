import React, { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Printer, Eye, Trash2, Search } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "-";

const Envelopes: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    to_name: "",
    to_address1: "",
    to_address2: "",
    to_city: "",
    to_pincode: "",
    to_phone: "",
    tracking_no: "",
    notes: "",
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/envelopes`, { headers: authHeaders() });
      if (!res.ok) return setRows([]);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      String(r.to_name || "").toLowerCase().includes(q) ||
      String(r.to_phone || "").toLowerCase().includes(q) ||
      String(r.to_pincode || "").toLowerCase().includes(q) ||
      String(r.tracking_no || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const createEnvelope = async () => {
    if (!form.to_name.trim()) return alert("To name is required");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/envelopes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          to_name: form.to_name.trim(),
          tracking_no: form.tracking_no.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed to create envelope");
        return;
      }
      setShowAdd(false);
      setForm({ to_name: "", to_address1: "", to_address2: "", to_city: "", to_pincode: "", to_phone: "", tracking_no: "", notes: "" });
      await fetchRows();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!window.confirm("Delete this envelope?")) return;
    const res = await fetch(`${API}/api/envelopes/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) return alert("Delete failed");
    fetchRows();
  };

  const openPrint = (id: string) => window.open(`/#/envelopes/${id}`, "_blank");

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Mail className="w-7 h-7 text-indigo-600" />
              Envelopes
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Create, store, and print courier envelopes.</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> New Envelope
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / phone / pincode / tracking..."
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
              <p className="text-slate-500">Loading envelopes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-14 h-14 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-1">No Envelopes</h3>
              <p className="text-slate-400 text-sm">Create your first envelope to print.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">To</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Pincode</th>
                  <th className="px-5 py-4">Tracking</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600 text-sm whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{r.to_name || "-"}</td>
                    <td className="px-5 py-4 text-slate-700">{r.to_phone || "-"}</td>
                    <td className="px-5 py-4 text-slate-700">{r.to_pincode || "-"}</td>
                    <td className="px-5 py-4 text-slate-700">{r.tracking_no || "-"}</td>
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
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> New Envelope
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">To Name</label>
                <input value={form.to_name} onChange={e => setForm(p => ({ ...p, to_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                <input value={form.to_address1} onChange={e => setForm(p => ({ ...p, to_address1: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                <input value={form.to_address2} onChange={e => setForm(p => ({ ...p, to_address2: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input value={form.to_city} onChange={e => setForm(p => ({ ...p, to_city: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                <input value={form.to_pincode} onChange={e => setForm(p => ({ ...p, to_pincode: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input value={form.to_phone} onChange={e => setForm(p => ({ ...p, to_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tracking No</label>
                <input value={form.tracking_no} onChange={e => setForm(p => ({ ...p, tracking_no: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" rows={3} />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={createEnvelope}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Envelopes;

