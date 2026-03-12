import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EnvelopePrint: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shopName } = useAuth();
  const [row, setRow] = useState<any>(null);

  const fetchRow = async () => {
    if (!id) return;
    const res = await fetch(`${API}/api/envelopes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setRow(await res.json());
  };

  useEffect(() => { fetchRow(); }, [id]);

  if (!row) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fromName  = (shopName || "AK FABRICS").toUpperCase();
  const fromSub   = "CLOTH MERCHANT";
  const fromAddr  = "34, No-1 PandariNadhar Street, Ammapet - 636003";
  const fromDist  = "SALEM DIST. TAMILNADU";
  const fromPh1   = "9443095080";
  const fromPh2   = "9262021600";
  const fromEmail = "ak.fabries.salem@gmail.com";

  const bars = [3,1,4,1,5,2,3,1,2,4,1,3,2,1,4,2,3,1,2,3,4,1,3,2,1,4,1,3,2,4,1,2,3,1,4,2,1,3];

  const PhoneIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#2e7d32">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
    </svg>
  );
  const MailIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#2e7d32">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", fontFamily: "Georgia, serif" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ps, .ps * { visibility: visible !important; }
          .ps {
            position: absolute; left: 0; top: 0;
            width: 100%; margin: 0; padding: 8mm;
            box-sizing: border-box;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print" style={{ display:"flex", justifyContent:"space-between", padding:"16px 0 20px" }}>
        <button onClick={() => navigate(-1)} style={{
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"8px 18px", border:"1px solid #d1d5db",
          background:"#fff", color:"#374151", borderRadius:8,
          fontSize:14, cursor:"pointer",
        }}>
          <ArrowLeft size={16}/> Back
        </button>
        <button onClick={() => window.print()} style={{
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"8px 18px", border:"1px solid #86efac",
          background:"#f0fdf4", color:"#15803d", borderRadius:8,
          fontSize:14, cursor:"pointer",
        }}>
          <Printer size={16}/> Print
        </button>
      </div>

      {/* ══════════════════════════════════════════
          ENVELOPE — Sumangali exact layout
          ══════════════════════════════════════════ */}
      <div className="ps">
        <div style={{
          display: "flex",
          width: "100%",
          minHeight: 320,
          border: "2.5px solid #2e7d32",
          borderRadius: 10,
          overflow: "hidden",
          fontFamily: "Georgia, serif",
          position: "relative",
          background: "#fff",
        }}>

          {/* ── Watercolor background ── */}
          <div style={{
            position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
            background:`
              radial-gradient(ellipse at 10% 90%, rgba(134,198,124,0.28) 0%, transparent 50%),
              radial-gradient(ellipse at 85% 10%, rgba(160,220,160,0.20) 0%, transparent 45%),
              radial-gradient(ellipse at 55% 55%, rgba(200,235,200,0.15) 0%, transparent 55%),
              radial-gradient(ellipse at 95% 85%, rgba(130,200,130,0.18) 0%, transparent 40%)
            `,
          }}/>

          {/* ── Watermark logo ── */}
          <img src="/AK Logo.jpg" alt="" style={{
            position:"absolute", top:"50%", left:"38%",
            transform:"translate(-50%,-50%)",
            width:200, height:200, objectFit:"contain",
            opacity:0.05, pointerEvents:"none", zIndex:0,
          }} onError={e=>(e.target as HTMLImageElement).style.display="none"}/>

          {/* ══════════════════════════
              LEFT COLUMN — Logo panel
              (like Sumangali left badge strip)
              ══════════════════════════ */}
          <div style={{
            width: 130,
            flexShrink: 0,
            borderRight: "2px solid #2e7d32",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "20px 12px",
            background: "rgba(232,245,233,0.55)",
            position: "relative",
            zIndex: 1,
          }}>
            {/* Logo circle */}
            <div style={{
              width: 80, height: 80,
              borderRadius: "50%",
              border: "2.5px solid #2e7d32",
              overflow: "hidden",
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(46,125,50,0.15)",
            }}>
              <img src="/AK Logo.jpg" alt="AK"
                style={{ width:"100%", height:"100%", objectFit:"contain" }}
                onError={e=>{
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  if (el.parentElement)
                    el.parentElement.innerHTML = `<span style="font-size:24px;font-weight:900;color:#1b5e20">AK</span>`;
                }}/>
            </div>

            {/* Shop name vertical — like Sumangali Tamil text on left */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#1b5e20",
              textAlign: "center", letterSpacing: 1, lineHeight: 1.4,
            }}>
              AK<br/>FABRICS
            </div>

            <div style={{
              fontSize: 9, color: "#4b7c4b", textAlign: "center",
              borderTop: "1px solid #86efac", paddingTop: 6, marginTop: 2,
              letterSpacing: 1,
            }}>
              SALEM
            </div>

            {/* Sunflower-like decorative circle at bottom */}
            <div style={{
              position: "absolute", bottom: -30, left: -30,
              width: 100, height: 100, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(180,220,80,0.20), transparent 70%)",
              pointerEvents: "none",
            }}/>
          </div>

          {/* ══════════════════════════
              RIGHT SIDE — Main content
              ══════════════════════════ */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", zIndex:1 }}>

            {/* ── TOP: Shop name (center) + Barcode (right) ── */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "18px 20px 12px 20px",
              borderBottom: "1.5px solid rgba(46,125,50,0.25)",
            }}>

              {/* Shop name block — CENTER like SUMANGALI big red */}
              <div>
                <div style={{
                  fontSize: 40, fontWeight: 900,
                  color: "#1b5e20",
                  letterSpacing: 5, lineHeight: 1,
                  fontFamily: "Georgia, serif",
                  textShadow: "1px 2px 0 rgba(0,0,0,0.07)",
                }}>
                  {fromName}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "#2e7d32",
                  letterSpacing: 5, marginTop: 4,
                }}>
                  {fromSub}
                </div>
                <div style={{ fontSize: 11.5, color: "#374151", marginTop: 6, lineHeight: 1.7 }}>
                  {fromAddr}<br/>
                  <span style={{ fontWeight: 700, color: "#1b5e20" }}>{fromDist}</span>
                </div>
              </div>

              {/* Barcode — top right exactly like Sumangali */}
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 16,
              }}>
                {/* Barcode bars */}
                <div style={{ display:"flex", alignItems:"flex-end", gap:1 }}>
                  {bars.map((w, i) =>
                    i % 2 === 0 ? (
                      <div key={i} style={{
                        width: w * 2,
                        height: 34 + (i % 5) * 3,
                        background: "#111",
                        borderRadius: 0.5,
                        flexShrink: 0,
                      }}/>
                    ) : (
                      <div key={i} style={{ width: w * 1.5, flexShrink: 0 }}/>
                    )
                  )}
                </div>
                {/* Tracking no */}
                <div style={{
                  border: "2px solid #2e7d32", borderRadius: 5,
                  padding: "3px 14px", background: "#ecfdf5",
                  fontFamily: "ui-monospace, Consolas, monospace",
                  fontSize: 13, fontWeight: 900, color: "#065f46",
                  letterSpacing: 2, minWidth: 140, textAlign: "center",
                }}>
                  {row.tracking_no || "—"}
                </div>
              </div>
            </div>

            {/* ── BOTTOM: Phone/email (left) + TO address (right) ── */}
            <div style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1.7fr",
              padding: "16px 20px 18px 20px",
              gap: 20,
            }}>

              {/* Phone + email — bottom left like Sumangali */}
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:9 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                  <PhoneIcon/><span style={{ fontWeight:700, letterSpacing:1 }}>{fromPh1}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                  <PhoneIcon/><span style={{ fontWeight:700, letterSpacing:1 }}>{fromPh2}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                  <MailIcon/><span style={{ color:"#4b5563" }}>{fromEmail}</span>
                </div>
              </div>

              {/* TO address — right side, Sumangali style */}
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                {/* TO label */}
                <div style={{
                  fontSize: 11, fontWeight: 900, color: "#6b7280",
                  letterSpacing: 4, marginBottom: 6,
                }}>
                  TO
                </div>

                {/* Recipient name — BIG CAPS like "KANNAN TEXTILES" */}
                <div style={{
                  fontSize: 26, fontWeight: 900,
                  color: "#0f172a", textTransform: "uppercase",
                  lineHeight: 1.15, letterSpacing: 1,
                  fontFamily: "Georgia, serif",
                }}>
                  {row.to_name}
                </div>

                {/* Address lines */}
                <div style={{
                  marginTop: 8, fontSize: 13, color: "#1e293b",
                  lineHeight: 1.85, fontWeight: 500, textTransform: "uppercase",
                }}>
                  {row.to_address1 && <div>{row.to_address1}</div>}
                  {row.to_address2 && <div>{row.to_address2}</div>}
                  {row.to_city && (
                    <div style={{ fontWeight: 700, color: "#1b5e20" }}>
                      {row.to_city}
                    </div>
                  )}
                </div>

                {/* PH + PIN */}
                <div style={{ display:"flex", gap:24, marginTop:10, flexWrap:"wrap" }}>
                  {row.to_pincode && (
                    <div style={{ fontSize:14, fontWeight:900, color:"#111" }}>
                      PIN-<span style={{ fontFamily:"ui-monospace,monospace", letterSpacing:2 }}>{row.to_pincode}</span>
                    </div>
                  )}
                  {row.to_phone && (
                    <div style={{ fontSize:14, fontWeight:900, color:"#111" }}>
                      PH-<span style={{ letterSpacing:1 }}>{row.to_phone}</span>
                    </div>
                  )}
                </div>

                {row.notes && (
                  <div style={{ marginTop:8, fontSize:11, color:"#6b7280", fontStyle:"italic" }}>
                    {row.notes}
                  </div>
                )}
              </div>
            </div>

          </div>{/* end right side */}
        </div>{/* end card */}
      </div>

      <p className="no-print" style={{
        textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:10,
      }}>
        Tip: Print → Landscape → A4 → "Fit to page"
      </p>
    </div>
  );
};

export default EnvelopePrint;