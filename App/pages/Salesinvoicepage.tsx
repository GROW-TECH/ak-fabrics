import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ScanLine, Camera, Keyboard, X, CheckCircle, AlertCircle } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

const API = import.meta.env.VITE_API_URL;

const SalesInvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  const fetchSale = async (saleId: string) => {
    const res = await fetch(`${API}/api/sales/${saleId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setSale(await res.json());
  };

  useEffect(() => { if (id) fetchSale(id); }, [id]);

  const handleDownload = async () => {
    const res = await fetch(`${API}/api/sales/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) return alert("Download failed");
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${sale?.invoice_no || "sales-invoice"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleScanFound = (foundId: string) => {
    navigate(`/sales/${foundId}`);
  };

  if (!sale) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const items = sale.items || [];
  const total = items.reduce((sum: number, item: any) => sum + Number(item.total), 0);

  const statusColors: Record<string, string> = {
    PAID:      "bg-emerald-100 text-emerald-700",
    NOT_PAID:  "bg-red-100 text-red-700",
    HALF_PAID: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="p-10 max-w-5xl mx-auto bg-white">

      {/* Top action bar */}
      <div className="flex justify-between items-center mb-6 gap-3">
        <button onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">
          ← Back
        </button>

        <div className="flex gap-2">
          {/* Scan Bill removed - moved to main sales page */}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Sales Invoice</h2>

      {/* Header Section */}
      <div className="border p-6 mb-6 rounded-lg">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <p><b>Customer Name:</b> {sale.customer_name}</p>
            <p><b>Address:</b> {sale.customer_address || "—"}</p>
            <p><b>Phone:</b> {sale.customer_phone || "—"}</p>
            <p><b>GST No:</b> {sale.customer_gstin || "—"}</p>
            {sale.through_agent && <p><b>Through:</b> {sale.through_agent}</p>}
          </div>
          <div className="space-y-2 text-sm text-right">
            <p><b>Invoice ID:</b> {sale.invoice_no}</p>
            <p><b>Date:</b> {new Date(sale.created_at).toLocaleDateString()}</p>
            <p><b>Time:</b> {new Date(sale.created_at).toLocaleTimeString()}</p>
            <p><b>Payment:</b> {sale.payment_mode}</p>
            <p>
              <b>Status:</b>{" "}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[sale.status] || "bg-slate-100"}`}>
                {(sale.status || "—").replace("_", " ")}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">S.No</th>
            <th className="border p-2">HSN</th>
            <th className="border p-2">Size</th>
            <th className="border p-2">Description</th>
            <th className="border p-2 text-right">Rate</th>
            <th className="border p-2 text-right">Qty</th>
            <th className="border p-2 text-right">Disc%</th>
            <th className="border p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, index: number) => (
            <tr key={index}>
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2 text-center">{item.hsn || "—"}</td>
              <td className="border p-2 text-center">{item.size || "—"}</td>
              <td className="border p-2">{item.description}</td>
              <td className="border p-2 text-right">₹{item.rate}</td>
              <td className="border p-2 text-right">{item.quantity}</td>
              <td className="border p-2 text-right">{item.discount || 0}%</td>
              <td className="border p-2 text-right">₹{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Grand Total</span>
            <span className="font-bold text-xl">₹{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Paid</span>
            <span className="font-semibold">₹{Number(sale.paid_amount || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-red-500 border-t pt-2">
            <span>Balance Due</span>
            <span className="font-bold">₹{Number(sale.balance_amount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {sale.payments?.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-slate-700 mb-3">Payment History</h3>
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Date</th>
                <th className="border p-2 text-right">Amount</th>
                <th className="border p-2">Mode</th>
                <th className="border p-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {sale.payments.map((pay: any, i: number) => (
                <tr key={i}>
                  <td className="border p-2">{new Date(pay.paid_at).toLocaleDateString()}</td>
                  <td className="border p-2 text-right font-semibold text-emerald-700">₹{Number(pay.amount).toLocaleString()}</td>
                  <td className="border p-2">{pay.payment_mode}</td>
                  <td className="border p-2 text-gray-500">{pay.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onFound={handleScanFound}
        />
      )}
    </div>
  );
};

/* ── Inline Scanner Modal (reused from PurchaseInvoicePage) ─────────────── */
const ScannerModal: React.FC<{ onClose: () => void; onFound: (id: string) => void }> = ({ onClose, onFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const usbInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"choose" | "camera" | "usb">("choose");
  const [usbInput, setUsbInput] = useState("");
  const [status, setStatus] = useState<"idle"|"scanning"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [scannedSale, setScannedSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchByBarcode = async (code: string) => {
    setLoading(true); setStatus("scanning");
    try {
      const res = await fetch(`${API}/api/sales/barcode/${code.trim()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Invoice not found: " + code.trim());
      setScannedSale(await res.json());
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message); setStatus("error");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (mode !== "camera") return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    reader.listVideoInputDevices().then(devices => {
      reader.decodeFromVideoDevice(devices[0]?.deviceId ?? null, videoRef.current!, result => {
        if (result) { reader.reset(); setMode("choose"); fetchByBarcode(result.getText()); }
      });
    });
    return () => { reader.reset(); };
  }, [mode]);

  useEffect(() => { if (mode === "usb") setTimeout(() => usbInputRef.current?.focus(), 100); }, [mode]);

  const reset = () => { setStatus("idle"); setScannedSale(null); setErrorMsg(""); setUsbInput(""); setMode("choose"); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,8,23,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "#0f172a", border: "1px solid rgba(99,102,241,0.3)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4)" }} />
        <div className="flex justify-between items-center px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
              <ScanLine className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Scan Bill</h2>
              <p className="text-slate-500 text-xs mt-0.5">Scan barcode to lookup sales invoice</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 pb-7 space-y-4">
          {mode === "choose" && status !== "success" && status !== "error" && !loading && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { m: "camera" as const, icon: <Camera className="w-7 h-7 text-indigo-400" />, label: "Camera Scan", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.2)", hover: "#6366f1" },
                { m: "usb" as const, icon: <Keyboard className="w-7 h-7 text-cyan-400" />, label: "USB / Manual", bg: "rgba(6,182,212,0.06)", border: "rgba(6,182,212,0.2)", hover: "#06b6d4" },
              ].map(({ m, icon, label, bg, border, hover }) => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all"
                  style={{ background: bg, borderColor: border }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = hover)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg.replace("0.06","0.15") }}>{icon}</div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                </button>
              ))}
            </div>
          )}

          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ border: "2px solid rgba(99,102,241,0.4)" }}>
                <video ref={videoRef} className="w-full h-56 object-cover" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-8 right-8 h-0.5 bg-indigo-400" style={{ animation: "scanline 2s ease-in-out infinite", top:"50%", boxShadow:"0 0 8px #6366f1" }} />
                </div>
              </div>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">← Back</button>
              <style>{`@keyframes scanline{0%,100%{top:20%}50%{top:80%}}`}</style>
            </div>
          )}

          {mode === "usb" && (
            <div className="space-y-3">
              <form onSubmit={e => { e.preventDefault(); if (usbInput.trim()) fetchByBarcode(usbInput.trim()); }}
                className="flex gap-3">
                <input ref={usbInputRef} value={usbInput} onChange={e => setUsbInput(e.target.value)}
                  placeholder="e.g. SAL0000001"
                  className="flex-1 px-4 py-3 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(6,182,212,0.3)" }} />
                <button type="submit" className="px-5 py-3 rounded-xl font-semibold text-sm text-white"
                  style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}>Search</button>
              </form>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">← Back</button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Looking up invoice...</p>
            </div>
          )}

          {status === "error" && !loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)" }}>
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 font-semibold">Not Found</p>
                  <p className="text-red-500/70 text-sm">{errorMsg}</p>
                </div>
              </div>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-white font-medium text-sm"
                style={{ background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.3)" }}>Try Again</button>
            </div>
          )}

          {status === "success" && scannedSale && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Invoice Found!</span>
              </div>
              <div className="p-4 rounded-2xl" style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)" }}>
                <p className="text-white font-bold">{scannedSale.customer_name}</p>
                <p className="text-indigo-400 font-mono text-sm">{scannedSale.invoice_no}</p>
                <p className="text-slate-400 text-xs mt-1">Total: ₹{Number(scannedSale.total_amount).toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm">Scan Another</button>
                <button onClick={() => { onFound(scannedSale.id); onClose(); }}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  Open Invoice →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesInvoicePage;