import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useAuth } from "../contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ── tiny helper: number → Indian words ── */
const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
               "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
               "Seventeen","Eighteen","Nineteen"];
const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function numToWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0)   return "Minus " + numToWords(-n);
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
  if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + numToWords(n%100) : "");
  if (n < 100000)  return numToWords(Math.floor(n/1000))  + " Thousand" + (n%1000   ? " " + numToWords(n%1000)   : "");
  if (n < 10000000) return numToWords(Math.floor(n/100000)) + " Lakh"  + (n%100000  ? " " + numToWords(n%100000)  : "");
  return numToWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + numToWords(n%10000000) : "");
}
function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let words = numToWords(rupees) + " Rupees";
  if (paise > 0) words += " and " + numToWords(paise) + " Paise";
  return words + " Only";
}

/* ── Date cell grid ── */
const DateCell: React.FC<{ val: string }> = ({ val }) => (
  <div style={{
    width: 22, height: 26, border: "1px solid #6b7280",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#111",
    background: "#fffef0", fontFamily: "monospace",
  }}>{val}</div>
);

const ChequePrint: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shopName } = useAuth();
  const [row, setRow] = useState<any>(null);
  const [sharing, setSharing] = useState(false);
  const chequeRef = useRef<HTMLDivElement | null>(null);

  const fetchRow = async () => {
    if (!id) return;
    const res = await fetch(`${API}/api/cheques/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setRow(await res.json());
  };

  useEffect(() => { fetchRow(); }, [id]);

  if (!row) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  const bankName   = (row.bank_name || "INDIAN BANK").toUpperCase();
  const branch     = row.branch || "SALEM MAIN BRANCH";
  const ifsc       = row.ifsc || "";
  const payee      = row.payee_name || "";
  const amount     = Number(row.amount || 0);
  const amtNum     = amount.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const amtWords   = row.amount_words || amountToWords(amount);
  const accountNo  = row.account_no || "";
  const chequeNo   = row.cheque_no || (row.id || "").slice(-6).toUpperCase();
  const micrCode   = row.micr_code || "600002001";

  // parse date for cells
  let dd="",mm="",yy1="",yy2="",yy3="",yy4="";
  if (row.cheque_date) {
    const d = new Date(row.cheque_date);
    const pad = (n:number)=>String(n).padStart(2,"0");
    dd=pad(d.getDate()); mm=pad(d.getMonth()+1);
    const yr=String(d.getFullYear());
    yy1=yr[0]; yy2=yr[1]; yy3=yr[2]; yy4=yr[3];
  }

  // MICR line segments
  const micrLeft   = micrCode.replace(/(\d{3})(\d{3})(\d{3})/,"$1 $2 $3");
  const micrCenter = accountNo.split("").join(" ");
  const micrRight  = chequeNo.split("").join(" ");

  const shareCheque = async () => {
    if (!chequeRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(chequeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png", 0.95);
      });

      const file = new File([blob], `cheque-${chequeNo}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: any) => boolean;
        share?: (data: any) => Promise<void>;
      };

      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: `Cheque - ${bankName}`,
          text: `Cheque for ${payee || "payee"} amount ₹${amtNum}`,
        });
      } else {
        // Fallback: download the image so it can be picked in WhatsApp Web
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cheque-${chequeNo}.png`;
        a.click();
        URL.revokeObjectURL(url);
        alert("Sharing isn't supported on this device/browser. The cheque image was downloaded—attach it in WhatsApp.");
      }
    } catch (err) {
      console.error("Share failed", err);
      alert("Couldn't generate the cheque image. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ps, .ps * { visibility: visible !important; }
          .ps { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 6mm; box-sizing: border-box; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print" style={{ display:"flex", justifyContent:"space-between", padding:"16px 0 20px" }}>
        <button onClick={()=>navigate(-1)} style={{
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"8px 18px", border:"1px solid #d1d5db",
          background:"#fff", color:"#374151", borderRadius:8, fontSize:14, cursor:"pointer",
        }}>
          <ArrowLeft size={16}/> Back
        </button>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>window.print()} style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"8px 18px", border:"1px solid #c7d2fe",
            background:"#eef2ff", color:"#4338ca", borderRadius:8, fontSize:14, cursor:"pointer",
          }}>
            <Printer size={16}/> Print
          </button>
          <button onClick={shareCheque} disabled={sharing} style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"8px 18px", border:"1px solid #0ea5e9",
            background: sharing ? "#bae6fd" : "#0ea5e9",
            color:"#0b4f75", borderRadius:8, fontSize:14, cursor: sharing ? "not-allowed" : "pointer",
            opacity: sharing ? 0.8 : 1,
          }}>
            <Share2 size={16}/> {sharing ? "Preparing..." : "Share"}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CHEQUE — real bank cheque layout
          ══════════════════════════════════════ */}
      <div className="ps" ref={chequeRef}>
        <div style={{
          width: "100%",
          border: "1.5px solid #9ca3af",
          borderRadius: 4,
          overflow: "hidden",
          fontFamily: "Georgia, 'Times New Roman', serif",
          background: "linear-gradient(170deg, #fefce8 0%, #fdf9e3 40%, #fef9e0 70%, #fefce8 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          position: "relative",
        }}>

          {/* ── Subtle waterline texture ── */}
          <div style={{
            position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
            background:`
              repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(180,160,80,0.06) 28px, rgba(180,160,80,0.06) 29px),
              repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(180,160,80,0.04) 60px, rgba(180,160,80,0.04) 61px)
            `,
          }}/>

          {/* ── CTS-2010 watermark text ── */}
          <div style={{
            position:"absolute", top:"38%", left:"50%",
            transform:"translate(-50%,-50%) rotate(-25deg)",
            fontSize:60, fontWeight:900, color:"rgba(200,180,80,0.07)",
            letterSpacing:8, pointerEvents:"none", zIndex:0, whiteSpace:"nowrap",
            fontFamily:"Arial, sans-serif",
          }}>
            CTS-2010
          </div>

          {/* ════════════════ TOP SECTION ════════════════ */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            padding:"10px 14px 8px",
            borderBottom:"1px solid rgba(100,80,20,0.2)",
            position:"relative", zIndex:1,
          }}>

            {/* Left: Bank name + branch */}
            <div>
              <div style={{
                fontSize:20, fontWeight:900, color:"#1e3a5f",
                letterSpacing:2, fontFamily:"Arial Black, Arial, sans-serif",
              }}>
                {bankName}
              </div>
              <div style={{ fontSize:11, color:"#374151", marginTop:2, letterSpacing:0.5 }}>
                {branch}{ifsc ? ` | IFSC: ${ifsc}` : ""}
              </div>
            </div>

            {/* Right: Date with individual cells */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
              <div style={{ fontSize:10, color:"#6b7280", letterSpacing:1, marginBottom:2 }}>DATE</div>
              <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                {/* D D */}
                <DateCell val={dd[0]||""}/><DateCell val={dd[1]||""}/>
                <div style={{ width:8, textAlign:"center", fontSize:14, fontWeight:900, color:"#6b7280" }}>/</div>
                {/* M M */}
                <DateCell val={mm[0]||""}/><DateCell val={mm[1]||""}/>
                <div style={{ width:8, textAlign:"center", fontSize:14, fontWeight:900, color:"#6b7280" }}>/</div>
                {/* Y Y Y Y */}
                <DateCell val={yy1}/><DateCell val={yy2}/><DateCell val={yy3}/><DateCell val={yy4}/>
              </div>
              <div style={{ fontSize:10, color:"#6b7280", marginTop:3 }}>
                Cheque No: <span style={{ fontWeight:800, fontFamily:"monospace", color:"#1e3a5f" }}>{chequeNo}</span>
              </div>
            </div>
          </div>

          {/* ════════════════ PAY LINE ════════════════ */}
          <div style={{ padding:"10px 14px 0", position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:12, color:"#374151", flexShrink:0, fontStyle:"italic" }}>Pay</span>
              {/* Payee name on underline */}
              <div style={{
                flex:1, borderBottom:"1.5px solid #374151",
                paddingBottom:2,
                fontSize:17, fontWeight:700, color:"#0f172a",
                minHeight:24, letterSpacing:0.5,
              }}>
                {payee}
              </div>
              {/* A/C PAYEE stamp */}
              <div style={{
                border:"1.5px solid #374151", borderRadius:3,
                padding:"3px 8px", fontSize:10, fontWeight:800,
                color:"#1e3a5f", flexShrink:0, letterSpacing:1,
                background:"rgba(255,255,255,0.6)",
              }}>
                A/C PAYEE
              </div>
            </div>
          </div>

          {/* ════════════════ RUPEES LINE ════════════════ */}
          <div style={{ padding:"10px 14px 0", position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
              {/* Words */}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:12, color:"#374151", flexShrink:0, fontStyle:"italic" }}>Rupees</span>
                  <div style={{
                    flex:1, borderBottom:"1.5px solid #374151",
                    paddingBottom:2,
                    fontSize:15, fontWeight:600, color:"#0f172a",
                    minHeight:22,
                  }}>
                    {amtWords}
                  </div>
                </div>
              </div>

              {/* ₹ Amount box — right side like real cheque */}
              <div style={{
                minWidth:140, flexShrink:0,
                border:"1.5px solid #374151",
                display:"flex", flexDirection:"column",
                overflow:"hidden",
              }}>
                <div style={{
                  background:"rgba(30,58,95,0.08)", borderBottom:"1px solid #374151",
                  padding:"2px 8px", fontSize:10, fontWeight:700,
                  color:"#1e3a5f", textAlign:"right", letterSpacing:1,
                }}>
                  ₹ AMOUNT
                </div>
                <div style={{
                  padding:"6px 10px 8px",
                  fontSize:18, fontWeight:900, color:"#0f172a",
                  textAlign:"right", letterSpacing:1,
                  fontFamily:"Arial, sans-serif",
                }}>
                  ₹ {amtNum}
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════ A/C NO + SIGNATURE ════════════════ */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            padding:"14px 14px 10px",
            borderTop:"1px solid rgba(100,80,20,0.15)",
            marginTop:14,
            position:"relative", zIndex:1,
          }}>
            {/* A/C No */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:11, color:"#374151", fontStyle:"italic" }}>A/C No.</span>
              <div style={{
                borderBottom:"1.5px solid #374151",
                paddingBottom:2, minWidth:200,
                fontSize:14, fontWeight:800,
                letterSpacing:2, color:"#0f172a",
                fontFamily:"monospace",
              }}>
                {accountNo}
              </div>
            </div>

            {/* Payable at + Signature */}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:"#6b7280", marginBottom:24 }}>
                Payable at par at all branches
              </div>
              <div style={{
                borderTop:"1.5px solid #374151",
                paddingTop:4, minWidth:160,
                fontSize:11, color:"#374151", textAlign:"center",
              }}>
                For {shopName || "AK Fabrics"}
              </div>
              <div style={{ fontSize:9, color:"#9ca3af", textAlign:"center", marginTop:2 }}>
                Authorised Signatory
              </div>
            </div>
          </div>

          {/* ════════════════ MICR BAND ════════════════ */}
          <div style={{
            background:"linear-gradient(90deg, #f1f5f9, #e8ecf0, #f1f5f9)",
            borderTop:"1.5px solid #9ca3af",
            padding:"8px 14px",
            display:"flex", justifyContent:"space-between", alignItems:"center",
            fontFamily:"'Courier New', OCR-B, monospace",
            fontSize:15, letterSpacing:4,
            color:"#111",
            position:"relative", zIndex:1,
          }}>
            {/* Left: MICR code */}
            <span style={{ fontWeight:700 }}>⑆ {micrLeft} ⑆</span>
            {/* Center: Account number */}
            <span style={{ letterSpacing:5, fontSize:13 }}>
              {accountNo.split("").join(" ")}
            </span>
            {/* Right: Cheque number */}
            <span style={{ fontWeight:700 }}>⑆ {chequeNo} ⑆</span>
          </div>

        </div>{/* end cheque */}
      </div>

      <p className="no-print" style={{
        textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:10,
      }}>
      </p>
    </div>
  );
};

export default ChequePrint;
