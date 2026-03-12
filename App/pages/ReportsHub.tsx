import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilePieChart, BarChart, ShoppingBag, Package, Wallet, Banknote, Percent } from "lucide-react";

type Range = "today" | "week" | "month" | "custom";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ranges: { label: string; value: Range }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom", value: "custom" },
];

const cardCls =
  "bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2 hover:shadow transition";

const formatINR = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const ReportsHub: React.FC = () => {
  const [range, setRange] = useState<Range>("month");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pl, setPl] = useState<any>(null);
  const [sales, setSales] = useState<any>(null);
  const [purchases, setPurchases] = useState<any>(null);
  const [cash, setCash] = useState<any>(null);
  const [bank, setBank] = useState<any>(null);
  const [stock, setStock] = useState<any>(null);

  const params = () => {
    const p = new URLSearchParams();
    if (range !== "custom") p.set("range", range);
    if (range === "custom") {
      if (start) p.set("start_date", start);
      if (end) p.set("end_date", end);
    }
    return p.toString();
  };

  const fetchAll = async () => {
    const qs = params();
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    const getJson = (path: string) =>
      fetch(`${API}${path}?${qs}`, { headers }).then((r) => r.json()).catch(() => null);
    setPl(await getJson("/api/dashboard/profit-loss"));
    setSales(await getJson("/api/reports/sales"));
    setPurchases(await getJson("/api/reports/purchases"));
    setCash(await getJson("/api/reports/cash-in-hand"));
    setBank(await getJson("/api/reports/bank-ledger"));
    setStock(await getJson("/api/reports/stock"));
  };

  useEffect(() => {
    fetchAll();
  }, [range, start, end]);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Overall Reports</h1>
          <p className="text-slate-500 text-sm">Quick summaries with date filters. Click tiles for detailed views.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <FilePieChart className="w-4 h-4 text-indigo-500" /> Profit &amp; Loss
          </div>
          <div className="text-lg font-bold text-slate-900">{pl ? formatINR(pl.net_profit) : "…"}</div>
          <div className="text-xs text-slate-500">Net after product cost & POE</div>
        </Link>

        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <BarChart className="w-4 h-4 text-indigo-500" /> Sales
          </div>
          <div className="text-lg font-bold text-slate-900">{sales ? formatINR(sales.total_amount) : "…"}</div>
          <div className="text-xs text-slate-500">{sales ? `${sales.count} invoices` : ""}</div>
        </Link>

        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <ShoppingBag className="w-4 h-4 text-rose-500" /> Purchases
          </div>
          <div className="text-lg font-bold text-slate-900">{purchases ? formatINR(purchases.total_amount) : "…"}</div>
          <div className="text-xs text-slate-500">POE: {purchases ? formatINR(purchases.total_poe) : "…"}</div>
        </Link>

        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <Package className="w-4 h-4 text-emerald-600" /> Stock
          </div>
          <div className="text-lg font-bold text-slate-900">
            {stock ? formatINR(stock?.totals?.stock_value || 0) : "…"}
          </div>
          <div className="text-xs text-slate-500">
            Closing qty: {stock ? (stock?.totals?.closing_qty || 0) : "…"}
          </div>
        </Link>

        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <Wallet className="w-4 h-4 text-amber-500" /> Cash in Hand
          </div>
          <div className="text-lg font-bold text-slate-900">{cash ? formatINR(cash.closing) : "…"}</div>
          <div className="text-xs text-slate-500">In: {cash ? formatINR(cash.total_in) : "…"} | Out: {cash ? formatINR(cash.total_out) : "…"}</div>
        </Link>

        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <Banknote className="w-4 h-4 text-indigo-600" /> Bank Ledger
          </div>
          <div className="text-lg font-bold text-slate-900">{bank ? `${bank.rows?.length || 0} accounts` : "…"}</div>
          <div className="text-xs text-slate-500">
            {bank && bank.rows?.length
              ? `In: ${formatINR(
                  bank.rows.reduce((s: number, r: any) => s + Number(r.total_in || 0), 0)
                )} | Out: ${formatINR(
                  bank.rows.reduce((s: number, r: any) => s + Number(r.total_out || 0), 0)
                )}`
              : "Totals in/out per bank"}
          </div>
        </Link>

        <Link to="/report-profit" className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <Percent className="w-4 h-4 text-green-600" /> Product Profit
          </div>
          <div className="text-lg font-bold text-slate-900">{pl ? formatINR(pl.gross_profit) : "…"}</div>
          <div className="text-xs text-slate-500">Profit by item</div>
        </Link>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
        Detailed drill-down pages can be added; tiles currently link to P&L as a placeholder.
      </div>
    </div>
  );
};

export default ReportsHub;
