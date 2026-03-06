import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/library";
import { ScanLine, Camera, Keyboard, X, CheckCircle, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

// ─── Barcode Scanner Modal ───────────────────────────────────────────────────
const BarcodeScanner: React.FC<{ onClose: () => void; onFound: (id: string) => void }> = ({ onClose, onFound }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const usbInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"choose" | "camera" | "usb">("choose");
  const [usbInput, setUsbInput] = useState("");
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [scannedInvoice, setScannedInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchInvoice = async (code: string) => {
    setLoading(true);
    setStatus("scanning");
    try {
      const res = await fetch(`${API}/api/purchases/barcode/${code.trim()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Invoice not found for: " + code.trim());
      const data = await res.json();
      setScannedInvoice(data);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Camera mode
  useEffect(() => {
    if (mode !== "camera") return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setStatus("scanning");
    reader.listVideoInputDevices().then((devices) => {
      const deviceId = devices[0]?.deviceId;
      reader.decodeFromVideoDevice(deviceId ?? null, videoRef.current!, (result) => {
        if (result) {
          reader.reset();
          setMode("choose");
          fetchInvoice(result.getText());
        }
      });
    });
    return () => { reader.reset(); };
  }, [mode]);

  // USB auto-focus
  useEffect(() => {
    if (mode === "usb") setTimeout(() => usbInputRef.current?.focus(), 100);
  }, [mode]);

  const reset = () => {
    setStatus("idle"); setScannedInvoice(null);
    setErrorMsg(""); setUsbInput(""); setMode("choose");
  };

  const handleNavigate = (purchaseId: string) => {
    onFound(purchaseId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,8,23,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "#0f172a", border: "1px solid rgba(99,102,241,0.3)" }}>

        {/* Rainbow top bar */}
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4,#6366f1)" }} />

        {/* Header */}
        <div className="flex justify-between items-center px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.2)" }}>
              <ScanLine className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Scan Bill</h2>
              <p className="text-slate-500 text-xs mt-0.5">Scan barcode to lookup invoice</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 pb-7 space-y-4">

          {/* Mode Choose */}
          {mode === "choose" && status !== "success" && status !== "error" && !loading && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { m: "camera" as const, icon: <Camera className="w-7 h-7 text-indigo-400" />, label: "Camera Scan", sub: "Use webcam or phone camera", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.2)", hover: "#6366f1" },
                { m: "usb" as const, icon: <Keyboard className="w-7 h-7 text-cyan-400" />, label: "USB Scanner", sub: "Barcode gun or type manually", bg: "rgba(6,182,212,0.06)", border: "rgba(6,182,212,0.2)", hover: "#06b6d4" },
              ].map(({ m, icon, label, sub, bg, border, hover }) => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex flex-col items-center gap-3 p-8 rounded-2xl border transition-all"
                  style={{ background: bg, borderColor: border }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = hover)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: bg.replace("0.06", "0.15") }}>{icon}</div>
                  <div className="text-center">
                    <p className="text-white font-semibold">{label}</p>
                    <p className="text-slate-500 text-xs mt-1">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Camera View */}
          {mode === "camera" && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black"
                style={{ border: "2px solid rgba(99,102,241,0.4)" }}>
                <video ref={videoRef} className="w-full h-64 object-cover" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-8 right-8 h-0.5 bg-indigo-400"
                    style={{ animation: "scanline 2s ease-in-out infinite", top: "50%", boxShadow: "0 0 8px #6366f1" }} />
                  {[["top-4","left-4"],["top-4","right-4"],["bottom-4","left-4"],["bottom-4","right-4"]].map(([v,h],i) => (
                    <div key={i} className={`absolute w-6 h-6 ${v} ${h}`} style={{
                      borderTop: i < 2 ? "2px solid #6366f1" : "none",
                      borderBottom: i >= 2 ? "2px solid #6366f1" : "none",
                      borderLeft: i % 2 === 0 ? "2px solid #6366f1" : "none",
                      borderRight: i % 2 === 1 ? "2px solid #6366f1" : "none",
                    }} />
                  ))}
                </div>
              </div>
              <p className="text-center text-slate-400 text-sm">Point camera at the barcode on the invoice</p>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">← Back</button>
              <style>{`@keyframes scanline{0%,100%{top:20%}50%{top:80%}}`}</style>
            </div>
          )}

          {/* USB / Manual */}
          {mode === "usb" && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <p className="text-slate-400 text-sm mb-3">Scan with USB barcode gun OR type the invoice number:</p>
                <form onSubmit={e => { e.preventDefault(); if (usbInput.trim()) fetchInvoice(usbInput.trim()); }}
                  className="flex gap-3">
                  <input ref={usbInputRef} value={usbInput} onChange={e => setUsbInput(e.target.value)}
                    placeholder="e.g. PUR0000006" className="flex-1 px-4 py-3 rounded-xl text-white placeholder:text-slate-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(6,182,212,0.3)" }} />
                  <button type="submit" className="px-5 py-3 rounded-xl font-semibold text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}>Search</button>
                </form>
              </div>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">← Back</button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Looking up invoice...</p>
            </div>
          )}

          {/* Error */}
          {status === "error" && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 font-semibold">Invoice Not Found</p>
                  <p className="text-red-500/70 text-sm">{errorMsg}</p>
                </div>
              </div>
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-white font-medium text-sm"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>Try Again</button>
            </div>
          )}

          {/* Success */}
          {status === "success" && scannedInvoice && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Invoice Found!</span>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.25)" }}>
                {/* Vendor + Invoice Info */}
                <div className="px-5 py-4 flex justify-between" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <div>
                    <p className="text-white font-bold">{scannedInvoice.vendor_name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{scannedInvoice.vendor_address}</p>
                    <p className="text-slate-500 text-xs">{scannedInvoice.vendor_phone}</p>
                    <p className="text-slate-500 text-xs font-mono">{scannedInvoice.vendor_gstin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-mono font-bold text-sm">{scannedInvoice.invoice_no}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(scannedInvoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                        {["S.No","HSN","Size","Description","Rate","Qty","Amount"].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(scannedInvoice.items || []).map((item: any, i: number) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 text-slate-400 font-mono">{item.hsn || "--"}</td>
                          <td className="px-3 py-2 text-slate-300">{item.size}</td>
                          <td className="px-3 py-2 text-slate-300">{item.description}</td>
                          <td className="px-3 py-2 text-slate-300">₹{Number(item.rate).toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-300">{item.quantity}</td>
                          <td className="px-3 py-2 text-white font-semibold">₹{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="px-5 py-3 flex justify-between items-center"
                  style={{ background: "rgba(99,102,241,0.08)", borderTop: "1px solid rgba(99,102,241,0.2)" }}>
                  <span className="text-slate-400 text-sm">Grand Total</span>
                  <span className="text-white font-bold text-lg">
                    ₹{(scannedInvoice.items || []).reduce((s: number, i: any) => s + Number(i.total), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                  Scan Another
                </button>
                <button onClick={() => handleNavigate(scannedInvoice.id)}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  Open Full Invoice →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const PurchaseInvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  const fetchInvoice = async (purchaseId: string) => {
    const res = await fetch(`${API}/api/purchases/${purchaseId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setPurchase(await res.json());
  };

  useEffect(() => { if (id) fetchInvoice(id); }, [id]);

  // When scanner finds a bill, navigate to it (or load it directly)
  const handleScanFound = (foundId: string) => {
    navigate(`/purchase-invoice/${foundId}`);
  };

  if (!purchase) return <div className="p-10 text-gray-500">Loading...</div>;

  const items = purchase.items || [];
  const total = items.reduce((sum: number, item: any) => sum + Number(item.total), 0);

  return (
    <div className="p-10 max-w-5xl mx-auto bg-white">

      {/* Top action bar */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">
          ← Back
        </button>

        {/* Scan Bill removed - moved to main purchase page */}
      </div>

      <h2 className="text-2xl font-bold mb-4">Purchase Invoice</h2>

      {/* Header Section */}
      <div className="border p-6 mb-6 rounded-lg">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <p><b>Vendor Name:</b> {purchase.vendor_name}</p>
            <p><b>Address:</b> {purchase.vendor_address}</p>
            <p><b>Phone:</b> {purchase.vendor_phone}</p>
            <p><b>GST No:</b> {purchase.vendor_gstin}</p>
          </div>
          <div className="space-y-2 text-sm text-right">
            <p><b>Purchase ID:</b> {purchase.invoice_no}</p>
            <p><b>Date:</b> {new Date(purchase.created_at).toLocaleDateString()}</p>
            <p><b>Time:</b> {new Date(purchase.created_at).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">S.No</th>
            <th className="border p-2">HSN</th>
            <th className="border p-2">Size</th>
            <th className="border p-2">Description</th>
            <th className="border p-2 text-right">Rate</th>
            <th className="border p-2 text-right">Qty</th>
            <th className="border p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, index: number) => (
            <tr key={index}>
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2 text-center">{item.hsn}</td>
              <td className="border p-2 text-center">{item.size}</td>
              <td className="border p-2">{item.description}</td>
              <td className="border p-2 text-right">₹{item.rate}</td>
              <td className="border p-2 text-right">{item.quantity}</td>
              <td className="border p-2 text-right">₹{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <div className="text-xl font-bold">Total: ₹ {total.toLocaleString()}</div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onFound={handleScanFound}
        />
      )}
    </div>
  );
};

export default PurchaseInvoicePage;