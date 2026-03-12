import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Truck, Eye, X, MapPin, Printer, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface EwayBill {
  id: number;
  sale_id: number;
  eway_bill_no: string;
  generated_date: string;
  valid_from: string;
  valid_until: string;
  distance_km: number;
  transport_mode: string;
  vehicle_number?: string;
  transporter_name?: string;
  transporter_id?: string;
  from_state?: string;
  to_state?: string;
  from_pincode?: string;
  to_pincode?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  invoice_no?: string;
  customer_name?: string;
  total_amount?: number;
  sale_date?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_gstin?: string;
}

const API = import.meta.env.VITE_API_URL;
const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN');

const STATUS_CONFIG = {
  ACTIVE:    { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  EXPIRED:   { color: 'text-red-600 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: XCircle    },
  CANCELLED: { color: 'text-gray-500 bg-gray-100 border-gray-200',         dot: 'bg-gray-400',    icon: XCircle    },
};

const EwayBills: React.FC = () => {
  const [ewayBills, setEwayBills]             = useState<EwayBill[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [showSearch, setShowSearch]           = useState(false);
  const [statusFilter, setStatusFilter]       = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [selectedBill, setSelectedBill]       = useState<EwayBill | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => { fetchEwayBills(); }, []);

  const fetchEwayBills = async () => {
    try {
      const res = await fetch(`${API}/api/eway-bills`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setEwayBills(await res.json());
    } catch (e) {
      console.error('Failed to fetch E-way bills:', e);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  const filteredBills = ewayBills
    .map(b => isExpired(b.valid_until) && b.status === 'ACTIVE' ? { ...b, status: 'EXPIRED' as const } : b)
    .filter(b => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        b.eway_bill_no.toLowerCase().includes(q) ||
        (b.customer_name || '').toLowerCase().includes(q) ||
        (b.invoice_no || '').toLowerCase().includes(q) ||
        (b.vehicle_number || '').toLowerCase().includes(q);
      return matchSearch && (statusFilter === 'ALL' || b.status === statusFilter);
    });

  const handlePrint = (bill: EwayBill) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>E-way Bill ${bill.eway_bill_no}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111;}
        h1{font-size:20px;margin-bottom:4px;}
        .sub{color:#666;font-size:13px;margin-bottom:24px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
        .section{border:1px solid #e5e7eb;border-radius:8px;padding:16px;}
        .section h2{font-size:13px;font-weight:700;margin-bottom:12px;color:#374151;text-transform:uppercase;letter-spacing:.05em;}
        .row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;}
        .label{color:#6b7280;} .val{font-weight:600;}
        .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;
          background:${bill.status==='ACTIVE'?'#ecfdf5':'#fef2f2'};color:${bill.status==='ACTIVE'?'#065f46':'#991b1b'};}
        @media print{body{padding:16px;}}
      </style></head><body>
      <h1>E-way Bill</h1>
      <div class="sub">Bill No: <strong>${bill.eway_bill_no}</strong> &nbsp;|&nbsp; <span class="badge">${bill.status}</span></div>
      <div class="grid">
        <div class="section"><h2>Bill Info</h2>
          <div class="row"><span class="label">Generated</span><span class="val">${new Date(bill.generated_date).toLocaleString('en-IN')}</span></div>
          <div class="row"><span class="label">Valid Until</span><span class="val">${new Date(bill.valid_until).toLocaleString('en-IN')}</span></div>
          <div class="row"><span class="label">Invoice No</span><span class="val">${bill.invoice_no||'—'}</span></div>
          <div class="row"><span class="label">Amount</span><span class="val">₹${fmt(bill.total_amount||0)}</span></div>
        </div>
        <div class="section"><h2>Transport</h2>
          <div class="row"><span class="label">Mode</span><span class="val">${bill.transport_mode}</span></div>
          <div class="row"><span class="label">Vehicle No</span><span class="val">${bill.vehicle_number||'—'}</span></div>
          <div class="row"><span class="label">Transporter</span><span class="val">${bill.transporter_name||'—'}</span></div>
        </div>
        <div class="section"><h2>Route</h2>
          <div class="row"><span class="label">From</span><span class="val">${bill.from_state||'—'} ${bill.from_pincode?`- ${bill.from_pincode}`:''}</span></div>
          <div class="row"><span class="label">To</span><span class="val">${bill.to_state||'—'} ${bill.to_pincode?`- ${bill.to_pincode}`:''}</span></div>
        </div>
        <div class="section"><h2>Customer</h2>
          <div class="row"><span class="label">Name</span><span class="val">${bill.customer_name||'—'}</span></div>
          <div class="row"><span class="label">Phone</span><span class="val">${bill.customer_phone||'—'}</span></div>
          <div class="row"><span class="label">GSTIN</span><span class="val">${bill.customer_gstin||'—'}</span></div>
        </div>
      </div></body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const openDetail = (bill: EwayBill) => { setSelectedBill(bill); setShowDetailModal(true); };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const counts = {
    ALL:       ewayBills.length,
    ACTIVE:    ewayBills.filter(b => b.status === 'ACTIVE' && !isExpired(b.valid_until)).length,
    EXPIRED:   ewayBills.filter(b => b.status === 'EXPIRED' || (b.status==='ACTIVE' && isExpired(b.valid_until))).length,
    CANCELLED: ewayBills.filter(b => b.status === 'CANCELLED').length,
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <Truck className="w-7 h-7 text-blue-300" />
      </div>
      <p className="text-gray-500 font-semibold text-sm">
        {searchQuery ? 'No results found' : 'No E-way bills yet'}
      </p>
      <p className="text-gray-400 text-xs text-center px-8">
        {searchQuery ? `No bills match "${searchQuery}"` : 'Bills are auto-generated for sales over ₹50,000'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9]">

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on md+)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Fixed mobile header */}
        <div className="fixed inset-x-0 top-0 z-50">
          <div className="bg-[#1565c0] text-white px-3 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => history.back()} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 opacity-80" />
                <span className="font-bold text-sm tracking-wide">E-WAY BILLS</span>
              </div>
              <button onClick={() => { setShowSearch(v => !v); setSearchQuery(''); }} className="p-1">
                <Search className="w-5 h-5 opacity-80" />
              </button>
            </div>

            {showSearch && (
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 mb-2">
                <Search className="w-4 h-4 opacity-70 flex-shrink-0" />
                <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search bill no, customer, vehicle…"
                  className="flex-1 bg-transparent text-white placeholder-white/60 text-[13px] outline-none" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white/70 font-bold text-xs">✕</button>}
              </div>
            )}

            <div className="grid grid-cols-4 gap-1">
              {(['ALL','ACTIVE','EXPIRED','CANCELLED'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-semibold rounded-full py-1 px-1 transition-all ${statusFilter===s ? 'bg-white text-[#1565c0] shadow' : 'bg-white/20 text-white'}`}>
                  {s} <span className="opacity-70">({counts[s]})</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[1fr_80px_64px_44px] text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 bg-gray-100 border-b border-gray-200 text-gray-500">
            <span>Bill / Customer</span>
            <span className="text-center">Date</span>
            <span className="text-right">Amount</span>
            <span className="text-center">Act</span>
          </div>
        </div>

        {/* Mobile list */}
        <div className="pt-[118px] pb-6">
          {filteredBills.length === 0 ? <EmptyState /> : (
            <div className="bg-white">
              {filteredBills.map((bill, idx) => {
                const cfg = STATUS_CONFIG[bill.status] || STATUS_CONFIG.CANCELLED;
                return (
                  <div key={bill.id} className={`flex items-center gap-2 px-3 py-3 border-b border-gray-100 ${idx%2===0?'bg-white':'bg-gray-50/50'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold text-blue-700 font-mono truncate">{bill.eway_bill_no}</p>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>{bill.status}</span>
                      </div>
                      <p className="text-[11px] text-gray-700 font-medium truncate">{bill.customer_name||'—'}</p>
                      <p className="text-[10px] text-gray-400 truncate">Inv: {bill.invoice_no||'—'} </p>
                    </div>
                    <div className="text-center w-[80px] flex-shrink-0">
                      <p className="text-[11px] font-semibold text-gray-700">{new Date(bill.generated_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</p>
                      <p className="text-[10px] text-gray-400">{new Date(bill.generated_date).getFullYear()}</p>
                      <p className="text-[10px] text-gray-500 font-semibold">₹{fmt(bill.total_amount||0)}</p>
                    </div>
                    <div className="flex flex-col gap-1 w-[44px] items-center flex-shrink-0">
                      <button onClick={() => openDetail(bill)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 active:bg-blue-100">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handlePrint(bill)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden on mobile)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* Desktop header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => history.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">E-way Bills</h1>
                    <p className="text-xs text-gray-500">Electronic way bill management</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status tabs */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                  {(['ALL','ACTIVE','EXPIRED','CANCELLED'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter===s ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {s} <span className="ml-0.5 opacity-60">({counts[s]})</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search bills…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {filteredBills.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <EmptyState />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-[200px_140px_180px_120px_160px_130px_100px] gap-0 px-5 py-3 bg-gray-50 border-b border-gray-200">
                {['E-way Bill No.','Date','Customer','Amount','Valid Until','Status','Actions'].map(h => (
                  <div key={h} className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</div>
                ))}
              </div>

              {/* Table rows */}
              {filteredBills.map((bill, idx) => {
                const cfg = STATUS_CONFIG[bill.status] || STATUS_CONFIG.CANCELLED;
                const Icon = cfg.icon;
                return (
                  <div key={bill.id}
                    className={`grid grid-cols-[200px_140px_180px_120px_160px_130px_100px] gap-0 px-5 py-4 border-b border-gray-100 items-center hover:bg-blue-50/30 transition-colors ${idx%2===1?'bg-gray-50/30':''}`}>

                    {/* Bill No */}
                    <div>
                      <p className="font-mono text-sm font-bold text-blue-600">{bill.eway_bill_no}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Inv: {bill.invoice_no||'—'}</p>
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{new Date(bill.generated_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
                      <p className="text-xs text-gray-400">{new Date(bill.generated_date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p>
                    </div>

                    {/* Customer */}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{bill.customer_name||'—'}</p>
                      <p className="text-xs text-gray-400">{bill.customer_phone||'—'}</p>
                    </div>

                    {/* Amount */}
                    <div>
                      <p className="text-sm font-bold text-gray-900">₹{fmt(bill.total_amount||0)}</p>
                    </div>

                    {/* Valid Until */}
                    <div>
                      <p className="text-sm text-gray-800">{new Date(bill.valid_until).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
                      <p className={`text-xs font-medium ${isExpired(bill.valid_until)?'text-red-500':'text-emerald-600'}`}>
                        {isExpired(bill.valid_until) ? 'Expired' : 'Valid'}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {bill.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDetail(bill)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handlePrint(bill)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Print">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Table footer summary */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500">Showing <span className="font-semibold text-gray-700">{filteredBills.length}</span> of <span className="font-semibold text-gray-700">{ewayBills.length}</span> bills</p>
                <p className="text-xs text-gray-500">
                  Total Value: <span className="font-bold text-gray-800">₹{fmt(filteredBills.reduce((s,b)=>s+(b.total_amount||0),0))}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DETAIL MODAL  (shared — works for both mobile & desktop)
      ═══════════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedBill && (() => {
        const cfg = STATUS_CONFIG[selectedBill.status] || STATUS_CONFIG.CANCELLED;
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowDetailModal(false)} />

            {/* Mobile: slide-up sheet | Desktop: centered dialog */}
            <div className="fixed z-[61]
              bottom-0 left-0 right-0 rounded-t-2xl
              md:inset-0 md:flex md:items-center md:justify-center md:p-6 md:rounded-none md:bottom-auto md:left-auto md:right-auto">
              <div className="bg-white md:rounded-2xl md:shadow-2xl md:max-w-2xl md:w-full max-h-[92vh] overflow-y-auto">

                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 md:hidden" />

                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-blue-700">{selectedBill.eway_bill_no}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>{selectedBill.status}</span>
                    </div>
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Validity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Generated</p>
                      <p className="text-[12px] font-bold text-gray-800">{new Date(selectedBill.generated_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
                      <p className="text-[10px] text-gray-400">{new Date(selectedBill.generated_date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${isExpired(selectedBill.valid_until)?'bg-red-50':'bg-emerald-50'}`}>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Valid Until</p>
                      <p className={`text-[12px] font-bold ${isExpired(selectedBill.valid_until)?'text-red-700':'text-emerald-700'}`}>
                        {new Date(selectedBill.valid_until).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </p>
                      <p className="text-[10px] text-gray-400">{new Date(selectedBill.valid_until).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                  </div>

                  {/* Invoice amount */}
                  <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-blue-400 font-semibold uppercase">Invoice</p>
                      <p className="text-sm font-bold text-blue-800">{selectedBill.invoice_no||'—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase">Amount</p>
                      <p className="text-xl font-extrabold text-blue-800">₹{fmt(selectedBill.total_amount||0)}</p>
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Transport Details
                    </p>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                      {[['Mode',selectedBill.transport_mode],['Distance',`${selectedBill.distance_km} km`],
                        ['Vehicle No',selectedBill.vehicle_number||'—'],['Transporter',selectedBill.transporter_name||'—'],
                        ['Transporter ID',selectedBill.transporter_id||'—']].map(([l,v])=>(
                        <div key={l}>
                          <p className="text-[10px] text-gray-400">{l}</p>
                          <p className="font-semibold text-gray-800">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Route */}
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Route
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[9px] text-gray-400 uppercase">From</p>
                        <p className="text-sm font-bold text-gray-800">{selectedBill.from_state||'—'}</p>
                        <p className="text-xs text-gray-500">{selectedBill.from_pincode||''}</p>
                      </div>
                      <div className="text-gray-300 font-bold text-xl">→</div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[9px] text-gray-400 uppercase">To</p>
                        <p className="text-sm font-bold text-gray-800">{selectedBill.to_state||'—'}</p>
                        <p className="text-xs text-gray-500">{selectedBill.to_pincode||''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Customer</p>
                    <div className="space-y-2 text-sm">
                      {[['Name',selectedBill.customer_name||'—'],['Phone',selectedBill.customer_phone||'—'],
                        ['GSTIN',selectedBill.customer_gstin||'—'],['Address',selectedBill.customer_address||'—']].map(([l,v])=>(
                        <div key={l} className="flex justify-between gap-4">
                          <span className="text-gray-400 flex-shrink-0">{l}</span>
                          <span className="font-semibold text-gray-800 text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Print button */}
                <div className="px-5 pb-6 pt-2">
                  <button onClick={() => handlePrint(selectedBill)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow active:scale-95 transition">
                    <Printer className="w-4 h-4" />
                    Print E-way Bill
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default EwayBills;