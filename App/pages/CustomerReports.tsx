import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Range = "today" | "week" | "month" | "custom";
const ranges: { label: string; value: Range }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom", value: "custom" },
];

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const formatINR = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const CustomerReports: React.FC = () => {
  const [range, setRange] = useState<Range>("month");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const params = () => {
    const p = new URLSearchParams();
    if (range !== "custom") p.set("range", range);
    if (range === "custom") {
      if (start) p.set("start_date", start);
      if (end) p.set("end_date", end);
    }
    return p.toString();
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/reports/customers?${params()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range, start, end]);

  const rows = data?.rows || [];
  const totals = data?.totals || { total_sales: 0, total_outstanding: 0 };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer-wise Reports</h1>
          <p className="text-slate-500 text-sm">Sales, payments, balances by customer.</p>
          {error && <p className="text-rose-500 text-xs mt-1 font-semibold">{error}</p>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 mr-2">Date range:</span>
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
              range === r.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200"
            }`}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <label className="flex items-center gap-1">
              From
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="flex items-center gap-1">
              To
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs" />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Total Sales</p>
          <h2 className="text-xl font-black text-slate-900">{formatINR(totals.total_sales)}</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Outstanding</p>
          <h2 className="text-xl font-black text-slate-900">{formatINR(totals.total_outstanding)}</h2>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-4 py-2">
          <div>Customer</div>
          <div className="text-right">Sales</div>
          <div className="text-right">Invoices</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Outstanding</div>
          <div className="text-right">Last Txn</div>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading…</div>
        ) : (
          rows.map((r: any) => (
            <button
              key={r.id}
              onClick={() => navigate(`/reports/customers/${r.id}?range=${range}${start ? `&start_date=${start}` : ""}${end ? `&end_date=${end}` : ""}`)}
              className="w-full text-left px-4 py-3 border-t border-slate-100 hover:bg-slate-50 transition grid grid-cols-6 items-center text-sm"
            >
              <div className="font-semibold text-slate-800">{r.name}</div>
              <div className="text-right">{formatINR(r.total_sales)}</div>
              <div className="text-right">{r.invoice_count}</div>
              <div className="text-right">{formatINR(r.paid_amount)}</div>
              <div className="text-right text-amber-700">{formatINR(r.balance_amount)}</div>
              <div className="text-right text-slate-500 text-xs">{r.last_txn?.slice(0, 10) || "-"}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerReports;
