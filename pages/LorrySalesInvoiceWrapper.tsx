import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Share2 } from "lucide-react";
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL;
const DEFAULT_GST_RATE = 5;
const DEFAULT_SHOP_PINCODE = "636003";
const money = (v: number) => Number(v || 0).toLocaleString("en-IN");
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

const SalesInvoicePage: React.FC = () => {

  const invoiceRef = useRef(null);

  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    customer_name: "", customer_address: "", customer_address2: "",
    customer_gstin: "", customer_state_code: "", customer_pincode: "",
    invoice_no: "", invoice_date: "", bale_no: "", through_agent: "", lr_no: "", notes: "",
    lorry_number: "", driver_name: "",
  });
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const fetchSale = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API}/api/lorry-sales/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const d = await res.json();
        console.log("InvoiceWrapper: Raw response data:", d);
        setSale(d);
        
        // Format data properly for form display
        const formattedData = {
          customer_name: d.customer_name || "",
          customer_address: d.customer_address || "",
          customer_address2: d.customer_address2 || "",
          customer_gstin: d.customer_gstin || "",
          customer_state_code: d.customer_state_code || "",
          customer_pincode: String(d.customer_pincode || "").trim(),
          invoice_no: d.invoice_no || "",
          invoice_date: d.invoice_date || new Date(d.created_at || Date.now()).toLocaleDateString("en-IN"),
          bale_no: d.bale_no || "",
          through_agent: d.through_agent || "",
          lr_no: d.lr_no || "",
          notes: d.notes || "",
          lorry_number: d.lorry_number || d.lorryNumber || "",
          driver_name: d.driver_name || d.driverName || "",
        };
        
        console.log("InvoiceWrapper: Formatted form data:", formattedData);
        setF(formattedData);
      } else {
        console.error("InvoiceWrapper: Failed to fetch sale data");
      }
    } catch (error) {
      console.error("InvoiceWrapper: Error fetching sale:", error);
    }
  };

  useEffect(() => { fetchSale(); }, [id]);

  const taxable = useMemo(
    () => (sale?.items || []).reduce((s: number, i: any) => {
      const rate = Number(i.rate || 0);
      const qty = Number(i.quantity || i.qty || 0);
      const discount = Number(i.discount || 0);
      const itemTotal = rate * qty;
      const discountAmount = (itemTotal * discount) / 100;
      return s + (itemTotal - discountAmount);
    }, 0),
    [sale]
  );
  const tax = useMemo(() => {
    const rate = Number(sale?.gst_rate || DEFAULT_GST_RATE);
    const shop = String(sale?.customer_pincode || f.customer_pincode || DEFAULT_SHOP_PINCODE).trim();
    return computeTax(taxable, f.customer_pincode, rate, shop);
  }, [sale, f.customer_pincode, taxable]);

  const handleDownload = async () => {
    const res = await fetch(`${API}/api/sales/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) return alert("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${f.invoice_no || "invoice"}.pdf`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };



const handleShare = async () => {
  try {

    const canvas = await html2canvas(invoiceRef.current);

    canvas.toBlob(async (blob) => {

      const file = new File([blob], "invoice.png", {
        type: "image/png",
      });

      if (navigator.share) {

        await navigator.share({
          title: "AK Fabrics Invoice",
          files: [file],
        });

      } else {

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "invoice.png";
        a.click();

      }

    });

  } catch (err) {
    console.error(err);
    alert("Share failed");
  }
};


  const saveAll = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/lorry-sales/${id}/tax-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ customerPincode: f.customer_pincode, gstRate: Number(sale?.gst_rate || DEFAULT_GST_RATE), ...f }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return alert(e.error || "Failed"); }
      const data = await res.json();
      setSale(data.sale);
    } finally { setSaving(false); }
  };

  if (!sale) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const paid = Number(sale.paid_amount || 0);
  const balance = Math.max(0, tax.totalAfterTax - paid);
  const items: any[] = sale.items || [];
  const G = "#2e7d32";
  const DG = "#1b5e20";

  // Shared input style — used everywhere
  const inp = (w?: string | number): React.CSSProperties => ({
    border: "none",
    borderBottom: `1px dashed #aaa`,
    outline: "none",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 12,
    padding: "2px 3px",
    width: w || "100%",
    display: "block",
    color: "#111",
    fontWeight: "normal",
  });

  const boxInp = (w?: string | number): React.CSSProperties => ({
    border: `1px solid ${G}`,
    outline: "none",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 11,
    padding: "3px 5px",
    width: w || "auto",
    borderRadius: 2,
    color: "#111",
    fontWeight: "normal",
  });

  return (
    <div className="max-w-4xl mx-auto">
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

      {/* ACTION BAR */}
      <div className="no-print flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>



        <div className="flex gap-2">
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 text-sm">
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}
          </button>


<button
  onClick={handleShare}
  className="inline-flex items-center gap-2 px-4 py-2 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 text-sm"
>
  <Share2 className="w-4 h-4" />
  Share
</button>

         
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm">
            <Printer className="w-4 h-4" />Print
          </button>
        </div>
      </div>

      {/* INVOICE */}
      <div className="ps" ref={invoiceRef}>
        <div className="inv-wrap inv">

        {/* ── HEADER ── */}
<div style={{ borderBottom: `2px solid ${G}` }}>

  {/* TOP ROW: GSTIN left | deity text center | phone right */}
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", borderBottom: `1px solid ${G}` }}>
    <div style={{ fontSize: 10.5 }}>
      <div><b>GSTIN : </b>{sale.shop_gstin || "33AKGPK9627B1ZC"}</div>
      <div><b>STATE CODE : </b>33</div>
    </div>
    <div style={{ fontSize: 10, color: "#555", fontStyle: "italic", textAlign: "center" }}>
      Paruthipalli Angalamman Thumai
    </div>
    <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill={G}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
        <span>9443095080</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill={G}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
        <span>9262021600</span>
      </div>
    </div>
  </div>

  {/* MAIN LOGO ROW: AK Logo | Center text | Goddess */}
  <div style={{ display: "flex", alignItems: "center" }}>

    {/* LEFT: AK Logo — no border */}
    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", width: 140 }}>
      <img
        src="/AK Logo.jpg.jpeg"
        alt="AK Fabrics"
        style={{ width: 100, height: 100, objectFit: "contain", display: "block" }}
        onError={e => (e.target as HTMLImageElement).style.display = "none"}
      />
    </div>

    {/* CENTER: Shop name */}
    <div style={{ flex: 1, padding: "6px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 34, fontWeight: 900, color: DG, lineHeight: 1, letterSpacing: 2, fontFamily: "Georgia,serif" }}>
        AK FABRICS
      </div>
      <div style={{ fontSize: 13, fontWeight: "bold", color: G, marginTop: 3 }}>CLOTH MERCHANT</div>
      <div style={{ fontSize: 11, fontWeight: "bold", color: DG, marginTop: 3 }}>
        34, No-1 PandariNadhar Street, Ammapet, Salem - 636003
      </div>
      <div style={{ fontSize: 10, color: "#444" }}>E-Mail : ak.fabries.salem@gmail.com</div>
    </div>

    {/* RIGHT: Goddess image — centered like AK logo, no border */}
    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", width: 140 }}>
      <img
        src="/Goddess.jpg.jpeg"
        alt="Goddess"
        style={{ width: 100, height: 100, objectFit: "contain", display: "block" }}
        onError={e => (e.target as HTMLImageElement).style.display = "none"}
      />
    </div>
  </div>

  {/* LORRY SALES INVOICE strip */}
  <div style={{ borderTop: `1px solid ${G}`, padding: "2px 10px", textAlign: "center", fontSize: 12, fontWeight: "bold", textDecoration: "underline", color: DG }}>
    LORRY SALES INVOICE
  </div>

  {/* Prop line */}
  <div style={{ borderTop: `1px solid ${G}`, padding: "3px 10px", fontSize: 11 }}>
    <b>Prop : K.KANNAN</b>
  </div>
</div>

          {/* ── BILLING + INVOICE ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${G}` }}>

            {/* Left: Customer */}
            <div style={{ borderRight: `1px solid ${G}`, padding: "8px 12px" }}>
              <div style={{ fontWeight: "bold", marginBottom: 6, fontSize: 13 }}>To.</div>

              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap", fontSize: 12 }}>M/s.</span>
                <input 
                  value={f.customer_name} 
                  onChange={upd("customer_name")} 
                  placeholder="Customer name" 
                  style={{...inp(), fontSize: 12, fontWeight: "bold"}} 
                />
              </div>

              <input 
                value={f.customer_address} 
                onChange={upd("customer_address")} 
                placeholder="Address line 1" 
                style={{ ...inp(), marginBottom: 5, backgroundColor: f.customer_address ? '#f0f9ff' : '#fff', fontSize: 12 }} 
              />
              <input 
                value={f.customer_address2} 
                onChange={upd("customer_address2")} 
                placeholder="City / District" 
                style={{ ...inp(), marginBottom: 8, backgroundColor: f.customer_address2 ? '#f0f9ff' : '#fff', fontSize: 12 }} 
              />

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap", fontSize: 11 }}>GSTIN</span>
                <input 
                  value={f.customer_gstin} 
                  onChange={upd("customer_gstin")} 
                  placeholder="Customer GSTIN" 
                  style={boxInp(145)} 
                />
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap", fontSize: 11 }}>STATE CODE.</span>
                <input 
                  value={f.customer_state_code} 
                  onChange={upd("customer_state_code")} 
                  placeholder="33" 
                  style={boxInp(36)} 
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: f.customer_pincode ? '#f0f9ff' : 'transparent', padding: '2px', borderRadius: '2px' }}>
                <span style={{ fontWeight: "bold", fontSize: 11 }}>Pincode:</span>
                <input 
                  value={f.customer_pincode} 
                  onChange={upd("customer_pincode")} 
                  placeholder="Enter pincode" 
                  style={boxInp(100)} 
                />
              </div>
            </div>

            {/* Right: Invoice details */}
            <div style={{ padding: "8px 12px" }}>
              {[
                ["Invoice No", "invoice_no"],
                ["Invoice Date", "invoice_date"],
                ["Lorry No", "lorry_number"],
                ["Driver Name", "driver_name"],
                ["Bale No", "bale_no"],
                ["Through", "through_agent"],
                ["L.R. No", "lr_no"]
              ].map(([label, key]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: "bold", minWidth: 90, fontSize: 12 }}>{label}</span>
                  <input
                    value={(f as any)[key] || (sale as any)[key] || ""}
                    onChange={upd(key)}
                    placeholder={label}
                    style={{...inp(), fontSize: 12}}
                  />
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
                <th style={{ width: 100 }}>
                  Rate
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "normal", fontSize: 10, paddingInline: 3 }}>
                    <span>Rs.</span><span>P.</span>
                  </div>
                </th>
                <th style={{ width: 46 }}>Qty.</th>
                <th style={{ width: 100 }}>
                  AMOUNT
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "normal", fontSize: 10, paddingInline: 3 }}>
                    <span>Rs.</span><span>P.</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
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
          <div style={{ borderTop: `1px solid ${G}`, display: "grid", gridTemplateColumns: "1fr 1fr" }}>

            {/* Left */}
            <div style={{ borderRight: `1px solid ${G}`, padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, fontSize: 11 }}>
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Rupees</span>
                <input value={f.notes} onChange={upd("notes")} placeholder="Amount in words / notes" style={inp()} />
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

            {/* Right: Tax */}
            <div>
              {[
                ["Total Amount Before Tax", money(taxable), false],
                [`CGST ........ ${(tax.gstRate / 2).toFixed(1)} %`, money(tax.cgst), false],
                [`SGST ........ ${(tax.gstRate / 2).toFixed(1)} %`, money(tax.sgst), false],
                [`IGST ........ ${tax.gstRate.toFixed(1)} %`, money(tax.igst), false],
                ["Round off", (tax.roundOff >= 0 ? "+" : "") + money(tax.roundOff), false],
                ["Total Amount After Tax", money(tax.totalAfterTax), true],
                ["Already Paid", money(paid), false],
                ["Balance", money(balance), true],
              ].map(([label, value, highlight]) => (
                <div key={label as string} className="srow" style={highlight ? { background: "#e8f5e9" } : {}}>
                  <span style={highlight ? { fontWeight: "bold", color: DG } : {}}>{label}</span>
                  <span style={{ fontWeight: "bold", color: highlight ? DG : "inherit" }}>{value}</span>
                </div>
              ))}

              <div style={{ marginTop: 40, padding: "0 14px 14px", textAlign: "right" }}>
                <div style={{ fontWeight: "bold", fontSize: 14, color: DG }}>For AK FABRICS</div>
                <div style={{ marginTop: 34, fontSize: 11 }}>Authorised Signatory.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SalesInvoicePage;