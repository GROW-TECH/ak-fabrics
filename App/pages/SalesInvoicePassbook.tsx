import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Printer, Save, Plus, Phone, MessageCircle, 
  ChevronDown, ChevronUp, IndianRupee, Calendar, FileText,
  ArrowUpRight, ArrowDownRight, MoreVertical, X, CheckCircle,
  Clock, AlertTriangle, Users, Search, BookOpen
} from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
import html2canvas from "html2canvas";
import { Account, AccountType } from '../types';

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
  'bg-blue-500','bg-indigo-500','bg-violet-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500',
  'bg-teal-500','bg-orange-500','bg-lime-600','bg-sky-500',
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
  type: 'GAVE' | 'GOT';
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

  const isGive = type === 'GAVE';
  const colorClass = isGive ? 'bg-rose-600' : 'bg-emerald-600';
  const label = isGive ? 'You Gave' : 'You Got';
  const subtitle = isGive ? 'Money given to customer' : 'Money received from customer';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full"/></div>
        
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${colorClass}`}>
                {isGive ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{label}</h3>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400"/></button>
          </div>

          <div className="space-y-4">
            {/* Party Name Display */}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Party</p>
              <p className="font-semibold text-slate-800">{partyName}</p>
            </div>

            {/* Amount Input */}
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit Button */}
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
// Sales Passbook Page (Credit-Debit Style)
// ─────────────────────────────────────────────────────────────────────────────
const SalesInvoicePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { shopName } = useAuth();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryType, setQuickEntryType] = useState<'GAVE' | 'GOT'>('GOT');
  const [showAllEntries, setShowAllEntries] = useState(false);
  
  // Customer form state
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customers, setCustomers] = useState<Account[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    pincode: '',
    through: '',
    throughGstin: '',
    openingBalance: 0,
    mostBoughtGoods: ''
  });
  
  const [f, setF] = useState({
    customer_name: "", customer_address: "", customer_address2: "",
    customer_gstin: "", customer_state_code: "", customer_pincode: "",
    invoice_no: "", invoice_date: "", bale_no: "", through_agent: "", lr_no: "", notes: "",
  });
  
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const fetchSale = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/sales/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const d = await res.json();
        setSale(d);
        setF({
          customer_name: d.customer_name || "",
          customer_address: d.customer_address || "",
          customer_address2: d.customer_address2 || "",
          customer_gstin: d.customer_gstin || "",
          customer_state_code: d.customer_state_code || "",
          customer_pincode: String(d.customer_pincode || "").trim(),
          invoice_no: d.invoice_no || "",
          invoice_date: new Date(d.created_at || Date.now()).toLocaleDateString("en-IN"),
          bale_no: d.bale_no || "",
          through_agent: d.through_agent || "",
          lr_no: d.lr_no || "",
          notes: d.notes || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSale(); fetchCustomers(); }, [id]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API}/api/accounts`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) {
        const accounts = await res.json();
        setCustomers(accounts.filter((a: Account) => a.type === AccountType.CUSTOMER));
      }
    } catch (e) { console.error('Failed to fetch customers:', e); }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      id: `acc-${Date.now()}`,
      name: customerFormData.name,
      type: AccountType.CUSTOMER,
      phone: customerFormData.phone,
      address: customerFormData.address,
      gstin: customerFormData.gstin,
      pincode: customerFormData.pincode,
      through: customerFormData.through,
      throughGstin: customerFormData.throughGstin,
      balance: customerFormData.openingBalance,
      mostBoughtGoods: customerFormData.mostBoughtGoods,
    };

    try {
      const res = await fetch(`${API}/api/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await fetchCustomers();
        setShowCustomerForm(false);
        setCustomerFormData({
          name: '', phone: '', address: '', gstin: '', pincode: '',
          through: '', throughGstin: '', openingBalance: 0, mostBoughtGoods: ''
        });
      } else {
        alert('Failed to add customer');
      }
    } catch (err) {
      console.error('Save failed', err);
      alert('Network error');
    }
  };

  // Calculate totals
  const taxable = useMemo(() => (sale?.items || []).reduce((s: number, i: any) => s + Number(i.total || 0), 0), [sale]);
  const tax = useMemo(() => {
    const rate = Number(sale?.gst_rate || DEFAULT_GST_RATE);
    const shop = String(sale?.shop_pincode || DEFAULT_SHOP_PINCODE).trim();
    return computeTax(taxable, f.customer_pincode, rate, shop);
  }, [sale, f.customer_pincode, taxable]);

  const paid = Number(sale?.paid_amount || 0);
  const totalAmount = tax.totalAfterTax;
  const balance = totalAmount - paid;

  // Generate passbook entries (main invoice + payments)
  const passbookEntries = useMemo(() => {
    if (!sale) return [];
    
    const entries: any[] = [];
    
    // Main invoice entry
    entries.push({
      id: sale.id,
      date: sale.created_at,
      type: 'INVOICE',
      description: `Invoice #${sale.invoice_no}`,
      details: `${sale.items?.length || 0} items • ${sale.total_qty || 0} qty`,
      amount: totalAmount,
      youGot: 0,
      youGave: totalAmount,
      balance: totalAmount,
      status: sale.status || 'NOT_PAID'
    });

    // Payment entries from paid_amount history (if available)
    if (paid > 0) {
      // If there's partial payment, show it
      entries.push({
        id: 'payment-1',
        date: sale.updated_at || sale.created_at,
        type: 'PAYMENT',
        description: 'Payment Received',
        details: sale.payment_mode || 'Cash',
        amount: paid,
        youGot: paid,
        youGave: 0,
        balance: totalAmount - paid,
        status: 'PAID'
      });
    }

    // Sort by date
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sale, totalAmount, paid]);

  // Running balance calculation
  const entriesWithRunningBalance = useMemo(() => {
    let runningBalance = 0;
    return passbookEntries.map(entry => {
      if (entry.type === 'INVOICE') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.youGot;
      }
      return { ...entry, runningBalance };
    });
  }, [passbookEntries]);

  const resolveWaPhone = () => {
    const urlParams = new URLSearchParams(location.search);
    const urlPhone = urlParams.get("phone") || "";
    const dataPhone = sale?.customer_phone ? String(sale.customer_phone).replace(/\D/g, "") : "";
    const rawPhone = (urlPhone || dataPhone).replace(/\D/g, "");
    if (rawPhone.length === 10) return "91" + rawPhone;
    if (rawPhone.length >= 11 && rawPhone.startsWith("91")) return rawPhone;
    return rawPhone;
  };

  const shareAsImage = async () => {
    setSharing(true);
    try {
      const invoiceEl = document.querySelector(".ps") as HTMLElement;
      if (!invoiceEl) { alert("Invoice not found"); setSharing(false); return; }

      const canvas = await html2canvas(invoiceEl, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#fff", logging: false });
      canvas.toBlob(async (blob) => {
        if (!blob) { alert("Failed to capture invoice"); setSharing(false); return; }

        const waPhone = resolveWaPhone();
        
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `${f.invoice_no || "invoice"}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            try { await navigator.share({ title: `Invoice ${f.invoice_no}`, files: [file] }); setSharing(false); return; } catch (_) {}
          }
        }

        const imgUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = imgUrl;
        a.download = `${f.invoice_no || "invoice"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(imgUrl);

        const msg = encodeURIComponent(`Dear ${f.customer_name || "Customer"},\nSales Invoice *${f.invoice_no}* from *AK Fabrics*\nAmount: ₹${money(totalAmount)}\nBalance: ₹${money(balance)}\n\n_Please find the attached invoice image._`);
        setTimeout(() => {
          if (waPhone.length >= 10) window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
          else window.open(`https://wa.me/?text=${msg}`, "_blank");
        }, 600);
        setSharing(false);
      }, "image/png");
    } catch (err) {
      console.error(err);
      alert("Failed to share invoice");
      setSharing(false);
    }
  };

  const saveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/sales/${id}/tax-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ customerPincode: f.customer_pincode, gstRate: Number(sale?.gst_rate || DEFAULT_GST_RATE), ...f }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return alert(e.error || "Failed"); }
      const data = await res.json();
      setSale(data.sale);
    } finally { setSaving(false); }
  };

  const handleQuickEntry = async (amount: number, notes: string, date: string) => {
    if (!id || !sale) return;
    
    // Calculate new paid amount
    const newPaidAmount = quickEntryType === 'GOT' 
      ? Math.min(paid + amount, totalAmount) // Payment received
      : Math.max(paid - amount, 0); // Refund/return
    
    try {
      const res = await fetch(`${API}/api/sales/${id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          paidAmount: newPaidAmount,
          paymentMode: 'CASH',
          notes: notes
        }),
      });
      
      if (res.ok) {
        fetchSale();
      } else {
        alert('Failed to update payment');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const sendReminder = () => {
    const waPhone = resolveWaPhone();
    const msg = encodeURIComponent(
      `Dear ${f.customer_name || "Customer"},\n\n` +
      `This is a friendly reminder about your outstanding balance of *₹${money(balance)}* with *AK Fabrics*.\n\n` +
      `Invoice: ${f.invoice_no}\n` +
      `Total Amount: ₹${money(totalAmount)}\n` +
      `Paid: ₹${money(paid)}\n` +
      `Balance Due: ₹${money(balance)}\n\n` +
      `Please clear this amount at your earliest convenience.\n\n` +
      `Thank you,\n` +
      `AK Fabrics`
    );
    
    if (waPhone.length >= 10) {
      window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );

  if (!sale) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <p className="text-slate-500">Sale not found</p>
    </div>
  );

  const waPhone = resolveWaPhone();
  const avatarColor = getAvatarColor(f.customer_name);
  const statusConfig = getStatusConfig(sale.status || 'NOT_PAID');

  return (
    <div className="min-h-screen bg-slate-50 md:bg-white">
      {/* ═══════════════════════════════════════════════════════════════
          MOBILE/CREDIT-DEBIT STYLE HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        {/* Top Navigation */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg">Customer Details</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowInvoice(true)} className="p-2 hover:bg-white/10 rounded-full">
              <FileText className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Party Info */}
        <div className="px-4 pb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg ${avatarColor}`}>
              {getInitial(f.customer_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl truncate">{f.customer_name || 'Customer'}</h2>
              {sale.customer_phone && (
                <p className="text-blue-200 text-sm">+91 {sale.customer_phone}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-white/10 border-white/20`}>
                  {statusConfig.icon} {statusConfig.label}
                </span>
                <span className="text-xs text-blue-200">{f.invoice_no}</span>
              </div>
            </div>
          </div>

          {/* Balance Display */}
          <div className="mt-5 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-1">
                  {balance > 0 ? 'You will get' : balance < 0 ? 'You will give' : 'Settled'}
                </p>
                <p className="text-3xl font-black">₹{fmt(Math.abs(balance))}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs">Total Bill</p>
                <p className="font-bold">₹{fmt(totalAmount)}</p>
              </div>
            </div>
            
            {/* Quick Contact Buttons */}
            <div className="flex gap-3 mt-4">
              {waPhone && (
                <>
                  <a 
                    href={`tel:+91${sale.customer_phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>
                  <button 
                    onClick={() => window.open(`https://wa.me/91${sale.customer_phone}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    <WhatsAppIcon /> Chat
                  </button>
                </>
              )}
              <button 
                onClick={sendReminder}
                className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl text-sm font-medium transition"
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
              {getInitial(f.customer_name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{f.customer_name || 'Customer'}</h1>
              <div className="flex items-center gap-3 mt-1">
                {sale.customer_phone && (
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> +91 {sale.customer_phone}
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
              onClick={() => setShowInvoice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition"
            >
              <FileText className="w-4 h-4" /> View Invoice
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
              {balance > 0 ? 'Balance Due' : 'Advance/Credit'}
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
          PASSBOOK ENTRIES (Mobile & Desktop)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="md:max-w-6xl md:mx-auto md:px-6 md:py-6">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-0 md:py-0 md:mb-4">
          <h3 className="font-bold text-slate-800 md:text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-400" />
            Transaction History
          </h3>
          <span className="text-xs text-slate-500">{entriesWithRunningBalance.length} entries</span>
        </div>

        {/* Entries List */}
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
              {entriesWithRunningBalance.map((entry, idx) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition">
                  {/* Date Column */}
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs font-bold text-slate-800">
                      {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {new Date(entry.date).toLocaleDateString('en-IN', { month: 'short' })}
                    </p>
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    entry.type === 'INVOICE' 
                      ? 'bg-blue-100 text-blue-600' 
                      : entry.youGot > 0 
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-rose-100 text-rose-600'
                  }`}>
                    {entry.type === 'INVOICE' ? <FileText className="w-5 h-5"/> : 
                     entry.youGot > 0 ? <ArrowDownRight className="w-5 h-5"/> : <ArrowUpRight className="w-5 h-5"/>}
                  </div>

                  {/* Description */}
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

                  {/* Amounts */}
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
          MOBILE QUICK ACTION BUTTONS (Bottom Fixed)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-lg z-40">
        <div className="flex gap-3">
          <button 
            onClick={() => { setQuickEntryType('GAVE'); setQuickEntryOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-100 text-rose-700 py-3.5 rounded-xl font-semibold active:scale-95 transition"
          >
            <ArrowUpRight className="w-5 h-5" />
            You Gave
          </button>
          <button 
            onClick={() => { setQuickEntryType('GOT'); setQuickEntryOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3.5 rounded-xl font-semibold active:scale-95 transition"
          >
            <ArrowDownRight className="w-5 h-5" />
            You Got
          </button>
          <button 
            onClick={() => setShowCustomerForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-100 text-blue-700 py-3.5 rounded-xl font-semibold active:scale-95 transition"
          >
            <Users className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Desktop Quick Actions */}
      <div className="hidden md:flex max-w-6xl mx-auto px-6 py-6 gap-4">
        <button 
          onClick={() => { setQuickEntryType('GAVE'); setQuickEntryOpen(true); }}
          className="flex-1 flex items-center justify-center gap-2 bg-rose-50 border-2 border-rose-200 text-rose-700 py-4 rounded-xl font-semibold hover:bg-rose-100 transition"
        >
          <ArrowUpRight className="w-5 h-5" />
          Record Payment Given (Refund/Return)
        </button>
        <button 
          onClick={() => { setQuickEntryType('GOT'); setQuickEntryOpen(true); }}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 py-4 rounded-xl font-semibold hover:bg-emerald-100 transition"
        >
          <ArrowDownRight className="w-5 h-5" />
          Record Payment Received
        </button>
        <button 
          onClick={() => setShowCustomerForm(true)}
          className="flex items-center justify-center gap-2 bg-blue-50 border-2 border-blue-200 text-blue-700 py-4 rounded-xl font-semibold hover:bg-blue-100 transition"
        >
          <Users className="w-5 h-5" />
          Add New Customer
        </button>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="md:hidden h-32" />

      {/* ═══════════════════════════════════════════════════════════════
          CUSTOMER FORM MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* Colored top bar */}
            <div className="h-1.5 w-full" style={{
              background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)'
            }} />
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-0.5">
                  New Entry
                </p>
                <h2 className="text-xl font-bold text-slate-800">Add Customer</h2>
              </div>
              <button
                onClick={() => {
                  setShowCustomerForm(false);
                  setCustomerFormData({
                    name: '', phone: '', address: '', gstin: '', pincode: '',
                    through: '', throughGstin: '', openingBalance: 0, mostBoughtGoods: ''
                  });
                }}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Form Body */}
            <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleAddCustomer} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    placeholder="e.g. Ravi Kumar Textiles"
                    value={customerFormData.name}
                    onChange={e => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                  />
                </div>
                {/* GSTIN + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN</label>
                    <input
                      maxLength={15}
                      placeholder="22AAAAA0000A1Z5"
                      value={customerFormData.gstin}
                      onChange={e => setCustomerFormData({ ...customerFormData, gstin: e.target.value.toUpperCase() })}
                      className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                    <input
                      maxLength={10}
                      placeholder="10-digit number"
                      value={customerFormData.phone}
                      onChange={e => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                    />
                  </div>
                </div>
                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                  <textarea
                    rows={2}
                    placeholder="Street, City..."
                    value={customerFormData.address}
                    onChange={e => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition resize-none"
                  />
                </div>
                {/* Pincode + Through */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pincode</label>
                    <input
                      maxLength={6}
                      placeholder="636001"
                      value={customerFormData.pincode}
                      onChange={e => setCustomerFormData({ ...customerFormData, pincode: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Through</label>
                    <input
                      value={customerFormData.through}
                      onChange={e => setCustomerFormData({ ...customerFormData, through: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                    />
                  </div>
                </div>
                {/* Divider */}
                <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerForm(false);
                      setCustomerFormData({
                        name: '', phone: '', address: '', gstin: '', pincode: '',
                        through: '', throughGstin: '', openingBalance: 0, mostBoughtGoods: ''
                      });
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════════════════════════
          QUICK ENTRY MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <QuickEntryModal 
        isOpen={quickEntryOpen} 
        onClose={() => setQuickEntryOpen(false)} 
        type={quickEntryType}
        partyName={f.customer_name || 'Customer'}
        balance={balance}
        onSubmit={handleQuickEntry}
      />

      {/* ═══════════════════════════════════════════════════════════════
          INVOICE MODAL (Printable GST Invoice)
          ═══════════════════════════════════════════════════════════════ */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          {/* Mobile Invoice Header */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-10">
            <button onClick={() => setShowInvoice(false)} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-semibold">Invoice</h1>
            <div className="flex items-center gap-2">
              <button onClick={shareAsImage} disabled={sharing} className="p-2">
                {sharing ? <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/> : <WhatsAppIcon />}
              </button>
              <button onClick={() => window.print()} className="p-2">
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Desktop Invoice Header */}
          <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b sticky top-0 z-10">
            <button onClick={() => setShowInvoice(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" /> Back to Passbook
            </button>
            <div className="flex items-center gap-3">
              <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg font-medium">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={shareAsImage} disabled={sharing} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
                {sharing ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"/> : <WhatsAppIcon />}
                {sharing ? 'Sending...' : 'WhatsApp'}
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>

          {/* GST Invoice Content */}
          <div className="max-w-4xl mx-auto p-4 md:p-8">
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400&display=swap');
              .inv { font-family:'Tinos',Georgia,serif; font-size:12px; color:#111; }
              .inv-wrap { border:2px solid #2e7d32; background:#fff; }
              .itbl { border-collapse:collapse; width:100%; }
              .itbl th,.itbl td { border:1px solid #2e7d32; padding:3px 5px; font-size:12px; }
              .itbl th { background:#e8f5e9; font-weight:bold; text-align:center; }
              .itbl td { height:24px; }
              .srow { display:flex; justify-content:space-between; border-bottom:1px solid #2e7d32; padding:4px 10px; font-size:12px; align-items:center; }
              .srow:last-child{border-bottom:none;}
              input::placeholder{color:#ccc;font-style:italic;}
              @media print{
                body *{visibility:hidden!important;}
                .ps,.ps *{visibility:visible!important;}
                .ps{position:absolute;left:0;top:0;width:100%;margin:0;padding:0;}
                .no-print{display:none!important;}
                .inv-wrap{box-shadow:none!important;}
              }
            `}</style>

            <div className="ps">
              <div className="inv-wrap inv">
                {/* ── HEADER ── */}
                <div style={{ borderBottom: `2px solid #2e7d32` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", borderBottom: `1px solid #2e7d32` }}>
                    <div style={{ fontSize: 10.5 }}>
                      <div><b>GSTIN : </b>{sale.shop_gstin || "33AKGPK9627B1ZC"}</div>
                      <div><b>STATE CODE : </b>33</div>
                    </div>
                    <div style={{ fontSize: 10, color: "#555", fontStyle: "italic", textAlign: "center" }}>Paruthipalli Angalamman Thumai</div>
                    <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#2e7d32"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                        <span>9443095080</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#2e7d32"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                        <span>9262021600</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", width: 140 }}>
                      <img src="/AK Logo.jpg" alt="AK Fabrics" style={{ width: 100, height: 100, objectFit: "contain" }} onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                    </div>
                    <div style={{ flex: 1, padding: "6px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 34, fontWeight: 900, color: "#1b5e20", lineHeight: 1, letterSpacing: 2 }}>{shopName || "AK FABRICS"}</div>
                      <div style={{ fontSize: 13, fontWeight: "bold", color: "#2e7d32", marginTop: 3 }}>CLOTH MERCHANT</div>
                      <div style={{ fontSize: 11, fontWeight: "bold", color: "#1b5e20", marginTop: 3 }}>34, No-1 PandariNadhar Street, Ammapet, Salem - 636003</div>
                      <div style={{ fontSize: 10, color: "#444" }}>E-Mail : ak.fabries.salem@gmail.com</div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", width: 140 }}>
                      <img src="/Goddess.jpg" alt="Goddess" style={{ width: 100, height: 100, objectFit: "contain" }} onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid #2e7d32`, padding: "2px 10px", textAlign: "center", fontSize: 12, fontWeight: "bold", textDecoration: "underline", color: "#1b5e20" }}>TAX INVOICE</div>
                  <div style={{ borderTop: `1px solid #2e7d32`, padding: "3px 10px", fontSize: 11 }}><b>Prop : K.KANNAN</b></div>
                </div>

                {/* ── BILLING + INVOICE ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid #2e7d32` }}>
                  <div style={{ borderRight: `1px solid #2e7d32`, padding: "8px 12px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: 5 }}>To.</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                      <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>M/s.</span>
                      <input value={f.customer_name} onChange={upd("customer_name")} placeholder="Customer name" style={{ border: "none", borderBottom: "1px dashed #aaa", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, padding: "1px 3px", width: "100%", display: "block" }} />
                    </div>
                    <input value={f.customer_address} onChange={upd("customer_address")} placeholder="Address line 1" style={{ border: "none", borderBottom: "1px dashed #aaa", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, padding: "1px 3px", width: "100%", display: "block", marginBottom: 5 }} />
                    <input value={f.customer_address2} onChange={upd("customer_address2")} placeholder="City / District" style={{ border: "none", borderBottom: "1px dashed #aaa", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, padding: "1px 3px", width: "100%", display: "block", marginBottom: 8 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>GSTIN</span>
                      <input value={f.customer_gstin} onChange={upd("customer_gstin")} placeholder="Customer GSTIN" style={{ border: `1px solid #2e7d32`, outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 11, padding: "2px 5px", width: 145, borderRadius: 2 }} />
                      <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>STATE CODE.</span>
                      <input value={f.customer_state_code} onChange={upd("customer_state_code")} placeholder="33" style={{ border: `1px solid #2e7d32`, outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 11, padding: "2px 5px", width: 36, borderRadius: 2 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: "bold" }}>Pincode:</span>
                      <input value={f.customer_pincode} onChange={upd("customer_pincode")} placeholder="Enter pincode" style={{ border: `1px solid #2e7d32`, outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 11, padding: "2px 5px", width: 100, borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ padding: "8px 12px" }}>
                    {[["Invoice No", "invoice_no"], ["Invoice Date", "invoice_date"], ["Bale No", "bale_no"], ["Through", "through_agent"], ["L.R. No", "lr_no"]].map(([label, key]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: "bold", minWidth: 90, fontSize: 12 }}>{label}</span>
                        <input value={(f as any)[key]} onChange={upd(key)} placeholder={label} style={{ border: "none", borderBottom: "1px dashed #aaa", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, padding: "1px 3px", width: "100%", display: "block" }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── ITEMS TABLE ── */}
                <table className="itbl">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>S.No</th>
                      <th style={{ width: 62 }}>HSN<br />CODE</th>
                      <th style={{ width: 52 }}>Size</th>
                      <th style={{ textAlign: "left", paddingLeft: 6 }}>Particulars</th>
                      <th style={{ width: 100 }}>Rate<div style={{ display: "flex", justifyContent: "space-between", fontWeight: "normal", fontSize: 10, paddingInline: 3 }}><span>Rs.</span><span>P.</span></div></th>
                      <th style={{ width: 46 }}>Qty.</th>
                      <th style={{ width: 100 }}>AMOUNT<div style={{ display: "flex", justifyContent: "space-between", fontWeight: "normal", fontSize: 10, paddingInline: 3 }}><span>Rs.</span><span>P.</span></div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ textAlign: "center" }}>{item.hsn || ""}</td>
                        <td style={{ textAlign: "center" }}>{item.size || ""}</td>
                        <td style={{ paddingLeft: 6 }}>{item.description || ""}</td>
                        <td style={{ textAlign: "right" }}>{money(item.rate)}</td>
                        <td style={{ textAlign: "center" }}>{Number(item.quantity || item.qty || 0)}</td>
                        <td style={{ textAlign: "right" }}>{money(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ── FOOTER ── */}
                <div style={{ borderTop: `1px solid #2e7d32`, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ borderRight: `1px solid #2e7d32`, padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, fontSize: 11 }}>
                      <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Rupees</span>
                      <input value={f.notes} onChange={upd("notes")} placeholder="Amount in words / notes" style={{ border: "none", borderBottom: "1px dashed #aaa", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, padding: "1px 3px", width: "100%", display: "block" }} />
                    </div>
                    <div style={{ fontSize: 11 }}>
                      <div style={{ fontWeight: "bold", textAlign: "center", textDecoration: "underline", marginBottom: 5 }}>BANK DETAILS :</div>
                      <div><b>Bank Name</b> &nbsp;: CUB BANK</div>
                      <div><b>Bank A/c. No</b> : 512020010024703</div>
                      <div><b>IFSC - Code</b> &nbsp;: CIUB0000551</div>
                      <div><b>Branch</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: SALEM AMMAPET.</div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10 }}>
                      <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: 3 }}>Terms &amp; Conditions :</div>
                      <ol style={{ paddingLeft: 14, margin: 0, lineHeight: 1.65 }}>
                        <li>Interest will be charged @ 24% in bill, if payment not received within 30 days.</li>
                        <li>We are not responsible for any loss or damage in transit</li>
                        <li>Goods once sold cannot be taken under any circumstances.</li>
                        <li>All dispute subject to SALEM Jurisdiction</li>
                      </ol>
                    </div>
                  </div>
                  <div>
                    {[
                      ["Total Amount Before Tax", money(taxable), false],
                      [`CGST ........ ${(tax.gstRate / 2).toFixed(1)} %`, money(tax.cgst), false],
                      [`SGST ........ ${(tax.gstRate / 2).toFixed(1)} %`, money(tax.sgst), false],
                      [`IGST ........ ${tax.gstRate.toFixed(1)} %`, money(tax.igst), false],
                      ["Round off", (tax.roundOff >= 0 ? "+" : "") + money(tax.roundOff), false],
                      ["Total Amount After Tax", money(totalAmount), true],
                      ["Already Paid", money(paid), false],
                      ["Balance", money(balance), true],
                    ].map(([label, value, highlight]) => (
                      <div key={label as string} className="srow" style={highlight ? { background: "#e8f5e9" } : {}}>
                        <span style={highlight ? { fontWeight: "bold", color: "#1b5e20" } : {}}>{label}</span>
                        <span style={{ fontWeight: "bold", color: highlight ? "#1b5e20" : "inherit" }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 40, padding: "0 14px 14px", textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", fontSize: 14, color: "#1b5e20" }}>For {shopName || "AK FABRICS"}</div>
                      <div style={{ marginTop: 34, fontSize: 11 }}>Authorised Signatory.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoicePage;
