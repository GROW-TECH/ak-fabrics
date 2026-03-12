import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, IndianRupee } from 'lucide-react';
import { Account, Transaction, TransactionType } from '../types';

interface TransferProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
}

const API = import.meta.env.VITE_API_URL;

type ModuleContext = 'sales' | 'purchases' | 'general';

const Transfer: React.FC<TransferProps> = ({ accounts, onAddTransaction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as any) || {};
  const moduleFromState = routeState?.module as ModuleContext | undefined;
  const moduleContext: ModuleContext = moduleFromState === 'sales' || moduleFromState === 'purchases' ? moduleFromState : 'general';
  const quickEntry = Boolean(routeState?.quickEntry && routeState?.partyAccountId);
  const quickEntryType = routeState?.entryType === 'PAID' ? 'PAID' : 'RECEIVED';
  const partyAccountId = String(routeState?.partyAccountId || '');
  const backTo = String(routeState?.backTo || '');

  const [amount, setAmount] = useState('');
  const [paidAccountId, setPaidAccountId] = useState('');
  const [receivedAccountId, setReceivedAccountId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);

  const partyAccounts = useMemo(() => {
    if (moduleContext === 'sales') return accounts.filter(a => String(a.type || '').toUpperCase() === 'CUSTOMER');
    if (moduleContext === 'purchases') return accounts.filter(a => String(a.type || '').toUpperCase() === 'VENDOR');
    return accounts.filter(a => ['CUSTOMER', 'VENDOR'].includes(String(a.type || '').toUpperCase()));
  }, [accounts, moduleContext]);

  const backPath = moduleContext === 'sales' ? '/sales' : moduleContext === 'purchases' ? '/purchases' : '/';
  const partyLabel = moduleContext === 'sales' ? 'Customer' : moduleContext === 'purchases' ? 'Vendor' : 'Party';
  const counterAccounts = useMemo(
    () => accounts.filter(a => ['CASH', 'BANK'].includes(String(a.type || '').toUpperCase())),
    [accounts]
  );
  const quickParty = useMemo(() => accounts.find(a => String(a.id) === String(partyAccountId)), [accounts, partyAccountId]);
  const quickCounterpartyId = counterAccounts[0]?.id || '';

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/transfers?module=${moduleContext}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setTransfers(await res.json());
      else setTransfers([]);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [moduleContext]);

  useEffect(() => {
    if (!partyAccounts.length) return;
    if (quickEntry) return;
    if (!paidAccountId) setPaidAccountId(partyAccounts[0].id);
    if (!receivedAccountId && partyAccounts[1]) setReceivedAccountId(partyAccounts[1].id);
    if (!receivedAccountId && !partyAccounts[1]) setReceivedAccountId(partyAccounts[0].id);
  }, [partyAccounts, quickEntry]);

  useEffect(() => {
    if (!quickEntry || !partyAccountId || !quickCounterpartyId) return;
    if (quickEntryType === 'RECEIVED') {
      setPaidAccountId(partyAccountId);
      setReceivedAccountId(quickCounterpartyId);
    } else {
      setPaidAccountId(quickCounterpartyId);
      setReceivedAccountId(partyAccountId);
    }
  }, [quickEntry, quickEntryType, partyAccountId, quickCounterpartyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount || 0);
    if (!(numericAmount > 0)) return alert('Enter valid amount');

    const fallbackCounterpartyId =
      counterAccounts.find(a => String(a.id) !== String(partyAccountId))?.id ||
      accounts.find(a => String(a.id) !== String(partyAccountId))?.id ||
      '';

    const resolvedCounterpartyId = quickCounterpartyId || fallbackCounterpartyId;
    const resolvedPaidAccountId = quickEntry
      ? (quickEntryType === 'RECEIVED' ? partyAccountId : resolvedCounterpartyId)
      : paidAccountId;
    const resolvedReceivedAccountId = quickEntry
      ? (quickEntryType === 'RECEIVED' ? resolvedCounterpartyId : partyAccountId)
      : receivedAccountId;

    if (!resolvedPaidAccountId || !resolvedReceivedAccountId) {
      return alert(quickEntry ? 'No counter account found. Please create a Cash or Bank account.' : `Select ${partyLabel.toLowerCase()} names`);
    }
    if (resolvedPaidAccountId === resolvedReceivedAccountId) return alert('Paid and Received cannot be same');

    setSaving(true);
    try {
      const payload = {
        module: moduleContext,
        paid_account_id: resolvedPaidAccountId,
        received_account_id: resolvedReceivedAccountId,
        amount: numericAmount,
        transfer_date: transferDate,
        transfer_time: null,
        note: note || (quickEntry ? (quickEntryType === 'PAID' ? 'YOU PAID' : 'YOU RECEIVED') : null),
      };
      const res = await fetch(`${API}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Transfer failed');

      if (!quickEntry) {
        const paidName = accounts.find(a => a.id === resolvedPaidAccountId)?.name || 'Paid Party';
        const receivedName = accounts.find(a => a.id === resolvedReceivedAccountId)?.name || 'Received Party';
        const txDate = new Date(transferDate).toLocaleDateString('en-IN');
        const baseId = String(data.id || Date.now());
        onAddTransaction({
          id: `${baseId}-pay`,
          date: txDate,
          type: TransactionType.PAYMENT,
          accountId: resolvedReceivedAccountId,
          amount: numericAmount,
          taxableAmount: 0,
          taxAmount: 0,
          description: `Transfer paid to ${receivedName}`,
        });
        onAddTransaction({
          id: `${baseId}-rec`,
          date: txDate,
          type: TransactionType.RECEIPT,
          accountId: resolvedPaidAccountId,
          amount: numericAmount,
          taxableAmount: 0,
          taxAmount: 0,
          description: `Transfer received from ${paidName}`,
        });
      }

      setAmount('');
      setNote('');
      setTransfers(prev => [data, ...prev]);
      if (quickEntry && backTo) {
        navigate(backTo, { replace: true });
        return;
      }
      navigate(backPath);
    } catch {
      alert('Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f5]">
      <div className="bg-[#2196f3] text-white px-3 py-3 flex items-center gap-3">
        <button onClick={() => navigate(backPath)} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-xl">{quickEntry ? 'Add Transaction' : 'Transfer'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-2 space-y-2">
        {quickEntry && (
          <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
            <p className="text-lg font-semibold text-gray-900">{routeState?.partyName || quickParty?.name || '-'}</p>
            <p className="text-sm text-gray-700">
              Balance{' '}
              <span className="font-semibold text-green-700">
                {Math.abs(Number(quickParty?.balance || 0)).toLocaleString('en-IN')} {Number(quickParty?.balance || 0) < 0 ? 'Due' : 'Advance'}
              </span>
            </p>
          </div>
        )}

        <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
          <label className={`text-sm block mb-1 ${quickEntryType === 'PAID' ? 'text-red-600' : 'text-green-700'}`}>
            {quickEntry ? (quickEntryType === 'PAID' ? 'You Paid' : 'You Received') : 'Amount'}
          </label>
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-gray-500" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full outline-none text-base"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {!quickEntry && (
          <>
            <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
              <label className="text-sm text-gray-800 block mb-1">Paid ({partyLabel})</label>
              <select
                value={paidAccountId}
                onChange={e => setPaidAccountId(e.target.value)}
                className="w-full outline-none bg-transparent text-base"
                required
              >
                <option value="">Select {partyLabel}</option>
                {partyAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
              <label className="text-sm text-gray-800 block mb-1">Received ({partyLabel})</label>
              <select
                value={receivedAccountId}
                onChange={e => setReceivedAccountId(e.target.value)}
                className="w-full outline-none bg-transparent text-base"
                required
              >
                <option value="">Select {partyLabel}</option>
                {partyAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-2">
          <div className="bg-white border border-gray-300 rounded-md px-3 py-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <input
              type="date"
              value={transferDate}
              onChange={e => setTransferDate(e.target.value)}
              className="w-full outline-none text-base"
              required
            />
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-md px-3 py-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full outline-none text-base"
            placeholder="Write notes here [Optional]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="w-full py-2.5 bg-[#90caf9] text-[#1e88e5] rounded-md font-semibold"
          >
            SEND MESSAGE
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#2196f3] text-white rounded-md font-semibold disabled:opacity-70"
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </form>

      <div className="px-2 pb-24">
        <h3 className="text-xs font-semibold text-gray-500 px-1 mb-2">Recent Transfers</h3>
        {loading ? (
          <div className="text-center text-xs text-gray-500 py-6">Loading...</div>
        ) : transfers.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-6">No transfers yet</div>
        ) : (
          <div className="space-y-2">
            {transfers.slice(0, 20).map((t: any) => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-md px-3 py-2">
                <p className="text-sm font-semibold text-gray-900">
                  {t.paid_account_name || 'Paid'} {'->'} {t.received_account_name || 'Received'}
                </p>
                <p className="text-xs text-gray-500">
                  Rs {Number(t.amount || 0).toLocaleString()} | {t.transfer_date || ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transfer;
