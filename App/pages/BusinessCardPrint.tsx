import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Share2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const placeholderLogo = "https://dummyimage.com/120x120/94a3b8/ffffff.png&text=Logo";
const logoSrc = (val: string) => {
  if (!val) return placeholderLogo;
  if (val.startsWith("http") || val.startsWith("data:")) return val;
  return `${API}${val}`;
};

const BusinessCardPrint: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<any>(null);

  const fetchRow = async () => {
    if (!id) return;
    const res = await fetch(`${API}/api/business-cards/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setRow(await res.json());
  };

  useEffect(() => { fetchRow(); }, [id]);

  if (!row) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "12px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ps, .ps * { visibility: visible !important; }
          .ps { position: absolute; left: 0; top: 0; width: 100%; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 text-sm font-semibold flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Print / Share
        </button>
      </div>

      <div className="ps bg-sky-50 border border-sky-100 rounded-2xl shadow-md overflow-hidden">
        <div className="flex items-start justify-between px-4 pt-4">
          <div className="flex items-center gap-2 text-slate-700 text-sm">
            <img src={logoSrc(row.logo_url)} alt="logo" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
            <span className="font-semibold">{row.business_name}</span>
          </div>
          <div className="text-xs text-slate-700 font-semibold">{row.phone || ""}</div>
        </div>

        <div className="flex flex-col items-center text-center px-6 py-6 gap-1">
          <div className="text-lg font-bold text-slate-900">{row.contact_name || row.business_name}</div>
          <div className="text-sm text-slate-700">{row.description || ""}</div>
          <div className="text-sm text-slate-700">{row.address || ""}</div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Share2 className="w-4 h-4" />
            <span>{row.email || ""}</span>
          </div>
        </div>

        <div className="flex">
          <button className="flex-1 py-3 text-center text-sky-600 font-semibold text-sm bg-white border-t border-r border-sky-100">EDIT</button>
          <button className="flex-1 py-3 text-center text-white font-semibold text-sm bg-sky-500">SHARE</button>
        </div>
      </div>
    </div>
  );
};

export default BusinessCardPrint;
