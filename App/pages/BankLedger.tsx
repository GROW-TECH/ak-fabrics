import React, { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Search, ChevronDown } from 'lucide-react';

interface Bank {
  id: number;
  bank_name: string;
  ifsc_code: string;
  account_number: string;
}

interface TxRow {
  id: string | number;
  date: string;
  bank_name: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  description?: string;
  reference_no?: string;
}

type Period = 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type SortOption =
  | 'NAME_ASC' | 'NAME_DESC'
  | 'AMOUNT_ASC' | 'AMOUNT_DESC'
  | 'DATE_ASC' | 'DATE_DESC'
  | 'DEPOSIT_ONLY' | 'WITHDRAWAL_ONLY';
type ModalMode = 'DEPOSIT' | 'WITHDRAWAL';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'DATE_DESC',       label: 'Date Descending'   },
  { id: 'DATE_ASC',        label: 'Date Ascending'    },
  { id: 'NAME_ASC',        label: 'Name Ascending'    },
  { id: 'NAME_DESC',       label: 'Name Descending'   },
  { id: 'AMOUNT_ASC',      label: 'Amount Ascending'  },
  { id: 'AMOUNT_DESC',     label: 'Amount Descending' },
  { id: 'DEPOSIT_ONLY',    label: 'Deposits Only'     },
  { id: 'WITHDRAWAL_ONLY', label: 'Withdrawals Only'  },
];

const API = import.meta.env.VITE_API_URL;
const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN');

const getField = (obj: any, ...keys: string[]) => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
};

const emptyForm = (bankName = '') => ({
  date: new Date().toISOString().slice(0, 10),
  bank_name: bankName,
  deposit: '',
  withdrawal: '',
  description: '',
  reference_no: '',
});

const BankLedger: React.FC = () => {
  const [banks, setBanks]               = useState<Bank[]>([]);
  const [rows, setRows]                 = useState<TxRow[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [loading, setLoading]           = useState(true);
  const [period, setPeriod]             = useState<Period>('ALL');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [modalMode, setModalMode]       = useState<ModalMode>('DEPOSIT');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOption, setSortOption]     = useState<SortOption>('DATE_DESC');
  const [showBalance, setShowBalance]   = useState(true);
  const [showSearch, setShowSearch]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [form, setForm]                 = useState(emptyForm());

  useEffect(() => { fetchBanks(); }, []);
  useEffect(() => { fetchTransactions(selectedBank?.id || null); }, [selectedBank]);

  const fetchBanks = async () => {
    try {
      const res  = await fetch(`${API}/api/banks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data: Bank[] = res.ok ? await res.json() : [];
      setBanks(data);
      if (data.length > 0) setSelectedBank(data[0]);
    } catch {
      setBanks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (bankId: number | null = null) => {
    try {
      const [sRes, pRes, btRes] = await Promise.all([
        fetch(`${API}/api/sales`,     { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API}/api/purchases`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API}/api/bank-transactions${bankId ? `?bank_id=${bankId}` : ''}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
      ]);

      const salesData:     any[] = sRes.ok  ? await sRes.json()  : [];
      const purchasesData: any[] = pRes.ok  ? await pRes.json()  : [];
      const bankTxData:    any[] = btRes.ok ? await btRes.json() : [];
      const all: TxRow[] = [];

      salesData.forEach((s: any) => {
        const sBankId  = getField(s, 'bank_id', 'bankId');
        const paid     = Number(getField(s, 'paid_amount', 'paidAmount') || 0);
        const mode     = String(getField(s, 'payment_mode', 'paymentMode') || '').toUpperCase();
        const bankName = getField(s, 'bank_name', 'bankName') || '';
        const matchById   = bankId && sBankId !== undefined && sBankId !== null && Number(sBankId) === bankId;
        const matchByName = !bankId && !sBankId && mode === 'BANK TRANSFER' && bankName;
        if ((matchById || matchByName) && paid > 0) {
          all.push({
            id: `sale-${s.id}`, date: getField(s, 'created_at', 'date') || new Date().toISOString(),
            bank_name: bankName || '', deposit: paid, withdrawal: 0, balance: 0,
            description: `Sales – ${getField(s, 'customer_name', 'customerName') || 'Customer'}`,
            reference_no: getField(s, 'invoice_no', 'invoiceNo') || '',
          });
        }
      });

      purchasesData.forEach((p: any) => {
        const pBankId  = getField(p, 'bank_id', 'bankId');
        const paid     = Number(getField(p, 'paid_amount', 'paidAmount') || 0);
        const mode     = String(getField(p, 'payment_mode', 'paymentMode') || '').toUpperCase();
        const bankName = getField(p, 'bank_name', 'bankName') || '';
        const matchById   = bankId && pBankId !== undefined && pBankId !== null && Number(pBankId) === bankId;
        const matchByName = !bankId && !pBankId && mode === 'BANK TRANSFER' && bankName;
        if ((matchById || matchByName) && paid > 0) {
          all.push({
            id: `purchase-${p.id}`, date: getField(p, 'created_at', 'date') || new Date().toISOString(),
            bank_name: bankName || '', deposit: 0, withdrawal: paid, balance: 0,
            description: `Purchase – ${getField(p, 'vendor_name', 'vendorName') || 'Vendor'}`,
            reference_no: getField(p, 'invoice_no', 'invoiceNo') || '',
          });
        }
      });

      bankTxData.forEach((bt: any) => {
        const bank = banks.find(b => Number(b.id) === Number(bt.bank_id))
                  || (selectedBank && Number(selectedBank.id) === Number(bt.bank_id) ? selectedBank : null);
        all.push({
          id: bt.id, date: bt.date,
          bank_name: bank?.bank_name || selectedBank?.bank_name || bt.bank_name || '—',
          deposit: Number(bt.deposit || 0), withdrawal: Number(bt.withdrawal || 0),
          balance: Number(bt.balance || 0),
          description: bt.description || undefined, reference_no: bt.reference_no || undefined,
        });
      });

      all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let running = 0;
      all.forEach(t => { running += t.deposit - t.withdrawal; t.balance = running; });
      setRows(all);
    } catch (e) {
      console.error('BankLedger fetchTransactions error:', e);
      setRows([]);
    }
  };

  const openModal = (mode: ModalMode) => {
    setForm(emptyForm(selectedBank?.bank_name || ''));
    setModalMode(mode);
    setShowModal(true);
  };

  const filteredByPeriod = rows.filter(t => {
    const now = new Date(); const d = new Date(t.date);
    if (period === 'DAILY')   return d.toDateString() === now.toDateString();
    if (period === 'WEEKLY')  return d.getTime() >= now.getTime() - 7 * 86400000;
    if (period === 'MONTHLY') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'YEARLY')  return d.getFullYear() === now.getFullYear();
    return true;
  });

  const filtered = [...filteredByPeriod]
    .filter(t => {
      if (sortOption === 'DEPOSIT_ONLY')    return t.deposit > 0;
      if (sortOption === 'WITHDRAWAL_ONLY') return t.withdrawal > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'DATE_ASC'  || sortOption === 'DEPOSIT_ONLY' || sortOption === 'WITHDRAWAL_ONLY')
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOption === 'DATE_DESC')   return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOption === 'AMOUNT_ASC')  return (a.deposit + a.withdrawal) - (b.deposit + b.withdrawal);
      if (sortOption === 'AMOUNT_DESC') return (b.deposit + b.withdrawal) - (a.deposit + a.withdrawal);
      if (sortOption === 'NAME_ASC')    return a.bank_name.localeCompare(b.bank_name);
      if (sortOption === 'NAME_DESC')   return b.bank_name.localeCompare(a.bank_name);
      return 0;
    });

  const q = searchQuery.trim().toLowerCase();
  const displayRows = q
    ? filtered.filter(t =>
        t.bank_name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.reference_no || '').toLowerCase().includes(q) ||
        String(t.deposit).includes(q) ||
        String(t.withdrawal).includes(q)
      )
    : filtered;

  const totalDeposit    = displayRows.reduce((s, t) => s + t.deposit, 0);
  const totalWithdrawal = displayRows.reduce((s, t) => s + t.withdrawal, 0);
  const finalBalance    = totalDeposit - totalWithdrawal;

  const handleAdd = async () => {
    const deposit    = modalMode === 'DEPOSIT'    ? parseFloat(form.deposit    || '0') : 0;
    const withdrawal = modalMode === 'WITHDRAWAL' ? parseFloat(form.withdrawal || '0') : 0;
    if (!deposit && !withdrawal) return;
    const formBank = banks.find(b => b.bank_name === form.bank_name);
    try {
      const res = await fetch(`${API}/api/bank-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          bank_id: formBank?.id || null, date: form.date, deposit, withdrawal,
          description: form.description || null, reference_no: form.reference_no || null,
        }),
      });
      if (res.ok) {
        await fetchTransactions(formBank?.id || null);
        setForm(emptyForm(selectedBank?.bank_name || ''));
        setShowModal(false);
      } else {
        alert('Failed to add transaction');
      }
    } catch (error) {
      console.error('Add transaction error:', error);
      alert('Failed to add transaction');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!loading && banks.length === 0) return (
    <div className="min-h-screen bg-[#dfe3e8] flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-2xl">🏦</span></div>
      <p className="text-gray-700 font-semibold text-base text-center">No bank accounts found</p>
      <p className="text-gray-500 text-sm text-center">Add a bank account in Settings to view transactions here.</p>
      <button onClick={() => history.back()} className="mt-2 bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-semibold">Go Back</button>
    </div>
  );

  const isDeposit = modalMode === 'DEPOSIT';

  return (
    <div className="min-h-screen bg-[#dfe3e8] md:bg-gray-50">

      {/* ════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════════════════════ */}
      <div className="md:hidden">

        {/* Fixed mobile header */}
        <div className="fixed inset-x-0 top-0 z-50">
          <div className="bg-[#2196f3] text-white px-3 pt-3 pb-0 relative">
            <div className="flex items-center justify-between pb-2">
              <button onClick={() => history.back()} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
              <button onClick={() => setShowDropdown(v => !v)} className="flex items-center gap-1 font-bold text-sm tracking-wide">
                {selectedBank ? selectedBank.bank_name.toUpperCase() : 'TRANSACTIONS'}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowSearch(v => !v); setSearchQuery(''); }} className="p-1">
                  <Search className="w-5 h-5 opacity-80" />
                </button>
                <button onClick={() => setShowSortMenu(v => !v)} className="p-1"><MoreVertical className="w-5 h-5 opacity-80" /></button>
              </div>
            </div>

            {showSearch && (
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 mb-2">
                <Search className="w-4 h-4 opacity-70 flex-shrink-0" />
                <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, amount, ref…"
                  className="flex-1 bg-transparent text-white placeholder-white/60 text-[13px] outline-none" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white/70 text-xs font-bold">✕</button>}
              </div>
            )}

            {showDropdown && (
              <>
                <button type="button" className="fixed inset-0 z-[49]" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 right-0 top-[44px] bg-white shadow-2xl rounded-b-xl z-50 overflow-hidden border-t border-blue-100">
                  {banks.map(b => (
                    <button key={b.id} onClick={() => { setSelectedBank(b); setShowDropdown(false); }}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 flex items-center justify-between ${selectedBank?.id === b.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800'}`}>
                      <div>
                        <p className="font-medium">{b.bank_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{b.account_number || b.ifsc_code}</p>
                      </div>
                      {selectedBank?.id === b.id && <span className="text-blue-500 text-xs font-bold">✓ Active</span>}
                    </button>
                  ))}
                </div>
              </>
            )}

            {showSortMenu && (
              <>
                <button type="button" className="fixed inset-0 z-[74]" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-2 top-12 bg-white rounded-xl shadow-2xl border border-gray-100 z-[75] w-[200px] overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sort & Filter</p>
                  </div>
                  {SORT_OPTIONS.map(opt => {
                    const isActive = sortOption === opt.id;
                    return (
                      <button key={opt.id} onClick={() => { setSortOption(opt.id); setShowSortMenu(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-[13px] border-b border-gray-50 last:border-0 transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <span>{opt.label}</span>
                        <span className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${isActive ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}`}>
                          {isActive && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center justify-between pb-1.5">
              <p className="text-[11px] opacity-80">Transactions &nbsp;<span className="font-semibold">{displayRows.length}</span></p>
              <button onClick={() => setShowBalance(v => !v)} className="flex items-center gap-1.5 bg-white/15 rounded-full px-2 py-0.5">
                <span className="text-[10px] font-semibold opacity-80">BAL</span>
                <span className={`relative inline-flex w-8 h-4 rounded-full transition-colors duration-200 ${showBalance ? 'bg-green-400' : 'bg-white/30'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${showBalance ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
                {showBalance && (
                  <span className={`text-[10px] font-bold ${finalBalance < 0 ? 'text-red-300' : 'text-white'}`}>
                    ₹{fmt(Math.abs(finalBalance))}{finalBalance < 0 ? ' Dr' : ''}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#2196f3] px-2 pb-2">
            <div className="grid grid-cols-5 gap-1">
              {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`text-[11px] rounded-full py-1.5 font-semibold transition-all ${period === p ? 'bg-white text-[#1565c0] shadow' : 'bg-white/20 text-white'}`}>
                  {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid text-[10px] font-bold border-b-2 border-gray-300 px-2 py-1.5 bg-gray-50 ${showBalance ? 'grid-cols-[52px_minmax(0,1fr)_70px_76px_72px]' : 'grid-cols-[52px_minmax(0,1fr)_80px_80px]'}`}>
            <p className="text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-gray-500 uppercase tracking-wide">Bank Name / Note</p>
            <p className="text-green-700 text-center uppercase tracking-wide">Deposit</p>
            <p className="text-red-600 text-center uppercase tracking-wide">Withdrawal</p>
            {showBalance && <p className="text-gray-700 text-right uppercase tracking-wide">Balance</p>}
          </div>
        </div>

        {/* Mobile rows */}
        <div className="pt-[116px] pb-[108px] bg-white">
          {displayRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🏦</div>
              <p className="text-gray-400 text-sm font-medium">{searchQuery ? 'No results found' : 'No transactions for this bank'}</p>
              <p className="text-gray-300 text-xs">{searchQuery ? `No transactions match "${searchQuery}"` : <>Sales &amp; purchases paid via <span className="font-semibold">{selectedBank?.bank_name}</span> will appear here.</>}</p>
            </div>
          ) : (
            displayRows.map((t, idx) => (
              <div key={`${t.id}-${idx}`}
                className={`grid px-2 py-2.5 border-b border-gray-100 items-start gap-x-1 ${showBalance ? 'grid-cols-[52px_minmax(0,1fr)_70px_76px_72px]' : 'grid-cols-[52px_minmax(0,1fr)_80px_80px]'} ${t.deposit > 0 ? 'bg-green-50/30' : 'bg-red-50/20'}`}>
                <div>
                  <p className="text-[10px] text-gray-700 font-semibold leading-tight">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                  <p className="text-[9px] text-gray-400">{new Date(t.date).getFullYear().toString().slice(2)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-700 font-semibold truncate">{t.bank_name || selectedBank?.bank_name || '—'}</p>
                  {t.description  && <p className="text-[9px] text-gray-400 truncate mt-0.5">{t.description}</p>}
                  {t.reference_no && <p className="text-[8px] text-gray-300 truncate">{t.reference_no}</p>}
                </div>
                <p className={`text-center font-bold text-[11px] ${t.deposit > 0 ? 'text-green-700' : 'text-gray-300'}`}>{t.deposit > 0 ? fmt(t.deposit) : '—'}</p>
                <p className={`text-center font-bold text-[11px] ${t.withdrawal > 0 ? 'text-red-600' : 'text-gray-300'}`}>{t.withdrawal > 0 ? fmt(t.withdrawal) : '—'}</p>
                {showBalance && (
                  <p className={`text-right font-bold text-[11px] ${t.balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                    {fmt(Math.abs(t.balance))}{t.balance < 0 && <span className="text-[8px] text-red-400 block">Dr</span>}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Mobile fixed footer */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.10)]">
          <div className="grid grid-cols-2 gap-3 px-3 pt-2.5 pb-1.5">
            <button onClick={() => openModal('DEPOSIT')} className="flex items-center justify-center gap-2 bg-green-500 active:bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold tracking-wide shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              Deposit
            </button>
            <button onClick={() => openModal('WITHDRAWAL')} className="flex items-center justify-center gap-2 bg-red-500 active:bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold tracking-wide shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              Withdraw
            </button>
          </div>
          <div className="grid grid-cols-3 text-center border-t border-gray-100 divide-x divide-gray-100 pb-1">
            <div className="py-1.5 px-1">
              <p className="text-green-600 text-[9px] font-semibold uppercase tracking-wide">Total Deposit</p>
              <p className="text-green-600 font-extrabold text-[13px]">₹{fmt(totalDeposit)}</p>
            </div>
            <div className="py-1.5 px-1">
              <p className="text-red-500 text-[9px] font-semibold uppercase tracking-wide">Total Withdrawal</p>
              <p className="text-red-500 font-extrabold text-[13px]">₹{fmt(totalWithdrawal)}</p>
            </div>
            <div className="py-1.5 px-1">
              <p className="text-gray-500 text-[9px] font-semibold uppercase tracking-wide">Balance</p>
              <p className={`font-extrabold text-[13px] ${finalBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                ₹{fmt(Math.abs(finalBalance))}{finalBalance < 0 && <span className="text-[9px] text-red-400 ml-0.5">Dr</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          DESKTOP LAYOUT — Clean, non-overlapping
      ════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">

        {/* Page header — NOT sticky, just normal flow */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: back + title + bank selector */}
            <div className="flex items-center gap-4">
              <button onClick={() => history.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bank Ledger</h1>
                <p className="text-sm text-gray-500">{selectedBank?.bank_name} · {selectedBank?.account_number || selectedBank?.ifsc_code}</p>
              </div>
              {/* Bank selector */}
              <div className="relative ml-2">
                <button onClick={() => setShowDropdown(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-blue-600 hover:bg-gray-50 transition-colors">
                  {selectedBank?.bank_name || 'Select Bank'}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showDropdown && (
                  <>
                    <button type="button" className="fixed inset-0 z-[49]" onClick={() => setShowDropdown(false)} />
                    <div className="absolute left-0 top-11 bg-white shadow-2xl rounded-xl z-50 border border-gray-100 min-w-[220px] overflow-hidden">
                      {banks.map(b => (
                        <button key={b.id} onClick={() => { setSelectedBank(b); setShowDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 flex items-center justify-between hover:bg-gray-50 ${selectedBank?.id === b.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800'}`}>
                          <div>
                            <p className="font-medium">{b.bank_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{b.account_number || b.ifsc_code}</p>
                          </div>
                          {selectedBank?.id === b.id && <span className="text-blue-500 text-xs font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: search only */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
              )}
            </div>
          </div>

          {/* Period filter tabs — second row */}
          <div className="flex items-center gap-1 mt-3">
            {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4 px-6 py-5">
          {[
            { label: 'Transactions',     value: String(displayRows.length),                                            color: 'text-gray-900',  border: 'border-blue-400'  },
            { label: 'Total Deposit',    value: `₹${fmt(totalDeposit)}`,                                               color: 'text-green-600', border: 'border-green-400' },
            { label: 'Total Withdrawal', value: `₹${fmt(totalWithdrawal)}`,                                            color: 'text-red-500',   border: 'border-red-400'   },
            { label: 'Balance',          value: `₹${fmt(Math.abs(finalBalance))}${finalBalance < 0 ? ' Dr' : ''}`,
              color: finalBalance < 0 ? 'text-red-600' : 'text-gray-900',
              border: finalBalance < 0 ? 'border-red-400' : 'border-gray-300' },
          ].map(c => (
            <div key={c.label} className={`bg-white rounded-xl border-t-4 ${c.border} p-4 shadow-sm`}>
              <p className="text-xs text-gray-500 font-medium mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="px-6 pb-24">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <div className="min-w-[680px]">
              {displayRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">🏦</div>
                  <p className="text-gray-500 font-semibold">{searchQuery ? 'No results found' : 'No transactions for this bank'}</p>
                  <p className="text-gray-400 text-sm">{searchQuery ? `No transactions match "${searchQuery}"` : 'Deposits and withdrawals will appear here.'}</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-[40px_110px_150px_1fr_110px_120px_110px] px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span>#</span>
                    <span>Date</span>
                    <span>Bank</span>
                    <span>Description / Ref</span>
                    <span className="text-center text-green-700">Deposit</span>
                    <span className="text-center text-red-600">Withdrawal</span>
                    <span className="text-right text-gray-700">Balance</span>
                  </div>

                  {/* Table rows */}
                  {displayRows.map((t, idx) => (
                    <div key={`${t.id}-${idx}`}
                      className={`grid grid-cols-[40px_110px_150px_1fr_110px_120px_110px] px-5 py-3.5 border-b border-gray-100 items-center hover:bg-gray-50/60 transition-colors ${t.deposit > 0 ? 'bg-green-50/10' : 'bg-red-50/5'}`}>
                      <span className="text-xs text-gray-400 font-medium">{idx + 1}</span>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-sm font-semibold text-blue-600 truncate pr-2">{t.bank_name || selectedBank?.bank_name || '—'}</p>
                      <div className="min-w-0 pr-3">
                        <p className="text-sm text-gray-700 truncate">{t.description || '—'}</p>
                        {t.reference_no && <p className="text-xs text-gray-400 truncate">{t.reference_no}</p>}
                      </div>
                      <p className={`text-center text-sm font-bold ${t.deposit > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                        {t.deposit > 0 ? `₹${fmt(t.deposit)}` : '—'}
                      </p>
                      <p className={`text-center text-sm font-bold ${t.withdrawal > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                        {t.withdrawal > 0 ? `₹${fmt(t.withdrawal)}` : '—'}
                      </p>
                      <p className={`text-right text-sm font-bold ${t.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        ₹{fmt(Math.abs(t.balance))}{t.balance < 0 && <span className="text-xs text-red-500 ml-1">Dr</span>}
                      </p>
                    </div>
                  ))}

                  {/* Footer summary */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Showing <span className="font-semibold text-gray-700">{displayRows.length}</span> transactions
                    </p>
                    <div className="flex items-center gap-6 text-sm font-bold">
                      <span className="text-green-600">Deposit: ₹{fmt(totalDeposit)}</span>
                      <span className="text-red-500">Withdrawal: ₹{fmt(totalWithdrawal)}</span>
                      <span className={finalBalance < 0 ? 'text-red-600' : 'text-gray-800'}>
                        Balance: ₹{fmt(Math.abs(finalBalance))}{finalBalance < 0 ? ' Dr' : ''}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating action buttons */}
        <div className="fixed bottom-6 right-6 flex gap-3 z-40">
          <button onClick={() => openModal('DEPOSIT')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            Add Deposit
          </button>
          <button onClick={() => openModal('WITHDRAWAL')}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            Add Withdrawal
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL — shared for mobile & desktop
      ════════════════════════════════════════════════════════════ */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setShowModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6 z-[61]">
            <div className="bg-white rounded-t-2xl md:rounded-2xl md:max-w-md md:w-full shadow-2xl px-4 pt-3 pb-6">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 md:hidden" />
              <div className={`flex items-center justify-between mb-4 pb-3 border-b-2 ${isDeposit ? 'border-green-100' : 'border-red-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDeposit ? 'bg-green-100' : 'bg-red-100'}`}>
                    <svg className={`w-4 h-4 ${isDeposit ? 'text-green-600' : 'text-red-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {isDeposit ? <path d="M12 5v14M5 12l7 7 7-7"/> : <path d="M12 19V5M5 12l7-7 7 7"/>}
                    </svg>
                  </div>
                  <h3 className={`text-base font-bold ${isDeposit ? 'text-green-700' : 'text-red-600'}`}>{isDeposit ? 'Add Deposit' : 'Add Withdrawal'}</h3>
                </div>
                <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">{selectedBank?.bank_name}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Select Bank</label>
                  <select value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Select bank account</option>
                    {banks.map(b => <option key={b.id} value={b.bank_name}>{b.bank_name} ({b.account_number})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  {isDeposit ? (
                    <>
                      <label className="text-xs text-green-600 mb-1 block font-bold">Deposit Amount (₹)</label>
                      <input type="number" placeholder="Enter deposit amount" value={form.deposit}
                        onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))}
                        className="w-full border-2 border-green-400 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </>
                  ) : (
                    <>
                      <label className="text-xs text-red-500 mb-1 block font-bold">Withdrawal Amount (₹)</label>
                      <input type="number" placeholder="Enter withdrawal amount" value={form.withdrawal}
                        onChange={e => setForm(f => ({ ...f, withdrawal: e.target.value }))}
                        className="w-full border-2 border-red-400 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400" />
                    </>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Reference No. (optional)</label>
                  <input type="text" placeholder="Ref / Cheque no." value={form.reference_no}
                    onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Description (optional)</label>
                  <input type="text" placeholder="e.g. Cash deposit, Cheque payment…" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={() => setShowModal(false)} className="border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                  <button onClick={handleAdd}
                    className={`text-white py-2.5 rounded-xl text-sm font-bold shadow-md active:scale-95 transition ${isDeposit ? 'bg-green-500 active:bg-green-600' : 'bg-red-500 active:bg-red-600'}`}>
                    {isDeposit ? '+ Add Deposit' : '− Add Withdrawal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BankLedger;