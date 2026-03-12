import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, Clock, Mic, List, Upload, ScanLine, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Account } from '../types';

const API = import.meta.env.VITE_API_URL;

type ModuleContext = 'sales' | 'purchases' | 'general';

interface AddTransactionProps {
  accounts: Account[];
}

const AddTransaction: React.FC<AddTransactionProps> = ({ accounts }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const moduleFromState = (location.state as any)?.module as ModuleContext | undefined;
  const moduleContext: ModuleContext = moduleFromState === 'sales' || moduleFromState === 'purchases' ? moduleFromState : 'general';

  const partyAccounts = useMemo(() => {
    if (moduleContext === 'sales') return accounts.filter(a => String(a.type || '').toUpperCase() === 'CUSTOMER');
    if (moduleContext === 'purchases') return accounts.filter(a => String(a.type || '').toUpperCase() === 'VENDOR');
    return accounts.filter(a => ['CUSTOMER', 'VENDOR'].includes(String(a.type || '').toUpperCase()));
  }, [accounts, moduleContext]);

  const counterAccounts = useMemo(() => {
    const preferred = accounts.filter(a => ['CASH', 'BANK'].includes(String(a.type || '').toUpperCase()));
    if (preferred.length) return preferred;
    return accounts;
  }, [accounts]);

  const [accountId, setAccountId] = useState<string>(partyAccounts[0]?.id || '');
  const [billAmt, setBillAmt] = useState('');
  const [paidAmt, setPaidAmt] = useState('');
  const [notes, setNotes] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txTime, setTxTime] = useState(new Date().toTimeString().slice(0, 5));
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedParty = partyAccounts.find(a => String(a.id) === String(accountId));
  const counterpartyId = counterAccounts.find(a => String(a.id) !== String(accountId))?.id || '';
  const backPath = moduleContext === 'sales' ? '/sales' : moduleContext === 'purchases' ? '/purchases' : '/';

  const handleSave = async () => {
    const bill = Number(billAmt || 0);
    const paid = Number(paidAmt || 0);
    if (!accountId) return alert('Select account');
    if (bill > 0 && paid > 0) return alert('Enter either Bill Amt or Paid Amt');
    if (!(bill > 0) && !(paid > 0)) return alert('Enter amount');
    if (!counterpartyId) return alert('No Cash/Bank account found');

    const isBill = bill > 0;
    const amount = isBill ? bill : paid;
    const payload = {
      module: moduleContext,
      paid_account_id: isBill ? counterpartyId : accountId,
      received_account_id: isBill ? accountId : counterpartyId,
      amount,
      transfer_date: txDate,
      transfer_time: txTime,
      note: notes || (isBill ? 'BILL AMT' : 'PAID AMT'),
      due_date: dueDate || null,
    };

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Save failed');
      navigate(backPath, { replace: true });
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setScanLoading(true);
    setScanError('');
    setScanSuccess(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const endpoint = moduleContext === 'purchases' ? 'purchases/scan-image' : 'sales/scan-image';
      const res = await fetch(`${API}/api/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to scan');
      setScanSuccess(data);
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan');
    } finally {
      setScanLoading(false);
    }
  };

  const openScannedInvoice = () => {
    if (!scanSuccess) return;
    const invoiceId = moduleContext === 'purchases' ? scanSuccess.purchaseId : scanSuccess.salesId;
    if (!invoiceId) return;
    setShowScanner(false);
    navigate(moduleContext === 'purchases' ? `/purchase-invoice/${invoiceId}` : `/sales/${invoiceId}`);
  };

  const openLatestInvoice = async () => {
    try {
      const endpoint = moduleContext === 'purchases' ? 'purchases' : 'sales';
      const res = await fetch(`${API}/api/${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const rows = await res.json().catch(() => []);
      if (!res.ok || !rows?.length) return alert('No invoice found');
      const first = rows[0];
      navigate(moduleContext === 'purchases' ? `/purchase-invoice/${first.id}` : `/sales/${first.id}`);
    } catch {
      alert('Failed to open invoice');
    }
  };

  return (
    <div className="min-h-screen bg-[#e9ecef]">
      <div className="bg-[#2196f3] text-white px-3 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-semibold text-xl leading-none">Add Transaction</h1>
      </div>

      <div className="p-2 space-y-2">
        <div className="bg-white border border-gray-300 rounded-md px-2 py-1.5 flex items-center gap-2">
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full outline-none text-xl text-gray-700 bg-transparent"
          >
            <option value="">Select Account</option>
            {partyAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-300 rounded-md p-2">
          <div className="border border-gray-700 rounded px-3 py-2 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-2xl text-green-700 font-semibold">Bill Amt</p>
              <input
                value={billAmt}
                onChange={e => { setBillAmt(e.target.value); if (e.target.value) setPaidAmt(''); }}
                type="number"
                min="0"
                step="0.01"
                className="w-full outline-none text-lg"
                placeholder="enter the bill amount"
              />
            </div>
            <button className="text-blue-500"><List className="w-5 h-5" /></button>
          </div>

          <p className="text-center text-base text-red-600 font-semibold py-1">or</p>

          <div className="border border-gray-700 rounded px-3 py-2 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-2xl text-red-600 font-semibold">Paid Amt</p>
              <input
                value={paidAmt}
                onChange={e => { setPaidAmt(e.target.value); if (e.target.value) setBillAmt(''); }}
                type="number"
                min="0"
                step="0.01"
                className="w-full outline-none text-lg"
                placeholder="Paid amount"
              />
            </div>
            <button className="text-blue-500"><List className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-md px-3 py-2 flex items-center gap-2">
          <Mic className="w-5 h-5 text-black" />
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full outline-none text-base"
            placeholder="Write notes here [Optional]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-white border border-gray-300 rounded-md py-2 text-base font-semibold text-gray-800 flex items-center justify-center gap-2"
          >
            Scan purchase bill <Camera className="w-5 h-5 text-blue-500" />
          </button>
          <button
            onClick={openLatestInvoice}
            className="bg-white border border-gray-300 rounded-md py-2 text-base font-semibold text-gray-800 flex items-center justify-center gap-2"
          >
            Invoice bill Generate <List className="w-5 h-5 text-blue-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-gray-300 rounded-md px-3 py-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full outline-none text-base" />
          </div>
          <div className="bg-white border border-gray-300 rounded-md px-3 py-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <input type="time" value={txTime} onChange={e => setTxTime(e.target.value)} className="w-full outline-none text-base" />
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-md px-3 py-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full outline-none text-base" placeholder="Due Date" />
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-[#e9ecef] p-2 grid grid-cols-2 gap-2">
        <button className="py-3 rounded bg-[#90caf9] text-[#1e88e5] font-semibold text-sm">SEND MESSAGE</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="py-3 rounded bg-[#2196f3] text-white font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>
      <div className="h-20" />
      {selectedParty ? null : null}

      {showScanner && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: 'rgba(2,8,23,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowScanner(false); setScanError(''); setScanSuccess(null); } }}
        >
          <div className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden bg-[#0f172a] border border-indigo-500/30">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-cyan-500" />
            <div className="flex justify-between items-center px-4 py-3">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-indigo-400" />
                <h3 className="text-white font-semibold text-sm">Scan {moduleContext === 'purchases' ? 'Purchase' : 'Sales'} Bill</h3>
              </div>
              <button onClick={() => setShowScanner(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {!scanLoading && !scanSuccess && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.currentTarget.value = '';
                }}
              />
              {scanLoading && (
                <div className="text-center py-4 text-slate-300 text-sm">Processing image...</div>
              )}
              {scanError && (
                <div className="flex items-center gap-2 text-rose-300 text-sm">
                  <AlertCircle className="w-4 h-4" /> {scanError}
                </div>
              )}
              {scanSuccess && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 text-sm">
                    <CheckCircle className="w-4 h-4" /> Invoice detected
                  </div>
                  <button
                    onClick={openScannedInvoice}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
                  >
                    Open Invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTransaction;
