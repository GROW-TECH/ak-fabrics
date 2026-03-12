import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import html2canvas from 'html2canvas';

const API = import.meta.env.VITE_API_URL;
const DEFAULT_GST_RATE = 5;
const DEFAULT_SHOP_PINCODE = '636003';
const money = (v: number) => Number(v || 0).toLocaleString('en-IN');
const round2 = (v: number) => Number(Number(v || 0).toFixed(2));

const computeTax = (taxable: number, pin: string, gstRate: number, shopPin: string) => {
  const isInter =
    pin.length >= 2 && shopPin.length >= 2 && pin.slice(0, 2) !== shopPin.slice(0, 2);
  const rate = Number.isFinite(Number(gstRate)) ? Number(gstRate) : DEFAULT_GST_RATE;
  let cgst = 0, sgst = 0, igst = 0;
  if (isInter) igst = round2((taxable * rate) / 100);
  else { cgst = round2((taxable * rate) / 200); sgst = round2((taxable * rate) / 200); }
  const tax = round2(cgst + sgst + igst);
  const roundOff = round2(Math.round(taxable + tax) - (taxable + tax));
  return { cgst, sgst, igst, roundOff, totalAfterTax: round2(taxable + tax + roundOff), gstRate: rate };
};

const ErodeSalesInvoicePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { shopName } = useAuth();
  const [sale, setSale] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [f, setF] = useState({
    customer_name: '', customer_address: '', customer_address2: '',
    customer_gstin: '', customer_state_code: '', customer_pincode: '',
    invoice_no: '', invoice_date: '', bale_no: '', through_agent: '', lr_no: '', notes: '',
    payment_mode: 'CASH',
  });
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const fetchSale = async () => {
    if (!id) return;
    const res = await fetch(`${API}/api/sales/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) {
      const d = await res.json();
      setSale(d);
      setF({
        customer_name: d.customer_name || '',
        customer_address: d.customer_address || '',
        customer_address2: d.customer_address2 || '',
        customer_gstin: d.customer_gstin || '',
        customer_state_code: d.customer_state_code || '',
        customer_pincode: String(d.customer_pincode || '').trim(),
        invoice_no: d.invoice_no || '',
        invoice_date: new Date(d.created_at || Date.now()).toLocaleDateString('en-IN'),
        bale_no: d.bale_no || '',
        through_agent: d.through_agent || '',
        lr_no: d.lr_no || '',
        notes: d.notes || '',
        payment_mode: d.payment_mode || 'CASH',
      });
    }
  };

  useEffect(() => { fetchSale(); }, [id]);

  const taxable = useMemo(
    () => (sale?.items || []).reduce((s: number, i: any) => s + Number(i.total || 0), 0),
    [sale]
  );
  const tax = useMemo(() => {
    const rate = Number(sale?.gst_rate || DEFAULT_GST_RATE);
    const shop = String(sale?.shop_pincode || DEFAULT_SHOP_PINCODE).trim();
    return computeTax(taxable, f.customer_pincode, rate, shop);
  }, [sale, f.customer_pincode, taxable]);

  const resolveWaPhone = () => {
    const urlParams = new URLSearchParams(location.search);
    const urlPhone = urlParams.get('phone') || '';
    const dataPhone = sale?.customer_phone
      ? String(sale.customer_phone).replace(/\D/g, '')
      : '';
    const rawPhone = (urlPhone || dataPhone).replace(/\D/g, '');
    if (rawPhone.length === 10) return '91' + rawPhone;
    if (rawPhone.length >= 11 && rawPhone.startsWith('91')) return rawPhone;
    return rawPhone;
  };

  const shareAsImage = async () => {
    setSharing(true);
    try {
      const invoiceEl = document.querySelector('.ps') as HTMLElement;
      if (!invoiceEl) { alert('Invoice not found'); setSharing(false); return; }

      const canvas = await html2canvas(invoiceEl, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#fff', logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) { alert('Failed to capture invoice'); setSharing(false); return; }

        const waPhone = resolveWaPhone();

        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `${f.invoice_no || 'invoice'}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ title: `Invoice ${f.invoice_no}`, files: [file] });
              setSharing(false);
              return;
            } catch (_) {}
          }
        }

        const imgUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = `${f.invoice_no || 'invoice'}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(imgUrl);

        const msg = encodeURIComponent(
          `Dear ${f.customer_name || 'Customer'},\nErode Sales Invoice *${f.invoice_no}* from *AK Fabrics*\nAmount: ₹${money(tax.totalAfterTax)}\n\n_Please find the attached invoice image._`
        );

        setTimeout(() => {
          if (waPhone.length >= 10) {
            window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
          } else {
            window.open(`https://wa.me/?text=${msg}`, '_blank');
          }
        }, 600);

        setSharing(false);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      alert('Failed to share invoice');
      setSharing(false);
    }
  };

  useEffect(() => {
    if (!sale) return;
    const params = new URLSearchParams(location.search);
    if (params.get('share') === 'true') {
      setTimeout(() => shareAsImage(), 800);
    }
  }, [sale]);

  const saveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/sales/${id}/tax-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ customerPincode: f.customer_pincode, gstRate: Number(sale?.gst_rate || DEFAULT_GST_RATE), ...f }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return alert(e.error || 'Failed'); }
      const data = await res.json();
      setSale(data.sale);
    } finally { setSaving(false); }
  };

  if (!sale) return (
    <div className='flex items-center justify-center h-64'>
      <div className='w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin' />
    </div>
  );

  const paid = Number(sale.paid_amount || 0);
  const balance = Math.max(0, tax.totalAfterTax - paid);
  const items: any[] = sale.items || [];
  const G = '#2e7d32';
  const DG = '#1b5e20';

  const paymentStatus = balance === 0 ? 'PAID' : paid > 0 ? 'HALF_PAID' : 'NOT_PAID';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200';
      default: return 'text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-bold border border-red-200';
    }
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];
    const convertLessThanThousand = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    let result = '';
    let scale = 0;
    let n = Math.round(num);
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk > 0) {
        const chunkWords = convertLessThanThousand(chunk);
        result = chunkWords + (thousands[scale] ? ' ' + thousands[scale] : '') + (result ? ' ' + result : '');
      }
      n = Math.floor(n / 1000);
      scale++;
    }
    return result + ' Rupees Only';
  };

  const inp = (w?: string | number): React.CSSProperties => ({
    border: 'none', borderBottom: '1px dashed #aaa', outline: 'none',
    background: 'transparent', fontFamily: 'inherit', fontSize: 12,
    padding: '1px 3px', width: w || '100%', display: 'block',
  });
  const boxInp = (w?: string | number): React.CSSProperties => ({
    border: `1px solid ${G}`, outline: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: 11, padding: '2px 5px',
    width: w || 'auto', borderRadius: 2,
  });

  return (
    <div className='max-w-4xl mx-auto'>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400&display=swap');
        .inv { font-family:'Tinos',Georgia,serif; font-size:12px; color:#111; }
        .inv-wrap { border:2px solid #2e7d32; background:#fff; }
        .inv-table-wrap { width: 100%; }
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

      {/* ACTION BAR */}
      <div className='no-print flex flex-wrap items-center justify-between gap-2 mb-4'>
        <button onClick={() => navigate(-1)}
          className='inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm'>
          <ArrowLeft className='w-4 h-4' /> Back
        </button>
        <div className='flex gap-2'>
          <button onClick={saveAll} disabled={saving}
            className='inline-flex items-center gap-2 px-4 py-2 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 text-sm'>
            <Save className='w-4 h-4' />{saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={shareAsImage} disabled={sharing}
            className='inline-flex items-center gap-2 px-4 py-2 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60 text-sm'>
            {sharing
              ? <div className='w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin' />
              : <span>📤</span>}
            {sharing ? 'Capturing...' : 'WhatsApp'}
          </button>
          <button onClick={() => window.print()}
            className='inline-flex items-center gap-2 px-4 py-2 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm'>
            <Printer className='w-4 h-4' /> Print
          </button>
        </div>
      </div>

      {/* INVOICE */}
      <div className='ps'>
        <div className='inv-wrap inv' style={{ position: 'relative', overflow: 'hidden' }}>

          {/* Watermark */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 440, height: 440,
            pointerEvents: 'none', zIndex: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src='/AK Logo.jpg'
              alt=''
              style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.07 }}
              onError={e => (e.target as HTMLImageElement).style.display = 'none'}
            />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* HEADER */}
            <div style={{ borderBottom: `1px solid ${G}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px', borderBottom: `1px solid ${G}` }}>
                <div style={{ fontSize: 10.5 }}>
                  <div><b>GSTIN : </b>{sale.shop_gstin || '33AKGPK9627B1ZC'}</div>
                  <div><b>STATE CODE : </b>33</div>
                </div>
                <div style={{ fontSize: 10, color: '#555', fontStyle: 'italic', textAlign: 'center' }}>
                  Paruthipalli Angalamman Thumai
                </div>
                <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width='12' height='12' viewBox='0 0 24 24' fill={G}><path d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z'/></svg>
                    <span>9443095080</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width='12' height='12' viewBox='0 0 24 24' fill={G}><path d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z'/></svg>
                    <span>9262021600</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BRAND */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${G}` }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', width: 140 }}>
                <img src='/AK Logo.jpg' alt='AK Fabrics'
                  style={{ width: 100, height: 100, objectFit: 'contain', display: 'block' }}
                  onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              </div>
              <div style={{ flex: 1, padding: '6px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 34, fontWeight: 900, color: DG, lineHeight: 1, letterSpacing: 2, fontFamily: 'Georgia,serif' }}>{shopName || 'AK FABRICS'}</div>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: G, marginTop: 3 }}>CLOTH MERCHANT</div>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: G, marginTop: 3 }}>34, No-1 PandariNadhar Street, Ammapet, Salem - 636003</div>
                <div style={{ fontSize: 10, color: '#444' }}>E-Mail : ak.fabries.salem@gmail.com</div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', width: 140 }}>
                <img src='/Goddess.jpg' alt='Goddess'
                  style={{ width: 100, height: 100, objectFit: 'contain', display: 'block' }}
                  onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              </div>
            </div>

            <div style={{ borderBottom: `1px solid ${G}`, padding: '2px 10px', textAlign: 'center', fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', color: DG }}>
              ERODE TAX INVOICE
            </div>
            <div style={{ borderBottom: `1px solid ${G}`, padding: '2px 10px', fontSize: 11 }}>
              <b>Prop : K.LAKSHMIPURAM</b>
            </div>

            {/* BILLING + INVOICE META */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${G}` }}>
              <div style={{ borderRight: `1px solid ${G}`, padding: '8px 12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 5 }}>To.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                  <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>M/s.</span>
                  <input value={f.customer_name} onChange={upd('customer_name')} placeholder='Customer name' style={inp()} />
                </div>
                <input value={f.customer_address} onChange={upd('customer_address')} placeholder='Address line 1' style={{ ...inp(), marginBottom: 5 }} />
                <input value={f.customer_address2} onChange={upd('customer_address2')} placeholder='City / District' style={{ ...inp(), marginBottom: 8 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>GSTIN</span>
                  <input value={f.customer_gstin} onChange={upd('customer_gstin')} placeholder='Customer GSTIN' style={{ ...inp(), flex: 1 }} />
                </div>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>D.No.</span>
                    <input value={f.invoice_no} onChange={upd('invoice_no')} placeholder='Invoice No' style={boxInp('80px')} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Dated</span>
                    <input value={f.invoice_date} onChange={upd('invoice_date')} style={boxInp('100px')} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Bale No.</span>
                    <input value={f.bale_no} onChange={upd('bale_no')} placeholder='Bale No' style={boxInp('80px')} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Through</span>
                    <input value={f.through_agent} onChange={upd('through_agent')} placeholder='Through Agent' style={boxInp('80px')} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>LR No.</span>
                    <input value={f.lr_no} onChange={upd('lr_no')} placeholder='LR No' style={boxInp('80px')} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Mode</span>
                    <select
                      value={f.payment_mode}
                      onChange={e => setF(p => ({ ...p, payment_mode: e.target.value }))}
                      style={{ ...boxInp('100px'), border: 'none', background: 'transparent' }}
                    >
                      <option value='CASH'>Cash</option>
                      <option value='CARD'>Card</option>
                      <option value='UPI'>UPI</option>
                      <option value='BANK'>Bank</option>
                      <option value='CHEQUE'>Cheque</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className='itbl'>
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center' }}>S.No</th>
                    <th style={{ width: '40%' }}>Description of Goods</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Quantity</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Rate</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                        <div style={{ fontSize: 10, color: '#666' }}>{item.hsn}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'center' }}>₹{money(item.rate)}</td>
                      <td style={{ textAlign: 'center' }}>₹{money(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div style={{ borderTop: `1px solid ${G}` }}>
              <div className='srow'>
                <span style={{ fontWeight: 'bold' }}>Taxable Amount</span>
                <span style={{ fontWeight: 'bold' }}>₹{money(taxable)}</span>
              </div>
              {tax.cgst > 0 && (
                <div className='srow'>
                  <span>CGST @ {tax.gstRate / 2}%</span>
                  <span>₹{money(tax.cgst)}</span>
                </div>
              )}
              {tax.sgst > 0 && (
                <div className='srow'>
                  <span>SGST @ {tax.gstRate / 2}%</span>
                  <span>₹{money(tax.sgst)}</span>
                </div>
              )}
              {tax.igst > 0 && (
                <div className='srow'>
                  <span>IGST @ {tax.gstRate}%</span>
                  <span>₹{money(tax.igst)}</span>
                </div>
              )}
              {tax.roundOff !== 0 && (
                <div className='srow'>
                  <span>Round Off</span>
                  <span>₹{money(tax.roundOff)}</span>
                </div>
              )}
              <div className='srow' style={{ fontSize: 14, fontWeight: 'bold', background: '#e8f5e9' }}>
                <span>Total After Tax</span>
                <span>₹{money(tax.totalAfterTax)}</span>
              </div>
              <div className='srow'>
                <span style={{ fontWeight: 'bold' }}>Payment Status</span>
                <span className={getStatusColor(paymentStatus)}>{paymentStatus}</span>
              </div>
              <div className='srow'>
                <span style={{ fontWeight: 'bold' }}>Amount in Words</span>
                <span style={{ fontStyle: 'italic' }}>{numberToWords(tax.totalAfterTax)}</span>
              </div>
            </div>

            {/* NOTES */}
            {f.notes && (
              <div style={{ borderTop: `1px solid ${G}`, padding: '6px 10px', fontSize: 12 }}>
                <b>Notes: </b>{f.notes}
              </div>
            )}

            {/* FOOTER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${G}` }}>
              <div style={{ borderRight: `1px solid ${G}`, padding: '8px 12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Received By</div>
                <div style={{ border: '1px solid #2e7d32', padding: '2px 5px', minHeight: 24, fontSize: 11 }}>___________________</div>
              </div>
              <div style={{ padding: '4px 12px', textAlign: 'center', fontSize: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>
                  <div>Authorized Signatory</div>
                  <div style={{ marginTop: 8 }}>___________________</div>
                  <div style={{ marginTop: 16, fontSize: 9, color: '#666' }}>This is a Computer Generated Erode Invoice</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ErodeSalesInvoicePage;