import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Save } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
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

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
    vendor_name: "", vendor_address: "", vendor_address2: "",
    vendor_gstin: "", vendor_state_code: "", vendor_pincode: "",
    invoice_no: "", invoice_date: "", bale_no: "", through_agent: "", lr_no: "", notes: "",
  });

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

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
        vendor_address2: d.vendor_address2 || "",
        vendor_gstin: gstin,
        vendor_state_code: gstin.length >= 2 ? gstin.slice(0, 2) : "",
        vendor_pincode: String(d.vendor_pincode || "").trim(),
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

  const resolveWaPhone = () => {
    const urlParams = new URLSearchParams(location.search);
    const urlPhone = urlParams.get("phone") || "";
    const dataPhone = purchase?.vendor_phone ? String(purchase.vendor_phone).replace(/\D/g, "") : "";
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

      const canvas = await html2canvas(invoiceEl, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: "#fff", logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) { alert("Failed to capture invoice"); setSharing(false); return; }

        const waPhone = resolveWaPhone();

        const nav: any = navigator;
        if (nav.share && nav.canShare) {
          const file = new File([blob], `${f.invoice_no || "purchase-invoice"}.png`, { type: "image/png" });
          if (nav.canShare({ files: [file] })) {
            try {
              await nav.share({ title: `Purchase ${f.invoice_no}`, files: [file] });
              setSharing(false);
              return;
            } catch (_) {}
          }
        }

        const imgUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = imgUrl;
        a.download = `${f.invoice_no || "purchase-invoice"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(imgUrl);

        const msg = encodeURIComponent(
          `Purchase Invoice *${f.invoice_no}* from *${shopName || "AK Fabrics"}*\nAmount: ₹${money(tax.totalAfterTax)}`
        );
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
      const res = await fetch(`${API}/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          vendor_id: purchase?.vendor_id,
          items: purchase?.items || [],
          payment_mode: purchase?.payment_mode || "CREDIT",
          paid_amount: Number(purchase?.paid_amount || 0),
          bank_id: purchase?.bank_id || null,
          through_agent: f.through_agent || null,
          notes: f.notes || null,
          location: purchase?.location || null,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return alert(e.error || "Failed"); }
      await fetchPurchase();
    } finally { setSaving(false); }
  };

  if (!purchase) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const paid = Number(purchase.paid_amount || 0);
  const balance = Math.max(0, tax.totalAfterTax - paid);
  const items: any[] = purchase.items || [];
  const G = "#2e7d32";

  const paymentStatus = balance === 0 ? "PAID" : paid > 0 ? "HALF_PAID" : "NOT_PAID";
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID": return "text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200";
      case "HALF_PAID": return "text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-bold border border-red-200";
      default: return "text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-bold border border-red-200";
    }
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Lakh", "Crore"];
    const convertLessThanThousand = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertLessThanThousand(n % 100) : "");
    };
    let result = "";
    let scale = 0;
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk > 0) {
        const chunkWords = convertLessThanThousand(chunk);
        result = chunkWords + (thousands[scale] ? " " + thousands[scale] : "") + (result ? " " + result : "");
      }
      num = Math.floor(num / 1000);
      scale++;
    }
    return result + " Rupees Only";
  };

  const inp = (w?: string | number): React.CSSProperties => ({
    border: "none", borderBottom: "1px dashed #aaa", outline: "none",
    background: "transparent", fontFamily: "inherit", fontSize: 12,
    padding: "1px 3px", width: w || "100%", display: "block",
  });

  const boxInp = (w?: string | number): React.CSSProperties => ({
    border: `1px solid ${G}`, outline: "none", background: "transparent",
    fontFamily: "inherit", fontSize: 11, padding: "2px 5px",
    width: w || "auto", borderRadius: 2,
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
          body *{visibility:hidden;}
          .ps,.ps *{visibility:visible!important;}
          .ps{position:absolute;left:0;top:0;width:100%;margin:0;padding:0;}
          .no-print{display:none!important;}
        }
      `}</style>

      <div className="no-print flex items-center justify-between gap-3 py-3">
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="action-buttons flex items-center gap-2">
          <button onClick={saveAll} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 text-sm">
            {saving
              ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={shareAsImage} disabled={sharing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60 text-sm">
            {sharing
              ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              : <WhatsAppIcon />}
            {sharing ? "Capturing..." : "WhatsApp"}
          </button>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="ps">
        <div className="inv-wrap inv" style={{ position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 440, height: 440,
            pointerEvents: "none",
            zIndex: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="/AK Logo.jpg"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.07 }}
              onError={e => (e.target as HTMLImageElement).style.display = "none"}
            />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="srow inv-top-meta" style={{ padding: "6px 10px" }}>
              <div style={{ width: "33%" }}>
                <div><b>GSTIN :</b> {purchase.shop_gstin || "33AKCPK9627B1ZC"}</div>
                <div><b>STATE CODE :</b> {purchase.shop_state_code || "33"}</div>
              </div>
              <div style={{ width: "34%", textAlign: "center", fontStyle: "italic", color: "#444" }}>
                Paruthipalli Angalamman Thunai
              </div>
              <div style={{ width: "33%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📞</span><span>{purchase.shop_phone || "9443095080"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📞</span><span>{purchase.shop_phone2 || "9262021600"}</span>
                </div>
              </div>
            </div>

            <div style={{ borderBottom: `1px solid ${G}` }}>
              <div className="inv-brand-row" style={{ display: "grid", gridTemplateColumns: "110px 1fr 110px", alignItems: "center" }}>
                <div className="inv-logo-block" style={{ padding: 8, display: "flex", justifyContent: "center" }}>
                  <img src="/ak logo1.png" alt="AK" style={{ width: 86, height: 86, objectFit: "contain" }}
                    onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                </div>
                <div className="inv-brand-center" style={{ textAlign: "center", padding: "4px 10px" }}>
                  <div className="inv-brand-title" style={{ fontSize: 42, fontWeight: 700, color: G, letterSpacing: 2 }}>
                    {shopName || "AK Fabrics"}
                  </div>
                  <div className="inv-brand-sub" style={{ fontSize: 14, fontWeight: 700, color: G }}>
                    CLOTH MERCHANT
                  </div>
                  <div className="inv-brand-addr" style={{ fontSize: 12, marginTop: 2 }}>
                    34, No-1 PandariNadhar Street, Ammapet, Salem - 636003
                  </div>
                  <div style={{ fontSize: 11, marginTop: 1 }}>
                    E-Mail : ak.fabrics.salem@gmail.com
                  </div>
                </div>
                <div className="inv-logo-block" style={{ padding: 8, display: "flex", justifyContent: "center" }}>
                  <img src="/god.png" alt="" style={{ width: 86, height: 86, objectFit: "contain" }}
                    onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                </div>
              </div>
              <div style={{ textAlign: "center", fontWeight: 700, padding: "6px 0", borderTop: `1px solid ${G}` }}>
                TAX INVOICE
              </div>
            </div>

            <div className="srow" style={{ fontWeight: 700 }}>
              <div>Prop : K.KANNAN</div>
              <div />
            </div>

            <div className="inv-bill-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${G}` }}>
              <div className="inv-bill-left" style={{ padding: 8, borderRight: `1px solid ${G}` }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>To.</div>
                <div style={{ marginBottom: 2 }}>
                  <b>M/s.</b>{" "}
                  <input style={inp()} value={f.vendor_name} onChange={upd("vendor_name")} placeholder="Vendor name" />
                </div>
                <div style={{ marginBottom: 2 }}>
                  <input style={inp()} value={f.vendor_address} onChange={upd("vendor_address")} placeholder="Address line 1" />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <input style={inp()} value={f.vendor_address2} onChange={upd("vendor_address2")} placeholder="City / District" />
                </div>
                <div className="inv-gstin-row" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <b>GSTIN</b>
                    <input style={boxInp(160)} value={f.vendor_gstin} onChange={upd("vendor_gstin")} placeholder="GSTIN" />
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <b>STATE CODE.</b>
                    <input style={boxInp(40)} value={f.vendor_state_code} onChange={upd("vendor_state_code")} placeholder="00" />
                  </div>
                </div>
                <div className="inv-pin-row" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                  <b>Pincode:</b>
                  <input style={boxInp(90)} value={f.vendor_pincode} onChange={upd("vendor_pincode")} placeholder="000000" />
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>Invoice No</div>
                  <div>{f.invoice_no}</div>
                  <div style={{ fontWeight: 700 }}>Invoice Date</div>
                  <div>{f.invoice_date}</div>
                  <div style={{ fontWeight: 700 }}>Bale No</div>
                  <input style={inp()} value={f.bale_no} onChange={upd("bale_no")} placeholder="Bale No" />
                  <div style={{ fontWeight: 700 }}>Through</div>
                  <input style={inp()} value={f.through_agent} onChange={upd("through_agent")} placeholder="Through" />
                  <div style={{ fontWeight: 700 }}>L.R. No</div>
                  <input style={inp()} value={f.lr_no} onChange={upd("lr_no")} placeholder="L.R. No" />
                  <div style={{ fontWeight: 700 }}>Payment Status</div>
                  <div>
                    <span className={getStatusColor(paymentStatus)}>{paymentStatus.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="inv-table-wrap">
              <table className="itbl">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>S.No</th>
                    <th style={{ width: 80 }}>HSN CODE</th>
                    <th style={{ width: 80 }}>Size</th>
                    <th>Particulars</th>
                    <th style={{ width: 120 }}>Rate</th>
                    <th style={{ width: 60 }}>Qty.</th>
                    <th style={{ width: 140 }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ textAlign: "center" }}>{it.hsn || ""}</td>
                      <td style={{ textAlign: "center" }}>{it.size || ""}</td>
                      <td>{it.description || ""}</td>
                      <td style={{ textAlign: "right" }}>{money(it.rate)}</td>
                      <td style={{ textAlign: "center" }}>{it.quantity ?? it.qty ?? 0}</td>
                      <td style={{ textAlign: "right" }}>{money(it.total)}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
                    <tr key={`e-${i}`}>
                      <td>&nbsp;</td><td /><td /><td /><td /><td /><td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", borderTop: `1px solid ${G}` }}>
              <div style={{ padding: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Amount in words:</div>
                <div style={{ fontStyle: "italic" }}>{numberToWords(Math.round(tax.totalAfterTax))}</div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Notes:</div>
                  <input style={inp()} value={f.notes} onChange={upd("notes")} placeholder="Notes" />
                </div>
              </div>
              <div style={{ padding: 8, borderLeft: `1px solid ${G}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                  <div>Taxable Amount</div><div style={{ textAlign: "right" }}>{money(taxable)}</div>
                  <div>CGST</div><div style={{ textAlign: "right" }}>{money(tax.cgst)}</div>
                  <div>SGST</div><div style={{ textAlign: "right" }}>{money(tax.sgst)}</div>
                  <div>IGST</div><div style={{ textAlign: "right" }}>{money(tax.igst)}</div>
                  <div style={{ fontWeight: 700 }}>Round Off</div><div style={{ textAlign: "right", fontWeight: 700 }}>{money(tax.roundOff)}</div>
                  <div style={{ fontWeight: 800 }}>Grand Total</div><div style={{ textAlign: "right", fontWeight: 800 }}>{money(tax.totalAfterTax)}</div>
                  <div>Paid</div><div style={{ textAlign: "right" }}>{money(paid)}</div>
                  <div style={{ fontWeight: 700 }}>Balance</div><div style={{ textAlign: "right", fontWeight: 700 }}>{money(balance)}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${G}` }}>
              <div style={{ padding: 8, borderRight: `1px solid ${G}` }}>
                <div style={{ fontWeight: 700 }}>Receiver's Signature</div>
              </div>
              <div style={{ padding: 8, textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>For {shopName || "AK Fabrics"}</div>
                <div style={{ marginTop: 26, fontWeight: 700 }}>Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoicePage;

