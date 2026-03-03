// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, Keyboard, ScanLine, CheckCircle, AlertCircle } from 'lucide-react';

interface ScannedInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  vendor: { name: string; gstin: string; address: string; phone: string };
  items: { sno: number; hsn: string; size: string; description: string; rate: number; qty: number; amount: number }[];
  total: number;
}

interface BarcodeScannerProps {
  onClose: () => void;
  apiUrl: string;
  token: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onClose, apiUrl, token }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [mode, setMode] = useState<'choose' | 'camera' | 'usb'>('choose');
  const [usbInput, setUsbInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [invoice, setInvoice] = useState<ScannedInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const usbInputRef = useRef<HTMLInputElement>(null);

  // Fetch invoice by barcode/invoice number
  const fetchInvoice = async (code: string) => {
    setLoading(true);
    setStatus('scanning');
    try {
      const res = await fetch(`${apiUrl}/api/purchases/barcode/${code.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      setInvoice(data);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invoice not found');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Camera scanning
  useEffect(() => {
    if (mode !== 'camera') return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setStatus('scanning');

    reader.listVideoInputDevices().then(devices => {
      const deviceId = devices[0]?.deviceId;
      reader.decodeFromVideoDevice(deviceId ?? null, videoRef.current!, (result, err) => {
        if (result) {
          reader.reset();
          fetchInvoice(result.getText());
          setMode('choose');
        }
      });
    });

    return () => { reader.reset(); };
  }, [mode]);

  // USB scanner — auto-focus input
  useEffect(() => {
    if (mode === 'usb') {
      setTimeout(() => usbInputRef.current?.focus(), 100);
    }
  }, [mode]);

  const handleUsbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usbInput.trim()) fetchInvoice(usbInput.trim());
  };

  const reset = () => {
    setStatus('idle');
    setInvoice(null);
    setErrorMsg('');
    setUsbInput('');
    setMode('choose');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 8, 23, 0.85)', backdropFilter: 'blur(8px)' }}>

      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)' }}>

        {/* Top bar */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #6366f1, #06b6d4, #6366f1)' }} />

        {/* Header */}
        <div className="flex justify-between items-center px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.2)' }}>
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

        <div className="px-7 pb-7">

          {/* MODE CHOOSE */}
          {mode === 'choose' && status !== 'success' && status !== 'error' && (
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setMode('camera')}
                className="group flex flex-col items-center gap-3 p-8 rounded-2xl border transition-all"
                style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)')}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Camera className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Camera Scan</p>
                  <p className="text-slate-500 text-xs mt-1">Use webcam or phone camera</p>
                </div>
              </button>

              <button onClick={() => setMode('usb')}
                className="group flex flex-col items-center gap-3 p-8 rounded-2xl border transition-all"
                style={{ background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#06b6d4')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)')}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(6,182,212,0.15)' }}>
                  <Keyboard className="w-7 h-7 text-cyan-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">USB Scanner</p>
                  <p className="text-slate-500 text-xs mt-1">Physical barcode gun / type manually</p>
                </div>
              </button>
            </div>
          )}

          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black"
                style={{ border: '2px solid rgba(99,102,241,0.4)' }}>
                <video ref={videoRef} className="w-full h-64 object-cover" />
                {/* Scan line animation */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-8 right-8 h-0.5 bg-indigo-400 opacity-80"
                    style={{ animation: 'scanline 2s ease-in-out infinite', top: '50%',
                      boxShadow: '0 0 8px #6366f1' }} />
                  {/* Corner brackets */}
                  {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
                    <div key={i} className={`absolute w-6 h-6 ${pos}`}
                      style={{
                        borderTop: i < 2 ? '2px solid #6366f1' : 'none',
                        borderBottom: i >= 2 ? '2px solid #6366f1' : 'none',
                        borderLeft: i % 2 === 0 ? '2px solid #6366f1' : 'none',
                        borderRight: i % 2 === 1 ? '2px solid #6366f1' : 'none',
                      }} />
                  ))}
                </div>
              </div>
              <p className="text-center text-slate-400 text-sm">Point camera at the barcode on the invoice</p>
              <button onClick={reset}
                className="w-full py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                ← Back
              </button>
              <style>{`@keyframes scanline { 0%,100%{top:20%} 50%{top:80%} }`}</style>
            </div>
          )}

          {/* USB / MANUAL MODE */}
          {mode === 'usb' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <p className="text-slate-400 text-sm mb-3">
                  Scan with USB barcode gun OR type the invoice number manually:
                </p>
                <form onSubmit={handleUsbSubmit} className="flex gap-3">
                  <input
                    ref={usbInputRef}
                    value={usbInput}
                    onChange={e => setUsbInput(e.target.value)}
                    placeholder="e.g. PUR0000006"
                    className="flex-1 px-4 py-3 rounded-xl text-white placeholder:text-slate-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.3)' }}
                  />
                  <button type="submit"
                    className="px-5 py-3 rounded-xl font-semibold text-sm text-white transition"
                    style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
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

          {/* LOADING */}
          {loading && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Looking up invoice...</p>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 font-semibold">Invoice Not Found</p>
                  <p className="text-red-500/70 text-sm">{errorMsg}</p>
                </div>
              </div>
              <button onClick={reset}
                className="w-full py-2.5 rounded-xl text-white font-medium text-sm transition"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                Try Again
              </button>
            </div>
          )}

          {/* SUCCESS - Invoice Modal */}
          {status === 'success' && invoice && !loading && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm">Invoice Found!</span>
              </div>

              {/* Invoice Card */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
                {/* Invoice Header */}
                <div className="px-5 py-4 flex justify-between"
                  style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <div>
                    <p className="text-white font-bold text-base">{invoice.vendor?.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{invoice.vendor?.address}</p>
                    {invoice.vendor?.phone && <p className="text-slate-500 text-xs">{invoice.vendor.phone}</p>}
                    {invoice.vendor?.gstin && <p className="text-slate-500 text-xs font-mono">{invoice.vendor.gstin}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-mono font-bold text-sm">{invoice.invoiceNo}</p>
                    <p className="text-slate-500 text-xs mt-1">{invoice.date}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {['S.No', 'HSN', 'Size', 'Description', 'Rate', 'Qty', 'Amount'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items?.map((item, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="px-3 py-2.5 text-slate-400">{item.sno || i + 1}</td>
                          <td className="px-3 py-2.5 text-slate-400 font-mono">{item.hsn || '--'}</td>
                          <td className="px-3 py-2.5 text-slate-300">{item.size}</td>
                          <td className="px-3 py-2.5 text-slate-300">{item.description}</td>
                          <td className="px-3 py-2.5 text-slate-300">₹{item.rate?.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-slate-300">{item.qty}</td>
                          <td className="px-3 py-2.5 text-white font-semibold">₹{item.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="px-5 py-3 flex justify-end"
                  style={{ background: 'rgba(99,102,241,0.08)', borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                  <span className="text-slate-400 text-sm mr-4">Total</span>
                  <span className="text-white font-bold text-lg">₹{invoice.total?.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 py-2.5 rounded-xl text-slate-400 border border-slate-700 hover:border-slate-500 transition text-sm">
                  Scan Another
                </button>
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;