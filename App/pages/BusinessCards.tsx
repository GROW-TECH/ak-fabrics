import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Edit2, Share2, Printer, Phone, Mail, User, MapPin, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const placeholderLogo = "https://dummyimage.com/120x120/94a3b8/ffffff.png&text=Logo";
const logoSrc = (val: string) => {
  if (!val) return placeholderLogo;
  if (val.startsWith("http") || val.startsWith("data:")) return val;
  return `${API}${val}`;
};

const BusinessCards: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [form, setForm] = useState({
    business_name: "",
    description: "",
    address: "",
    contact_name: "",
    phone: "",
    email: "",
    logo_url: "",
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/business-cards`, { headers: authHeaders() });
      const data = res.ok ? await res.json() : [];
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
    return rows.filter((r) =>
      String(r.business_name || "").toLowerCase().includes(q) ||
      String(r.contact_name || "").toLowerCase().includes(q) ||
      String(r.phone || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const openForm = (row?: any) => {
    if (row) {
      setEditingId(row.id);
      setForm({
        business_name: row.business_name || "",
        description: row.description || "",
        address: row.address || "",
        contact_name: row.contact_name || "",
        phone: row.phone || "",
        email: row.email || "",
        logo_url: row.logo_url || "",
      });
    } else {
      setEditingId(null);
      setForm({ business_name: "", description: "", address: "", contact_name: "", phone: "", email: "", logo_url: "" });
    }
    setShowForm(true);
  };

  const onPickLogo = () => {
    fileInputRef.current?.click();
  };

  const onLogoSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file");
      return;
    }
    const fd = new FormData();
    fd.append("logo", file);
    fetch(`${API}/api/business-cards/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: fd,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Upload failed");
        const data = await r.json();
        setForm((p) => ({ ...p, logo_url: data.url }));
      })
      .catch(() => alert("Upload failed"));
  };

  const saveCard = async () => {
    if (!form.business_name.trim()) return alert("Business name is required");
    setSaving(true);
    try {
      const payload = { ...form };
      const url = editingId ? `${API}/api/business-cards/${editingId}` : `${API}/api/business-cards`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed to save");
        return;
      }
      setShowForm(false);
      setEditingId(null);
      await fetchRows();
    } finally {
      setSaving(false);
    }
  };

  const shareCard = async (id: string) => {
    const el = cardRefs.current[id];
    if (!el || sharingId) return;
    setSharingId(id);
    const actions = el.querySelector("[data-card-actions]") as HTMLElement | null;
    const prevDisplay = actions?.style.display;
    if (actions) {
      actions.style.display = "none"; // hide Edit/Share buttons in capture
      // allow layout to settle without the actions row
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png", 0.95)
      );
      const file = new File([blob], `card-${id}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: any) => boolean; share?: (data: any) => Promise<void>; };

      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "Business Card",
          text: "Shared from AK Fabrics",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `card-${id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        alert("Sharing isn't supported here. The card image was downloaded—attach it in WhatsApp.");
      }
    } catch (err) {
      console.error("Share failed", err);
      alert("Couldn't prepare the card image. Please try again.");
    } finally {
      if (actions) actions.style.display = prevDisplay || "";
      setSharingId(null);
    }
  };

  // Print a single card only
  const printCard = async (id: string) => {
    setPrintingId(id);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const afterPrint = () => setPrintingId(null);
    window.addEventListener("afterprint", afterPrint, { once: true });
    window.print();
    // fallback in case afterprint doesn't fire
    setTimeout(() => setPrintingId((p) => (p === id ? null : p)), 1500);
  };

  const logoPreview = logoSrc(form.logo_url);

  return (
    <div className="space-y-5">
      {/* Print styles: hide action bar when printing and keep cards intact */}
      <style>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .print-target, .print-target * { visibility: visible !important; }
          .print-target {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: min(180mm, 95vw) !important; /* big card preview (not tiny on A4) */
            margin: 0 !important;
            page-break-inside: avoid;
          }
          [data-card-actions] { display: none !important; }
          body { background: #fff; }
        }
      `}</style>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Cards</h1>
          <p className="text-slate-500 text-sm mt-1">Create and share mobile-friendly digital visiting cards.</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm"
        >
          <Plus className="w-4 h-4" /> New Card
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search business / contact / phone..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-sm text-slate-500">{filtered.length} / {rows.length}</div>
      </div>

      {/* cards grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No business cards yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              ref={(el) => { cardRefs.current[r.id] = el; }}
              className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col card-print ${printingId === r.id ? "print-target" : ""}`}
            >
              <div className="p-4 bg-gradient-to-r from-sky-100 to-sky-50 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                    <img src={logoSrc(r.logo_url)} alt="logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Business Card</div>
                    <div className="font-semibold text-slate-900 leading-tight">{r.business_name}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <div className="flex items-center gap-1 text-slate-700 font-medium"><Phone className="w-4 h-4" /> {r.phone || "NA"}</div>
                  <div className="flex items-center gap-1 text-slate-700"><Mail className="w-4 h-4" /> {r.email || "NA"}</div>
                </div>
              </div>
              <div className="p-4 flex-1 pb-6">
                <div className="text-center mb-3">
                  <div className="font-bold text-lg text-slate-900">{r.contact_name || r.business_name}</div>
                  <div className="text-slate-600 text-sm">{r.description || "—"}</div>
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-700 text-sm mb-3">
                  <MapPin className="w-4 h-4" /> <span className="truncate">{r.address || "No address"}</span>
                </div>
              </div>
              <div className="p-4 flex gap-2" data-card-actions>
                <button onClick={() => openForm(r)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 text-sm">
                  <Edit2 className="w-4 h-4 inline mr-2" /> Edit
                </button>
                <button
                  onClick={() => printCard(r.id)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 text-sm"
                >
                  <Printer className="w-4 h-4 inline mr-2" /> Print
                </button>
                <button
                  onClick={() => shareCard(r.id)}
                  disabled={sharingId === r.id}
                  className="flex-1 px-3 py-2 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 text-sm disabled:opacity-70"
                >
                  <Share2 className="w-4 h-4 inline mr-2" /> {sharingId === r.id ? "Preparing..." : "Share"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="font-bold text-lg text-slate-900">{editingId ? "Edit Business Card" : "New Business Card"}</div>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Logo URL</label>
                  <div className="flex gap-2">
                    <input
                      value={form.logo_url}
                      onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onLogoSelected}
                    />
                    <button type="button" onClick={onPickLogo} className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700" title="Upload image">
                      <UploadCloud className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setForm((p) => ({ ...p, logo_url: "" }))} className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700" title="Clear">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input value={form.business_name} onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))} placeholder="Business Name" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short Description" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                <input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} placeholder="Contact Name" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
              <button onClick={saveCard} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessCards;
