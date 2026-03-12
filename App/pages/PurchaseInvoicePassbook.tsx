import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Printer, Save, Plus, Phone, MessageCircle, 
  ChevronDown, ChevronUp, IndianRupee, Calendar, FileText,
  ArrowUpRight, ArrowDownRight, MoreVertical, X, CheckCircle,
  Clock, AlertTriangle, Upload, Camera
} from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL;
const DEFAULT_GST_RATE = 5;
const DEFAULT_SHOP_PINCODE = "636003";
const money = (v: number) => Number(v || 0).toLocaleString("en-IN");
const round2 = (v: number) => Number(Number(v || 0).toFixed(2));

const computeTax = (taxable: number, pin: string, gstRate: number, shopPin: string) => {
  const isInter = pin.length >= 2 && shopPin.length >= 2 && pin.slice(0, 2) !== shopPin.slice(0, 2);
  const rate = Number.isFinite(Number(gstRate)) ? Number(gstRate) : DEFAULT_GST_RATE;
  let cgst = 0, sgst = 0, igst = 0;
  if (isInter) igst = round2((taxable * rate) / 100);
  else { cgst = round2((taxable * rate) / 200); sgst = round2((taxable * rate) / 200); }
  const tax = round2(cgst + sgst + igst);
  const roundOff = round2(Math.round(taxable + tax) - (taxable + tax));
  return { cgst, sgst, igst, roundOff, totalAfterTax: round2(taxable + tax + roundOff), gstRate: rate };
};

// Avatar helpers
const avatarColors = [
  'bg-violet-500','bg-indigo-500','bg-purple-500','bg-fuchsia-500',
  'bg-blue-500','bg-cyan-500','bg-teal-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-pink-500','bg-sky-500',
];
const getAvatarColor = (name: string) => avatarColors[(name || '').charCodeAt(0) % avatarColors.length];
const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();
const fmt = (n: number) => n.toLocaleString('en-IN');

// Status badge config
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'PAID': return { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle className="w-3 h-3"/>, label: 'Paid' };
    case 'HALF_PAID': return { cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Clock className="w-3 h-3"/>, label: 'Partial' };
    default: return { cls: 'text-rose-700 bg-rose-50 border-rose-200', icon: <AlertTriangle className="w-3 h-3"/>, label: 'Unpaid' };
  }
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Quick Entry Modal (You Gave / You Got)
// ─────────────────────────────────────────────────────────────────────────────
interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'PAID' | 'RECEIVED';
  partyName: string;
  balance: number;
  onSubmit: (amount: number, notes: string, date: string) => void;
}

const QuickEntryModal: React.FC<QuickEntryModalProps> = ({ isOpen, onClose, type, partyName, balance, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setAmount('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isPaid = type === 'PAID';
  const colorClass = isPaid ? 'bg-emerald-600' : 'bg-rose-600';
  const label = isPaid ? 'Mark Paid' : 'Record Refund';
  const subtitle = isPaid ? 'Payment to vendor' : 'Refund received from vendor';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full"/></div>
        
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${colorClass}`}>
                {isPaid ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{label}</h3>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400"/></button>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Vendor</p>
              <p className="font-semibold text-slate-800">{partyName}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                <input
                  ref={inputRef}
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-bold text-slate-800 focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => {
                if (amount && Number(amount) > 0) {
                  onSubmit(Number(amount), notes, date);
                  onClose();
                }
              }}
              disabled={!amount || Number(amount) <= 0}
              className={`w-full py-4 rounded-xl text-white font-semibold text-lg shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
            >
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Passbook Page (Credit-Debit Style)
// ─────────────────────────────────────────────────────────────────────────────
const PurchaseInvoicePassbook: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { shopName } = useAuth();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryType, setQuickEntryType] = useState<'PAID' | 'RECEIVED'>('PAID');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  const [f, setF] = useState({
    vendor_name: "", vendor_address: "", vendor_address2: "",
    vendor_gstin: "", vendor_state_code: "", vendor_pincode: "",
    invoice_no: "", invoice_date: "", bale_no: "", through_agent: "", lr_no: "", notes: "",
  });
  
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const fetchPurchase = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/purchases/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const d = await res.json();
        setPurchase(d);
        const gstin = String(d.vendor_gstin || "").trim();
        setF({
          vendor_name: d.vendor_name || "",
          vendor_address: d.vendor_address || "",
          vendor_address2: "",
          vendor_gstin: gstin,
          vendor_state_code: gstin.length >= 2 ? gstin.slice(0, 2) : "",
          vendor_pincode: "",
          invoice_no: d.invoice_no || "",
          invoice_date: new Date(d.created_at || Date.now()).toLocaleDateString("en-IN"),
          bale_no: d.bale_no || "",
          through_agent: d.through_agent || "",
          lr_no: d.lr_no || "",
          notes: d.notes || "",
        });
        // Fetch images if any
        if (d.images) {
          setUploadedImages(d.images);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPurchase(); }, [id]);

  // Calculate totals
  const taxable = useMemo(() => (purchase?.items || []).reduce((s: number, i: any) => s + Number(i.total || 0), 0), [purchase]);
  const tax = useMemo(() => {
    const rate = Number(purchase?.gst_rate || DEFAULT_GST_RATE);
    const shop = String(purchase?.shop_pincode || DEFAULT_SHOP_PINCODE).trim();
    return computeTax(taxable, f.vendor_pincode, rate, shop);
  }, [purchase, f.vendor_pincode, taxable]);

  const paid = Number(purchase?.paid_amount || 0);
  const totalAmount = tax.totalAfterTax;
  const balance = totalAmount - paid;

  // Generate passbook entries
  const passbookEntries = useMemo(() => {
    if (!purchase) return [];
    
    const entries: any[] = [];
    
    // Main purchase entry
    entries.push({
      id: purchase.id,
      date: purchase.created_at,
      type: 'PURCHASE',
      description: `Purchase Bill #${purchase.invoice_no}`,
      details: `${purchase.items?.length || 0} items • ${purchase.total_qty || 0} qty`,
      amount: totalAmount,
      youGave: totalAmount,  // We paid/pay vendor
      youGot: 0,
      balance: totalAmount,
      status: purchase.payment_status || 'NOT_PAID'
    });

    // Payment entries
    if (paid > 0) {
      entries.push({
        id: 'payment-1',
        date: purchase.updated_at || purchase.created_at,
        type: 'PAYMENT',
        description: 'Payment to Vendor',
        details: purchase.payment_mode || 'Bank Transfer',
        amount: paid,
        youGave: 0,
        youGot: paid,
        balance: totalAmount - paid,
        status: 'PAID'
      });
    }

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [purchase, totalAmount, paid]);

  // Running balance calculation
  const entriesWithRunningBalance = useMemo(() => {
    let runningBalance = 0;
    return passbookEntries.map(entry => {
      if (entry.type === 'PURCHASE') {
        runningBalance += entry.youGave;
      } else {
        runningBalance -= entry.youGot;
      }
      return { ...entry, runningBalance };
    });
  }, [passbookEntries]);

  const handleQuickEntry = async (amount: number, notes: string, date: string) => {
    if (!id || !purchase) return;
    
    const newPaidAmount = quickEntryType === 'PAID' 
      ? Math.min(paid + amount, totalAmount)
      : Math.max(paid - amount, 0);
    
    try {
      const res = await fetch(`${API}/api/purchases/${id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          paidAmount: newPaidAmount,
          paymentMode: 'BANK',
          notes: notes
        }),
      });
      
      if (res.ok) {
        fetchPurchase();
      } else {
        alert('Failed to update payment');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch(`${API}/api/purchases/${id}/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setUploadedImages(prev => [...prev, data.imageUrl]);
      } else {
        alert('Failed to upload image');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );

  if (!purchase) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <p className="text-slate-500">Purchase not found</p>
    </div>
  );

  const avatarColor = getAvatarColor(f.vendor_name);
  const statusConfig = getStatusConfig(purchase.payment_status || 'NOT_PAID');

  return (
    <div className="min-h-screen bg-slate-50 md:bg-white">
      {/* ═══════════════════════════════════════════════════════════════
          MOBILE/CREDIT-DEBIT STYLE HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden bg-gradient-to-br from-violet-600 to-indigo-800 text-white">
        {/* Top Navigation */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg">Vendor Details</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowInvoice(true)} className="p-2 hover:bg-white/10 rounded-full">
              <FileText className="w-5 h-5" />
            </button>
            <button onClick={() => setShowImageUpload(true)} className="p-2 hover:bg-white/10 rounded-full">
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Party Info */}
        <div className="px-4 pb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg ${avatarColor}`}>
              {getInitial(f.vendor_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl truncate">{f.vendor_name || 'Vendor'}</h2>
              {purchase.vendor_phone && (
                <p className="text-violet-200 text-sm">{purchase.vendor_phone}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-white/10 border-white/20`}>
                  {statusConfig.icon} {statusConfig.label}
                </span>
                <span className="text-xs text-violet-200">{f.invoice_no}</span>
              </div>
            </div>
          </div>

          {/* Balance Display */}
          <div className="mt-5 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-200 text-xs font-medium mb-1">
                  {balance > 0 ? 'You will give' : balance < 0 ? 'You will get' : 'Settled'}
                </p>
                <p className="text-3xl font-black">₹{fmt(Math.abs(balance))}</p>
              </div>
              <div className="text-right">
                <p className="text-violet-200 text-xs">Total Bill</p>
                <p className="font-bold">₹{fmt(totalAmount)}</p>
              </div>
            </div>
            
            {/* Quick Contact Buttons */}
            <div className="flex gap-3 mt-4">
              {purchase.vendor_phone && (
                <a 
                  href={`tel:${purchase.vendor_phone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl text-sm font-medium transition"
                >
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
              <button 
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hi ${f.vendor_name}, regarding Purchase Invoice ${f.invoice_no} for ₹${fmt(totalAmount)}. Balance pending: ₹${fmt(balance)}`)}`, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 py-2.5 rounded-xl text-sm font-medium transition"
              >
                <MessageCircle className="w-4 h-4" /> Remind
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md ${avatarColor}`}>
              {getInitial(f.vendor_name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{f.vendor_name || 'Vendor'}</h1>
              <div className="flex items-center gap-3 mt-1">
                {purchase.vendor_phone && (
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {purchase.vendor_phone}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.cls}`}>
                  {statusConfig.icon} {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowImageUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg font-medium hover:bg-violet-100 transition"
            >
              <Upload className="w-4 h-4" /> Upload Bill
            </button>
            <button 
              onClick={() => setShowInvoice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition"
            >
              <FileText className="w-4 h-4" /> View Bill
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {/* Desktop Balance Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Total Amount</p>
            <p className="text-xl font-bold text-slate-800">₹{fmt(totalAmount)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Paid Amount</p>
            <p className="text-xl font-bold text-emerald-600">₹{fmt(paid)}</p>
          </div>
          <div className={`rounded-xl p-4 shadow-sm ${balance > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className="text-xs text-slate-500 font-medium mb-1">
              {balance > 0 ? 'Balance Due' : 'Advance Paid'}
            </p>
            <p className={`text-xl font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ₹{fmt(Math.abs(balance))}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">Invoice</p>
            <p className="text-xl font-bold text-slate-800">{f.invoice_no}</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          UPLOADED IMAGES SECTION
          ═══════════════════════════════════════════════════════════════ */}
      {uploadedImages.length > 0 && (
        <div className="md:max-w-6xl md:mx-auto md:px-6">
          <div className="px-4 py-3 md:px-0 md:py-0 md:mb-4">
            <h3 className="font-bold text-slate-800 md:text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-slate-400" />
              Uploaded Bills ({uploadedImages.length})
            </h3>
          </div>
          <div className="px-4 md:px-0 pb-4">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden cursor-pointer" onClick={() => window.open(img, '_blank')}>
                  <img src={img} alt={`Bill ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PASSBOOK ENTRIES
          ═══════════════════════════════════════════════════════════════ */}
      <div className="md:max-w-6xl md:mx-auto md:px-6 md:py-6">
        <div className="flex items-center justify-between px-4 py-3 md:px-0 md:py-0 md:mb-4">
          <h3 className="font-bold text-slate-800 md:text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Transaction History
          </h3>
          <span className="text-xs text-slate-500">{entriesWithRunningBalance.length} entries</span>
        </div>

        <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden">
          {entriesWithRunningBalance.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-400">No entries found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entriesWithRunningBalance.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs font-bold text-slate-800">
                      {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {new Date(entry.date).toLocaleDateString('en-IN', { month: 'short' })}
                    </p>
                  </div>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    entry.type === 'PURCHASE' 
                      ? 'bg-violet-100 text-violet-600' 
                      : entry.youGot > 0 
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-rose-100 text-rose-600'
                  }`}>
                    {entry.type === 'PURCHASE' ? <FileText className="w-5 h-5"/> : 
                     entry.youGot > 0 ? <ArrowDownRight className="w-5 h-5"/> : <ArrowUpRight className="w-5 h-5"/>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{entry.description}</p>
                    <p className="text-xs text-slate-500">{entry.details}</p>
                    {entry.status && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${
                        entry.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        entry.status === 'HALF_PAID' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${
                      entry.youGot > 0 ? 'text-emerald-600' : entry.youGave > 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {entry.youGot > 0 ? `+₹${fmt(entry.youGot)}` : entry.youGave > 0 ? `₹${fmt(entry.youGave)}` : `₹${fmt(entry.amount)}`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Bal: ₹{fmt(entry.runningBalance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE QUICK ACTION BUTTONS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="flex gap-3">
          <button 
            onClick={() => { setQuickEntryType('RECEIVED'); setQuickEntryOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-100 text-rose-700 py-3.5 rounded-xl font-semibold active:scale-95 transition"
          >
            <ArrowDownRight className="w-5 h-5" />
            Refund
          </button>
          <button 
            onClick={() => { setQuickEntryType('PAID'); setQuickEntryOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3.5 rounded-xl font-semibold active:scale-95 transition"
          >
            <ArrowUpRight className="w-5 h-5" />
            Pay Vendor
          </button>
        </div>
      </div>

      {/* Desktop Quick Actions */}
      <div className="hidden md:flex max-w-6xl mx-auto px-6 py-6 gap-4">
        <button 
          onClick={() => { setQuickEntryType('RECEIVED'); setQuickEntryOpen(true); }}
          className="flex-1 flex items-center justify-center gap-2 bg-rose-50 border-2 border-rose-200 text-rose-700 py-4 rounded-xl font-semibold hover:bg-rose-100 transition"
        >
          <ArrowDownRight className="w-5 h-5" />
          Record Refund from Vendor
        </button>
        <button 
          onClick={() => { setQuickEntryType('PAID'); setQuickEntryOpen(true); }}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 py-4 rounded-xl font-semibold hover:bg-emerald-100 transition"
        >
          <ArrowUpRight className="w-5 h-5" />
          Pay Vendor
        </button>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="md:hidden h-24" />

      {/* ═══════════════════════════════════════════════════════════════
          QUICK ENTRY MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <QuickEntryModal 
        isOpen={quickEntryOpen} 
        onClose={() => setQuickEntryOpen(false)} 
        type={quickEntryType}
        partyName={f.vendor_name || 'Vendor'}
        balance={balance}
        onSubmit={handleQuickEntry}
      />

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">Upload Bill Image</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="w-full"
            />
            <button 
              onClick={() => setShowImageUpload(false)}
              className="mt-4 w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modal would go here - simplified for brevity */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-10">
            <button onClick={() => setShowInvoice(false)} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-semibold">Purchase Bill</h1>
            <button onClick={() => window.print()} className="p-2">
              <Printer className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-center text-slate-500">Purchase Invoice #{f.invoice_no}</p>
            <p className="text-center text-slate-400 text-sm mt-2">Vendor: {f.vendor_name}</p>
            <p className="text-center text-slate-800 font-bold text-xl mt-4">₹{fmt(totalAmount)}</p>
            <p className="text-center text-slate-500 text-sm mt-1">Status: {purchase.payment_status || 'NOT_PAID'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoicePassbook;
