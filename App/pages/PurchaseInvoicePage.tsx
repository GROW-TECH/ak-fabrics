import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Printer, Save } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';
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
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (isInter) igst = round2((taxable * rate) / 100);
  else {
    cgst = round2((taxable * rate) / 200);
    sgst = round2((taxable * rate) / 200);
  }
  const tax = round2(cgst + sgst + igst);
  const roundOff = round2(Math.round(taxable + tax) - (taxable + tax));
  return { cgst, sgst, igst, roundOff, totalAfterTax: round2(taxable + tax + roundOff), gstRate: rate };
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const PurchaseInvoicePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { shopName } = useAuth();
  const [purchase, setPurchase] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [f, setF] = useState({
    vendor_name: "",
    vendor_address: "",
    vendor_address2: "",
    vendor_gstin: "",
    vendor_state_code: "",
    vendor_pincode: "",
    invoice_no: "",
    invoice_date: "",
    bale_no: "",
    through_agent: "",
    lr_no: "",
    notes: "",
  });
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const fetchPurchase = async () => {
    if (!id) return;
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
    }
  };

  useEffect(() => { fetchPurchase(); }, [id]);

  const taxable = useMemo(
    () => (purchase?.items || []).reduce((s: number, i: any) => s + Number(i.total || 0), 0),
    [purchase]
  );

  const tax = useMemo(() => {
    const rate = Number(purchase?.gst_rate || DEFAULT_GST_RATE);
    const shop = String(purchase?.shop_pincode || DEFAULT_SHOP_PINCODE).trim();
    return computeTax(taxable, f.vendor_pincode, rate, shop);
  }, [purchase, f.vendor_pincode, taxable]);

 const shareAsImage = async () => {
  setSharing(true);
  try {
    const invoiceEl = document.querySelector(".ps") as HTMLElement;
    if (!invoiceEl) { alert("Invoice not found"); setSharing(false); return; }

    const canvas = await html2canvas(invoiceEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#fff",
      logging: false,
    });

    canvas.toBlob(async (blob) => {
      if (!blob) { alert("Failed to capture invoice"); setSharing(false); return; }

      // Resolve phone
      const urlParams = new URLSearchParams(location.search);
      const urlPhone = urlParams.get("phone") || "";
      const dataPhone = purchase?.vendor_phone
        ? String(purchase.vendor_phone).replace(/\D/g, "")
        : "";
      const rawPhone = urlPhone || dataPhone;
      const cleaned = rawPhone.replace(/\D/g, "");
      const waPhone = cleaned.length === 10
        ? "91" + cleaned
        : cleaned.length >= 11 && cleaned.startsWith("91")
        ? cleaned
        : cleaned;

      console.log("Final waPhone:", waPhone);

      // Mobile: Web Share API
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${f.invoice_no || "invoice"}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ title: `Invoice ${f.invoice_no}`, files: [file] });
            setSharing(false);
            return;
          } catch (_) {}
        }
      }

      // Download image
      const imgUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = imgUrl;
      a.download = `${f.invoice_no || "invoice"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(imgUrl);

      const msg = encodeURIComponent(
        `Dear ${f.vendor_name || "Vendor"},\nPurchase Invoice *${f.invoice_no}* from *${shopName || "AK Fabrics"}*\nAmount: ₹${money(tax.totalAfterTax)}\n\n_Please find the attached invoice image._`
      );

      setTimeout(() => {
        if (waPhone.length >= 10) {
          // ✅ WhatsApp Web direct chat — goes straight to that number
          window.open(`https://web.whatsapp.com/send?phone=${waPhone}&text=${msg}`, "_blank");
        } else {
          window.open(`https://web.whatsapp.com/send?text=${msg}`, "_blank");
        }
      }, 800);

      setSharing(false);
    }, "image/png");

  } catch (err) {
    console.error(err);
    alert("Failed to share invoice");
    setSharing(false);
  }
};

  // Auto-trigger share if navigated with ?share=true
  useEffect(() => {
    if (!purchase) return;
    const params = new URLSearchParams(location.search);
    if (params.get("share") === "true") {
      setTimeout(() => shareAsImage(), 800);
    }
  }, [purchase]);

  const saveAll = async () => {
    if (!id || !purchase) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/purchases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          vendor_id: purchase.vendor_id,
          payment_mode: purchase.payment_mode || "CREDIT",
          paid_amount: Number(purchase.paid_amount || 0),
          through_agent: f.through_agent || null,
          notes: f.notes || null,
          items: (purchase.items || []).map((item: any) => ({
            productId: item.product_id || item.productId || "",
            hsn: item.hsn || "",
            size: item.size || "",
            description: item.description || "",
            rate: Number(item.rate || 0),
            qty: Number(item.quantity ?? item.qty ?? 0),
            discount: Number(item.discount || 0),
            total: Number(item.total || 0),
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        return alert(e.error || "Failed");
      }
      await fetchPurchase();
    } finally {
      setSaving(false);
    }
  };

  if (!purchase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const paid = Number(purchase.paid_amount || 0);
  const balance = Math.max(0, tax.totalAfterTax - paid);
  const items: any[] = purchase.items || [];
  const G = "#2e7d32";
  const DG = "#1b5e20";

  const inp = (w?: string | number): React.CSSProperties => ({
    border: "none",
    borderBottom: "1px dashed #aaa",
    outline: "none",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 12,
    padding: "1px 3px",
    width: w || "100%",
    display: "block",
  });

  const boxInp = (w?: string | number): React.CSSProperties => ({
    border: `1px solid ${G}`,
    outline: "none",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 11,
    padding: "2px 5px",
    width: w || "auto",
    borderRadius: 2,
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
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={saveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={shareAsImage}
            disabled={sharing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60 text-sm"
          >
            {sharing
              ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              : <WhatsAppIcon />}
            {sharing ? "Capturing..." : "WhatsApp"}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* INVOICE */}
      <div className="ps">
        <div className="inv-wrap inv">

          {/* ── HEADER ── */}
          <div style={{ borderBottom: `2px solid ${G}` }}>

            {/* TOP ROW: GSTIN left | deity text center | phone right */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", borderBottom: `1px solid ${G}` }}>
              <div style={{ fontSize: 10.5 }}>
                <div><b>GSTIN : </b>{purchase.shop_gstin || "33AKGPK9627B1ZC"}</div>
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

            {/* MAIN LOGO ROW */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", width: 140 }}>
                <img
                  src="/AK Logo.jpg"
                  alt="AK Fabrics"
                  style={{ width: 100, height: 100, objectFit: "contain", display: "block" }}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
              <div style={{ flex: 1, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 900, color: DG, lineHeight: 1, letterSpacing: 2, fontFamily: "Georgia,serif" }}>
                  {shopName || "AK FABRICS"}
                </div>
                <div style={{ fontSize: 13, fontWeight: "bold", color: G, marginTop: 3 }}>CLOTH MERCHANT</div>
                <div style={{ fontSize: 11, fontWeight: "bold", color: DG, marginTop: 3 }}>
                  34, No-1 PandariNadhar Street, Ammapet, Salem - 636003
                </div>
                <div style={{ fontSize: 10, color: "#444" }}>E-Mail : ak.fabries.salem@gmail.com</div>
              </div>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", width: 140 }}>
                <img
                  src="/Goddess.jpg"
                  alt="Goddess"
                  style={{ width: 100, height: 100, objectFit: "contain", display: "block" }}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            </div>

            {/* PURCHASE INVOICE label */}
            <div style={{ borderTop: `1px solid ${G}`, padding: "2px 10px", textAlign: "center", fontSize: 12, fontWeight: "bold", textDecoration: "underline", color: DG }}>
              PURCHASE INVOICE
            </div>

            {/* Prop line */}
            <div style={{ borderTop: `1px solid ${G}`, padding: "3px 10px", fontSize: 11 }}>
              <b>Prop : K.KANNAN</b>
            </div>
          </div>

          {/* ── BILLING + INVOICE ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${G}` }}>
            <div style={{ borderRight: `1px solid ${G}`, padding: "8px 12px" }}>
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>To.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>M/s.</span>
                <input value={f.vendor_name} onChange={upd("vendor_name")} placeholder="Vendor name" style={inp()} />
              </div>
              <input value={f.vendor_address} onChange={upd("vendor_address")} placeholder="Address line 1" style={{ ...inp(), marginBottom: 5 }} />
              <input value={f.vendor_address2} onChange={upd("vendor_address2")} placeholder="City / District" style={{ ...inp(), marginBottom: 8 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>GSTIN</span>
                <input value={f.vendor_gstin} onChange={upd("vendor_gstin")} placeholder="Vendor GSTIN" style={boxInp(145)} />
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>STATE CODE.</span>
                <input value={f.vendor_state_code} onChange={upd("vendor_state_code")} placeholder="33" style={boxInp(36)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: "bold" }}>Pincode:</span>
                <input value={f.vendor_pincode} onChange={upd("vendor_pincode")} placeholder="Enter pincode" style={boxInp(100)} />
              </div>
            </div>

            <div style={{ padding: "8px 12px" }}>
              {([
                ["Invoice No", "invoice_no"],
                ["Invoice Date", "invoice_date"],
                ["Bale No", "bale_no"],
                ["Through", "through_agent"],
                ["L.R. No", "lr_no"],
              ] as [string, string][]).map(([label, key]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: "bold", minWidth: 90, fontSize: 12 }}>{label}</span>
                  <input value={(f as any)[key]} onChange={upd(key)} placeholder={label} style={inp()} />
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
                <div style={{ fontWeight: "bold", fontSize: 14, color: DG }}>For {shopName || "AK FABRICS"}</div>
                <div style={{ marginTop: 34, fontSize: 11 }}>Authorised Signatory.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoicePage;