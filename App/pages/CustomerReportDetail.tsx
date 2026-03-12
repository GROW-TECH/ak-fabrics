import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type Range = "today" | "week" | "month" | "custom";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const formatINR = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const CustomerReportDetail: React.FC = () => {
  const { id } = useParams();
  const [search] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const range = (search.get("range") as Range) || "month";
  const start = search.get("start_date") || "";
  const end = search.get("end_date") || "";

  const qs = () => {
    const p = new URLSearchParams();
    p.set("range", range);
    if (start) p.set("start_date", start);
    if (end) p.set("end_date", end);
    return p.toString();
  };

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/reports/customers/${id}?${qs()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, [id, range, start, end]);

  const summary = data?.summary || {};
  const rows = data?.transactions || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{summary.name || "Customer"}</h1>
        <p className="text-slate-500 text-sm">Sales and payments for the selected range.</p>
        {error && <p className="text-rose-500 text-xs mt-1 font-semibold">{error}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Sales</p>
          <h2 className="text-lg font-black text-slate-900">{formatINR(summary.total_sales || 0)}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Invoices</p>
          <h2 className="text-lg font-black text-slate-900">{summary.invoice_count || 0}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Paid</p>
          <h2 className="text-lg font-black text-slate-900">{formatINR(summary.paid_amount || 0)}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Outstanding</p>
          <h2 className="text-lg font-black text-amber-700">{formatINR(summary.balance_amount || 0)}</h2>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-4 py-2">
          <div>Invoice</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Balance</div>
          <div className="text-right">Date</div>
        </div>
        {rows.map((r: any) => (
          <div key={r.id} className="grid grid-cols-5 px-4 py-3 border-t border-slate-100 text-sm">
            <div className="font-semibold text-slate-800">{r.invoice_no}</div>
            <div className="text-right">{formatINR(r.total_amount)}</div>
            <div className="text-right">{formatINR(r.paid_amount)}</div>
            <div className="text-right text-amber-700">{formatINR(r.balance_amount)}</div>
            <div className="text-right text-slate-500 text-xs">{r.created_at?.slice(0, 10) || "-"}</div>
          </div>
        ))}
        {!rows.length && <div className="p-4 text-sm text-slate-500">No transactions in this range.</div>}
      </div>
    </div>
  );
};

export default CustomerReportDetail;
