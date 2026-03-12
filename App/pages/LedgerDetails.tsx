import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Menu, MoreVertical, X, Eye, Calendar, Search, DollarSign,
  Share2, Printer, FileText, User, Trash2,
} from 'lucide-react';
import { Account } from '../types';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface LedgerDetailsProps {
  accounts: Account[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BAL_TOGGLE_KEY_PREFIX = 'ledger-show-balance-';

type Period = 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'DUE';

/* ─── Bottom-sheet menu items (matching the screenshot) ─── */
type MenuAction =
  | 'date'
  | 'date_range'
  | 'notes'
  | 'keyword'
  | 'amount'
  | 'share'
  | 'print'
  | 'report'
  | 'name_address'
  | 'deleted';

type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'amount_asc'
  | 'amount_desc'
  | 'last_transaction'
  | 'category'
  | 'report'
  | 'name_address';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc',         label: 'Name Ascending' },
  { value: 'name_desc',        label: 'Name Descending' },
  { value: 'amount_asc',       label: 'Amount Ascending' },
  { value: 'amount_desc',      label: 'Amount Descending' },
  { value: 'last_transaction', label: 'Last Transaction' },
  { value: 'category',         label: 'Category' },
  { value: 'report',           label: 'Report' },
  { value: 'name_address',     label: 'Your Name and Address' },
];

const MENU_ITEMS: { action: MenuAction; label: string; Icon: React.ElementType }[] = [
  { action: 'date',         label: 'Date',                  Icon: Calendar },
  { action: 'date_range',   label: 'Select Date Range',     Icon: Calendar },
  { action: 'notes',        label: 'Notes',                 Icon: Search },
  { action: 'keyword',      label: 'Keyword Search',        Icon: Search },
  { action: 'amount',       label: 'Amount',                Icon: DollarSign },
  { action: 'share',        label: 'Share',                 Icon: Share2 },
  { action: 'print',        label: 'Print',                 Icon: Printer },
  { action: 'report',       label: 'Report',                Icon: FileText },
  { action: 'name_address', label: 'Your Name and Address', Icon: User },
  { action: 'deleted',      label: 'Deleted Transactions',  Icon: Trash2 },
];

/* ─── Toggle ─── */
const BalanceToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-red-500'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

/* ════════════════════════════════════════════════════════════ */
const LedgerDetails: React.FC<LedgerDetailsProps> = ({ accounts }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = accounts.find(a => String(a.id) === String(id));

  /* ── State ── */
  const [period, setPeriod]             = useState<Period>('ALL');
  const [rows, setRows]                 = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [showBalance, setShowBalance]   = useState(true);
  const [showMenu, setShowMenu]         = useState(false);
  const [sortBy, setSortBy]             = useState<SortOption>('last_transaction');
  const [showSortMenu, setShowSortMenu] = useState(false);

  /* Filter / search state */
  const [filterDate, setFilterDate]         = useState('');           // single date YYYY-MM-DD
  const [filterFrom, setFilterFrom]         = useState('');           // date-range start
  const [filterTo, setFilterTo]             = useState('');           // date-range end
  const [filterNotes, setFilterNotes]       = useState('');           // notes keyword
  const [filterKeyword, setFilterKeyword]   = useState('');           // bill-no keyword
  const [filterAmount, setFilterAmount]     = useState('');           // exact / min amount
  const [showDeleted, setShowDeleted]       = useState(false);

  /* Which sub-panel is open inside the bottom sheet */
  const [activePanel, setActivePanel] = useState<MenuAction | null>(null);

  /* Ref for ledger content capture */
  const ledgerRef = useRef<HTMLDivElement>(null);

  /* Temporary input holders (committed on Apply) */
  const [tmpDate, setTmpDate]   = useState('');
  const [tmpFrom, setTmpFrom]   = useState('');
  const [tmpTo, setTmpTo]       = useState('');
  const [tmpNotes, setTmpNotes] = useState('');
  const [tmpKw, setTmpKw]       = useState('');
  const [tmpAmt, setTmpAmt]     = useState('');

  const isCustomer = String(account?.type || '').toUpperCase() === 'CUSTOMER';
  const isVendor   = String(account?.type || '').toUpperCase() === 'VENDOR';

  const getInvoiceViewPath = (rowId: string) => isCustomer ? `/sales/${rowId}` : `/purchase-invoice/${rowId}`;
  const openInvoice = (row: any) => { if (row?.hasInvoice && row?.id) navigate(getInvoiceViewPath(String(row.id))); };

  /* ── Open menu / panel ── */
  const openPanel = (action: MenuAction) => {
    // Sync tmp state from committed state
    setTmpDate(filterDate); setTmpFrom(filterFrom); setTmpTo(filterTo);
    setTmpNotes(filterNotes); setTmpKw(filterKeyword); setTmpAmt(filterAmount);
    setActivePanel(action);
  };

  const handleMenuAction = (action: MenuAction) => {
    if (action === 'share') {
      openPanel('share');
      return;
    }
    if (action === 'print') { 
      printLedger();
      setShowMenu(false); return;
    }
    if (action === 'deleted') {
      setShowDeleted(d => !d);
      setShowMenu(false); return;
    }
    openPanel(action);
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const shareFileBlob = async (blob: Blob, fileName: string, mimeType: string, title: string, text?: string) => {
    const nav: any = navigator;

    const tryShare = async (type: string | undefined) => {
      if (!nav.share) return false;
      const file = new File([blob], fileName, type ? { type } : undefined);

      // Some browsers incorrectly report `canShare=false` for office files even though sharing works.
      if (nav.canShare && !nav.canShare({ files: [file] })) {
        return false;
      }

      try {
        await nav.share({ title, text, files: [file] });
        return true;
      } catch {
        return false;
      }
    };

    // Try exact MIME first, then generic types as fallback for better compatibility.
    const shared =
      (await tryShare(mimeType)) ||
      (await tryShare('application/octet-stream')) ||
      (await tryShare(undefined));

    if (shared) return;

    downloadBlob(blob, fileName);
    alert('File downloaded. You can share the downloaded file.');
  };

  const shareLedgerAsPdf = async () => {
    if (!id) return;
    try {
      const qs = new URLSearchParams();
      if (filterDate) qs.set('date', filterDate);
      else {
        if (filterFrom) qs.set('from', filterFrom);
        if (filterTo) qs.set('to', filterTo);
      }
      const res = await fetch(`${API}/api/accounts/${id}/ledger-pdf?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const fileName = `ledger-${(account?.name || 'party').replace(/[^a-zA-Z0-9-_]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await shareFileBlob(blob, fileName, 'application/pdf', `Ledger for ${account?.name || 'Party'}`);
    } catch (err) {
      console.error(err);
      alert('Failed to share PDF');
    }
  };

  const shareLedgerAsExcel = async () => {
    try {
      const exportRows = filteredRows.map(r => ({
        Date: r.date,
        'Bill No': r.billNo,
        Mode: r.modeLabel,
        Notes: r.notes || '',
        Received: Number(r.received || 0),
        Paid: Number(r.paid || 0),
        Balance: Number(r.balance || 0),
      }));
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `ledger-${(account?.name || 'party').replace(/[^a-zA-Z0-9-_]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      await shareFileBlob(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `Ledger for ${account?.name || 'Party'}`);
    } catch (err) {
      console.error(err);
      alert('Failed to share Excel');
    }
  };

  const printLedger = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    // Generate print content
    const printContent = generatePrintContent();
    
    // Write content to print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger - ${account?.name || 'Unknown'}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            margin: 20px; 
            color: black;
          }
          h1 { 
            text-align: center; 
            font-size: 16px; 
            margin-bottom: 20px;
          }
          .customer-info {
            margin-bottom: 20px;
            font-weight: bold;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
          }
          th, td { 
            border: 1px solid black; 
            padding: 6px; 
            text-align: left;
            vertical-align: top;
          }
          th { 
            background-color: #f5f5f5; 
            font-weight: bold;
            text-align: center;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals { 
            margin-top: 20px; 
            font-weight: bold;
          }
          .totals div {
            margin-bottom: 5px;
          }
          @media print {
            body { margin: 10px; }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const generatePrintContent = () => {
    const customerInfo = `
      <div class="customer-info">
        <h1>LEDGER STATEMENT</h1>
        <div><strong>Customer:</strong> ${account?.name || 'N/A'}</div>
        <div><strong>Phone:</strong> ${account?.phone || 'N/A'}</div>
        <div><strong>Period:</strong> ${period === 'ALL' ? 'All' : period}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
      </div>
    `;

    const tableHeaders = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Bill No</th>
          <th>Received</th>
          <th>Paid</th>
          <th>Balance</th>
        </tr>
      </thead>
    `;

    const tableRows = filteredRows.map(row => `
      <tr>
        <td>${row.date}</td>
        <td>${row.billNo}</td>
        <td class="text-right">${row.received.toLocaleString('en-IN')}</td>
        <td class="text-right">${row.paid.toLocaleString('en-IN')}</td>
        <td class="text-right">${row.balance.toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const totals = `
      <div class="totals">
        <div><strong>Total Transactions:</strong> ${filteredRows.length}</div>
        <div><strong>Total Received:</strong> ₹${totalReceived.toLocaleString('en-IN')}</div>
        <div><strong>Total Paid:</strong> ₹${totalPaid.toLocaleString('en-IN')}</div>
        <div><strong>Final Balance:</strong> ₹${Math.abs(finalBalance).toLocaleString('en-IN')} ${finalBalance < 0 ? 'Due' : finalBalance > 0 ? 'Advance' : 'Settled'}</div>
      </div>
    `;

    return `
      ${customerInfo}
      <table>
        ${tableHeaders}
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${totals}
    `;
  };

  const shareLedgerAsImage = async () => {
    try {
      // Hide all UI elements that might interfere
      const bottomSheet = document.querySelector('.animate-slide-up');
      const mobileHeader = document.querySelector('.md\\:hidden');
      const desktopHeader = document.querySelector('.hidden.md\\:block');
      
      if (bottomSheet) (bottomSheet as HTMLElement).style.display = 'none';
      if (mobileHeader) (mobileHeader as HTMLElement).style.display = 'none';
      if (desktopHeader) (desktopHeader as HTMLElement).style.display = 'none';

      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the entire page content
      const bodyElement = document.body;
      const ledgerElement = ledgerRef.current;
      
      if (!ledgerElement) {
        alert('Ledger content not found');
        return;
      }

      // Get full dimensions including scrollable content
      const rect = ledgerElement.getBoundingClientRect();
      const scrollHeight = Math.max(ledgerElement.scrollHeight, rect.height);
      const scrollWidth = Math.max(ledgerElement.scrollWidth, rect.width);

      // Create a temporary container for clean capture
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: ${scrollWidth}px;
        height: auto;
        background: white;
        z-index: 9999;
        padding: 20px;
        box-sizing: border-box;
      `;

      // Clone the ledger content
      const clonedLedger = ledgerElement.cloneNode(true) as HTMLElement;
      clonedLedger.style.cssText = `
        width: 100%;
        height: auto;
        background: white;
        overflow: visible;
      `;

      tempContainer.appendChild(clonedLedger);
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: scrollHeight + 40, // Add padding
        width: scrollWidth + 40,   // Add padding
        scrollX: 0,
        scrollY: 0,
        windowWidth: scrollWidth + 40,
        windowHeight: scrollHeight + 40,
        logging: false,
        removeContainer: false
      });

      // Clean up temporary container
      document.body.removeChild(tempContainer);

      // Restore UI elements
      if (bottomSheet) (bottomSheet as HTMLElement).style.display = '';
      if (mobileHeader) (mobileHeader as HTMLElement).style.display = '';
      if (desktopHeader) (desktopHeader as HTMLElement).style.display = '';

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });

      if (!blob) {
        alert('Failed to generate image');
        return;
      }

      // Create file name
      const fileName = `ledger-${account?.name || 'unknown'}-${new Date().toISOString().slice(0, 10)}.png`;

      // Method 1: Try Web Share API with file (best for mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ 
              title: `Ledger for ${account?.name}`,
              text: `Ledger transactions for ${account?.name}`,
              files: [file] 
            });
            return;
          } catch (error) {
            console.log('Web Share API with file failed:', error);
          }
        }
      }

      // Method 2: Copy to clipboard (most reliable for image sharing)
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Ledger image copied to clipboard! You can paste it in WhatsApp, Email, or any app.');
          return;
        } catch (error) {
          console.log('Clipboard API failed:', error);
        }
      }

      // Method 3: Open in new tab for manual sharing
      const dataUrl = canvas.toDataURL('image/png');
      const imageWindow = window.open('', '_blank', 'width=800,height=600');
      if (imageWindow) {
        imageWindow.document.write(`
          <html>
            <head>
              <title>Ledger - ${account?.name}</title>
              <style>
                body { margin: 0; padding: 20px; text-align: center; font-family: Arial, sans-serif; }
                img { max-width: 100%; height: auto; border: 1px solid #ccc; }
                .instructions { margin: 20px 0; color: #666; }
              </style>
            </head>
            <body>
              <h2>Ledger for ${account?.name}</h2>
              <div class="instructions">
                <p><strong>Right-click the image below and select "Save image as" to download</strong></p>
                <p>Then you can share the saved image via WhatsApp, Email, etc.</p>
              </div>
              <img src="${dataUrl}" alt="Ledger for ${account?.name}" />
            </body>
          </html>
        `);
        imageWindow.document.close();
        return;
      }

      // Method 4: Download as last resort
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      alert('Ledger image downloaded! You can now share the downloaded file.');

    } catch (error) {
      console.error('Error sharing ledger:', error);
      alert('Failed to share ledger. Please try again.');
    }
  };

  const applyPanel = () => {
    if (activePanel === 'date')         setFilterDate(tmpDate);
    if (activePanel === 'date_range')   { setFilterFrom(tmpFrom); setFilterTo(tmpTo); }
    if (activePanel === 'notes')        setFilterNotes(tmpNotes);
    if (activePanel === 'keyword')      setFilterKeyword(tmpKw);
    if (activePanel === 'amount')       setFilterAmount(tmpAmt);
    setActivePanel(null); setShowMenu(false);
  };

  const clearPanel = () => {
    if (activePanel === 'date')         setFilterDate('');
    if (activePanel === 'date_range')   { setFilterFrom(''); setFilterTo(''); }
    if (activePanel === 'notes')        setFilterNotes('');
    if (activePanel === 'keyword')      setFilterKeyword('');
    if (activePanel === 'amount')       setFilterAmount('');
    setTmpDate(''); setTmpFrom(''); setTmpTo(''); setTmpNotes(''); setTmpKw(''); setTmpAmt('');
  };

  /* ── Data fetch ── */
  useEffect(() => {
    if (!id || (!isCustomer && !isVendor)) return;
    const fetchLedgerRows = async () => {
      setLoading(true);
      try {
        const endpoint = isCustomer ? 'sales' : 'purchases';
        const module   = isCustomer ? 'sales' : 'purchases';
        const [partyRes, transferRes] = await Promise.all([
          fetch(`${API}/api/${endpoint}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          fetch(`${API}/api/transfers?module=${module}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        ]);
        if (!partyRes.ok) throw new Error('Failed');
        const partyData    = await partyRes.json();
        const transferData = transferRes.ok ? await transferRes.json() : [];

        const filteredPartyRows = (partyData || []).filter((r: any) =>
          String(isCustomer ? (r.customer_id ?? r.customerId) : (r.vendor_id ?? r.vendorId)) === String(id)
        );
        const filteredTransferRows = (transferData || [])
          .filter((t: any) => String(t.paid_account_id) === String(id) || String(t.received_account_id) === String(id))
          .map((t: any) => ({ ...t, __kind: 'TRANSFER', created_at: t.transfer_date || t.created_at }));

        setRows([...filteredPartyRows, ...filteredTransferRows]);
      } catch { setRows([]); }
      finally { setLoading(false); }
    };
    fetchLedgerRows();
  }, [id, isCustomer, isVendor]);

  /* ── Balance toggle persistence ── */
  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(`${BAL_TOGGLE_KEY_PREFIX}${id}`);
    setShowBalance(saved !== '0');
  }, [id]);
  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`${BAL_TOGGLE_KEY_PREFIX}${id}`, showBalance ? '1' : '0');
  }, [id, showBalance]);

  /* ── Period filter ── */
  const periodFiltered = useMemo(() => {
    const now = new Date();
    return rows.filter(r => {
      if (r.__deleted && !showDeleted) return false;
      if (period === 'DUE') return Number(r.total_amount || 0) > Number(r.paid_amount || 0);
      const d = new Date(r.created_at);
      if (period === 'ALL')     return true;
      if (period === 'DAILY')   return d.toDateString() === now.toDateString();
      if (period === 'WEEKLY')  return d.getTime() >= now.getTime() - 7 * 86400000;
      if (period === 'MONTHLY') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'YEARLY')  return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [rows, period, showDeleted]);

  /* ── Build ledger rows ── */
  const ledgerRows = useMemo(() => {
    let running = 0;
    const today     = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const sortedRows = periodFiltered
      .slice()
      .sort((a, b) =>
        period === 'DUE'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    return sortedRows.map((r: any) => {
      const isTransfer     = r.__kind === 'TRANSFER';
      const total          = Number(r.total_amount || 0);
      const paid           = Number(r.paid_amount || 0);
      const transferAmount = Number(r.amount || 0);
      const createdTime    = new Date(r.created_at);
      const txStart        = new Date(createdTime.getFullYear(), createdTime.getMonth(), createdTime.getDate()).getTime();
      const transferReceived = String(r.paid_account_id) === String(id) ? transferAmount : 0;
      const transferPaid     = String(r.received_account_id) === String(id) ? transferAmount : 0;
      const received  = isTransfer ? transferReceived : (isCustomer ? paid : Math.max(total - paid, 0));
      const paidOut   = isTransfer ? transferPaid     : (isCustomer ? Math.max(total - paid, 0) : paid);
      const rowBalance = isTransfer ? (received - paidOut) : (paid - total);
      const isDueRow   = rowBalance < 0;
      const dueDays    = isDueRow ? Math.max(0, Math.floor((todayStart - txStart) / 86400000)) : 0;
      const isPartialPayment = !isTransfer && paid < total;
      const partialAmountColumn: 'received' | 'paid' | null = isPartialPayment
        ? (isCustomer ? 'received' : 'paid') : null;
      running += rowBalance;
      return {
        id: r.id,
        date: createdTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdTime,
        billNo: isTransfer ? `TRF-${String(r.id || '').slice(0, 6)}` : (r.invoice_no || '-'),
        modeLabel: isTransfer
          ? (String(r.note || '').trim() || 'TRANSFER')
          : String(r.payment_mode || (isCustomer ? 'SALE' : 'PURCHASE')).toUpperCase(),
        notes: r.notes || r.note || '',
        hasInvoice: !isTransfer && Boolean(r.id && r.invoice_no),
        partialAmountColumn,
        received,
        paid: paidOut,
        balance: running,
        dueDays,
      };
    });
  }, [periodFiltered, isCustomer, period, id]);

  /* ── Apply extra filters (date, keyword, amount, notes) ── */
  const filteredRows = useMemo(() => {
    let rows = ledgerRows.filter(r => {
      if (filterDate) {
        const d = r.createdTime.toISOString().slice(0, 10);
        if (d !== filterDate) return false;
      }
      if (filterFrom) {
        const d = r.createdTime.toISOString().slice(0, 10);
        if (d < filterFrom) return false;
      }
      if (filterTo) {
        const d = r.createdTime.toISOString().slice(0, 10);
        if (d > filterTo) return false;
      }
      if (filterNotes && !r.notes.toLowerCase().includes(filterNotes.toLowerCase())) return false;
      if (filterKeyword && !r.billNo.toLowerCase().includes(filterKeyword.toLowerCase()) &&
          !r.modeLabel.toLowerCase().includes(filterKeyword.toLowerCase())) return false;
      if (filterAmount) {
        const amt = parseFloat(filterAmount);
        if (!isNaN(amt) && r.received !== amt && r.paid !== amt) return false;
      }
      return true;
    });

    // Apply sort
    const sorted = [...rows];
    switch (sortBy) {
      case 'name_asc':        sorted.sort((a, b) => a.billNo.localeCompare(b.billNo)); break;
      case 'name_desc':       sorted.sort((a, b) => b.billNo.localeCompare(a.billNo)); break;
      case 'amount_asc':      sorted.sort((a, b) => (a.received + a.paid) - (b.received + b.paid)); break;
      case 'amount_desc':     sorted.sort((a, b) => (b.received + b.paid) - (a.received + a.paid)); break;
      case 'last_transaction':sorted.sort((a, b) => b.createdTime.getTime() - a.createdTime.getTime()); break;
      case 'category':        sorted.sort((a, b) => a.modeLabel.localeCompare(b.modeLabel)); break;
      default: break;
    }
    return sorted;
  }, [ledgerRows, filterDate, filterFrom, filterTo, filterNotes, filterKeyword, filterAmount, sortBy]);

  /* ── Totals ── */
  const totalReceived = filteredRows.reduce((s, r) => s + Number(r.received || 0), 0);
  const totalPaid     = filteredRows.reduce((s, r) => s + Number(r.paid || 0), 0);
  const finalBalance  = filteredRows.length > 0 ? filteredRows[filteredRows.length - 1].balance : 0;

  /* ── Active filter badges ── */
  const activeFilters = [
    filterDate      && 'Date',
    (filterFrom || filterTo) && 'Date Range',
    filterNotes     && 'Notes',
    filterKeyword   && 'Keyword',
    filterAmount    && 'Amount',
    showDeleted     && 'Deleted',
  ].filter(Boolean) as string[];

  const clearAllFilters = () => {
    setFilterDate(''); setFilterFrom(''); setFilterTo('');
    setFilterNotes(''); setFilterKeyword(''); setFilterAmount('');
    setShowDeleted(false);
  };

  const ledgerGridClass = showBalance
    ? 'grid-cols-[50px_minmax(0,1fr)_44px_44px_62px_42px] md:grid-cols-[0.9fr_1.1fr_0.72fr_0.72fr_1fr_0.9fr]'
    : 'grid-cols-[1fr_1.65fr_0.9fr_0.9fr]';

  if (!account) return <div className="p-6">Account not found</div>;

  /* ─── Header (shared between mobile/desktop) ─── */
  const HeaderContent = () => (
    <>
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-lg font-semibold">{account.name}</p>
          <p className="text-xs opacity-90">{account.phone || '-'}</p>
        </div>
        {/* Hamburger → bottom sheet | 3-dots → sort dropdown */}
        <div className="flex items-center gap-1 relative">
          <button onClick={() => { setActivePanel(null); setShowMenu(true); }}>
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSortMenu(v => !v)}>
            <MoreVertical className="w-5 h-5" />
          </button>

          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[210px] z-50">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sortBy === opt.value ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                      {sortBy === opt.value && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active filter badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {activeFilters.map(f => (
            <span key={f} className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">{f}</span>
          ))}
          <button onClick={clearAllFilters} className="text-white/80 text-[10px] underline ml-1">Clear all</button>
        </div>
      )}

      <div className="flex items-center justify-between text-xs mt-1">
        <p>Transactions {filteredRows.length}</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] select-none">
            <span>BAL</span>
            <BalanceToggle checked={showBalance} onChange={setShowBalance} />
          </div>
          {showBalance && (
            <p>Balance {Math.abs(finalBalance).toLocaleString('en-IN')} {finalBalance < 0 ? 'Due' : finalBalance > 0 ? 'Advance' : ''}</p>
          )}
        </div>
      </div>
    </>
  );

  const PeriodTabs = () => (
    <div className="grid grid-cols-6 gap-1">
      {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'DUE'] as Period[]).map(p => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`text-[11px] rounded-full py-1 ${period === p ? 'bg-white text-[#1976d2]' : 'bg-[#1976d2]/30'}`}
        >
          {p === 'ALL' ? 'All' : p === 'DUE' ? 'Due' : p.charAt(0) + p.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );

  /* ─── Sub-panel content (inside bottom sheet) ─── */
  const PanelContent = () => {
    if (!activePanel) return null;

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

    const content = () => {
      switch (activePanel) {
        case 'date':
          return (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Select Date</label>
              <input type="date" className={inputCls} value={tmpDate} onChange={e => setTmpDate(e.target.value)} />
            </div>
          );
        case 'date_range':
          return (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">From</label>
                <input type="date" className={inputCls} value={tmpFrom} onChange={e => setTmpFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">To</label>
                <input type="date" className={inputCls} value={tmpTo} onChange={e => setTmpTo(e.target.value)} />
              </div>
            </div>
          );
        case 'notes':
          return (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Filter by Notes</label>
              <input type="text" placeholder="Enter note text…" className={inputCls} value={tmpNotes} onChange={e => setTmpNotes(e.target.value)} />
            </div>
          );
        case 'keyword':
          return (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Keyword Search</label>
              <input type="text" placeholder="Bill No, mode…" className={inputCls} value={tmpKw} onChange={e => setTmpKw(e.target.value)} />
            </div>
          );
        case 'amount':
          return (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Filter by Amount (exact)</label>
              <input type="number" placeholder="e.g. 1000" className={inputCls} value={tmpAmt} onChange={e => setTmpAmt(e.target.value)} />
            </div>
          );
        case 'share':
          return (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">Choose format to share</p>
              <button
                onClick={async () => { await shareLedgerAsPdf(); setActivePanel(null); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              >
                pdf
              </button>
              <button
                onClick={async () => { await shareLedgerAsExcel(); setActivePanel(null); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
              >
                excel
              </button>
            </div>
          );
        case 'report':
          return (
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold text-gray-800">Ledger Report</p>
              <p>Total Transactions: <strong>{filteredRows.length}</strong></p>
              <p>Total Received: <strong className="text-green-700">{fmtNum(totalReceived)}</strong></p>
              <p>Total Paid: <strong className="text-red-600">{fmtNum(totalPaid)}</strong></p>
              <p>Balance: <strong className={finalBalance < 0 ? 'text-red-600' : 'text-green-700'}>
                {fmtNum(Math.abs(finalBalance))} {finalBalance < 0 ? 'Due' : finalBalance > 0 ? 'Advance' : 'Settled'}
              </strong></p>
            </div>
          );
        case 'name_address':
          return (
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900">{account.name}</p>
              {account.phone && <p>📞 {account.phone}</p>}
              {(account as any).address && <p>📍 {(account as any).address}</p>}
              {(account as any).email && <p>✉️ {(account as any).email}</p>}
            </div>
          );
        default:
          return null;
      }
    };

    const hasApply = ['date', 'date_range', 'notes', 'keyword', 'amount'].includes(activePanel);

    return (
      <div>
        <button onClick={() => setActivePanel(null)} className="flex items-center gap-1 text-blue-600 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {content()}
        {hasApply && (
          <div className="flex gap-2 mt-4">
            <button onClick={clearPanel} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">Clear</button>
            <button onClick={applyPanel} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold">Apply</button>
          </div>
        )}
        {!hasApply && (
          <button onClick={() => setShowMenu(false)} className="w-full mt-4 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">Close</button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#dfe3e8] md:max-w-xl md:mx-auto">
      {/* ── Mobile header ── */}
      <div className="md:hidden fixed inset-x-0 top-0 z-50">
        <div className="bg-[#2196f3] text-white px-3 pt-2 pb-1">
          <HeaderContent />
        </div>
        <div className="bg-[#2196f3] text-white px-2 pb-2"><PeriodTabs /></div>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden md:block bg-[#2196f3] text-white px-3 pt-2 pb-1">
        <HeaderContent />
      </div>
      <div className="hidden md:block bg-[#2196f3] text-white px-2 pb-2"><PeriodTabs /></div>

      {/* ── Table ── */}
      <div ref={ledgerRef} className="print-content pt-[110px] md:pt-0 bg-white">
        <div className={`text-[10px] md:text-xs font-semibold border-b border-gray-300 grid px-1.5 md:px-2 py-1 ${ledgerGridClass}`}>
          <p>Date</p>
          <p>Bill No</p>
          <p className="text-center text-green-700">Rec</p>
          <p className="text-center text-red-600">Paid</p>
          {showBalance && <p className="text-right">Bal</p>}
          {showBalance && <p className="text-right">Days</p>}
        </div>

        <div className="pb-40">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-8">Loading…</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">No ledger entries</div>
          ) : (
            filteredRows.map(r => (
              <div key={r.id} className={`bg-white border-b border-gray-200 px-1.5 md:px-2 py-2 grid items-start gap-x-1 ${ledgerGridClass}`}>
                <div>
                  <p className="text-[10px] md:text-[12px] text-gray-800">{r.date}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-[10px] md:text-[12px] text-blue-700 truncate">{r.billNo}</p>
                    {r.hasInvoice && (
                      <button type="button" aria-label="View invoice" onClick={() => openInvoice(r)} className="text-slate-500 hover:text-indigo-600 shrink-0">
                        <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 truncate">{r.modeLabel}</p>
                </div>
                <p className={`text-center text-green-700 font-semibold whitespace-nowrap text-[11px] md:text-base ${r.partialAmountColumn === 'received' ? 'underline decoration-red-600 decoration-2 underline-offset-4' : ''}`}>
                  {r.received ? fmtNum(r.received) : ''}
                </p>
                <p className={`text-center text-red-600 font-semibold whitespace-nowrap text-[11px] md:text-base ${r.partialAmountColumn === 'paid' ? 'underline decoration-red-600 decoration-2 underline-offset-4' : ''}`}>
                  {r.paid ? fmtNum(r.paid) : ''}
                </p>
                {showBalance && (
                  <p className={`text-right font-semibold whitespace-nowrap text-[11px] md:text-base ${r.balance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {fmtNum(Math.abs(r.balance))}
                    <span className="text-[10px] md:text-xs"> {r.balance < 0 ? 'Due' : r.balance > 0 ? 'Adv' : ''}</span>
                  </p>
                )}
                {showBalance && (
                  <p className="text-right text-[10px] md:text-[11px] font-semibold text-red-600 whitespace-nowrap">
                    {r.balance < 0 && Math.abs(r.balance) > 0 && r.dueDays > 0 ? `${r.dueDays}d` : ''}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-[min(100%,28rem)] bg-white border-t border-gray-400">
        <div className="grid grid-cols-2 gap-2 p-2">
          <button
            onClick={() => navigate('/transfer', { state: { module: isCustomer ? 'sales' : 'purchases', quickEntry: true, entryType: 'RECEIVED', partyAccountId: id, partyName: account.name, backTo: `/ledgers/${id}` } })}
            className="bg-green-600 text-white py-2 rounded-md font-semibold"
          >Add Bill</button>
          <button
            onClick={() => navigate('/transfer', { state: { module: isCustomer ? 'sales' : 'purchases', quickEntry: true, entryType: 'PAID', partyAccountId: id, partyName: account.name, backTo: `/ledgers/${id}` } })}
            className="bg-red-500 text-white py-2 rounded-md font-semibold"
          >Add Payment</button>
        </div>
        <div className={`border-t border-gray-400 text-center grid ${showBalance ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="py-1 border-r border-gray-400">
            <p className="text-green-700 text-sm">Total Bill Amount</p>
            <p className="text-green-700 font-semibold">{fmtNum(totalReceived)}</p>
          </div>
          <div className={`py-1 ${showBalance ? 'border-r border-gray-400' : ''}`}>
            <p className="text-red-600 text-sm">Total Paid Amount</p>
            <p className="text-red-600 font-semibold">{fmtNum(totalPaid)}</p>
          </div>
          {showBalance && (
            <div className="py-1">
              <p className="text-gray-900 text-sm">Balance</p>
              <p className={`font-semibold ${finalBalance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {fmtNum(Math.abs(finalBalance))} {finalBalance < 0 ? 'Due' : finalBalance > 0 ? 'Advance' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ════ Bottom-sheet overlay ════ */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => { setShowMenu(false); setActivePanel(null); }} />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-[min(100%,28rem)] z-50 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <p className="font-semibold text-gray-800">{activePanel ? MENU_ITEMS.find(m => m.action === activePanel)?.label : 'Options'}</p>
              <button onClick={() => { setShowMenu(false); setActivePanel(null); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
              {activePanel ? (
                <PanelContent />
              ) : (
                <div>
                  {MENU_ITEMS.map(({ action, label, Icon }) => {
                    const isActive =
                      (action === 'date'       && filterDate)       ||
                      (action === 'date_range' && (filterFrom || filterTo)) ||
                      (action === 'notes'      && filterNotes)      ||
                      (action === 'keyword'    && filterKeyword)    ||
                      (action === 'amount'     && filterAmount)     ||
                      (action === 'deleted'    && showDeleted);

                    return (
                      <button
                        key={action}
                        onClick={() => handleMenuAction(action)}
                        className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 text-left"
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`text-sm flex-1 ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-800'}`}>{label}</span>
                        {isActive && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        
        /* Print styles */
        @media print {
          body * {
            visibility: hidden !important;
          }
          
          .print-content, .print-content * {
            visibility: visible !important;
          }
          
          .print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            padding: 20px !important;
          }
          
          .print-content .grid {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          .print-content .grid > * {
            display: table-cell !important;
            padding: 4px !important;
            border: 1px solid black !important;
            vertical-align: top !important;
          }
          
          .print-content .border-b {
            border-bottom: 1px solid black !important;
          }
          
          .print-content .text-blue-700,
          .print-content .text-green-700,
          .print-content .text-red-600 {
            color: black !important;
            font-weight: bold !important;
          }
          
          .print-content .bg-white {
            background: white !important;
          }
          
          .print-content button,
          .print-content .fixed,
          .print-content .md\:hidden {
            display: none !important;
          }
          
          /* Ensure all transactions are visible */
          .print-content .pb-40 {
            padding-bottom: 20px !important;
          }
          
          /* Add header information */
          .print-content::before {
            content: "LEDGER STATEMENT" !important;
            display: block !important;
            font-size: 16px !important;
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 20px !important;
            color: black !important;
          }
          
          /* Page break for long content */
          .print-content .bg-white {
            page-break-inside: avoid;
          }
          
          /* Ensure footer is visible */
          .print-content ~ .fixed {
            visibility: visible !important;
            position: relative !important;
            margin-top: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

const fmtNum = (n: number) => Number(n || 0).toLocaleString('en-IN');

export default LedgerDetails;
