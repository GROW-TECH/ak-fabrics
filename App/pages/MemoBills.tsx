import React, { useMemo, useState } from "react";
import { Plus, Printer, Save, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Line = { particulars: string; rate: number | string; qty: number | string; amount?: number | string };

const MemoBills: React.FC = () => {
  const [memos, setMemos] = useState<any[]>([]);
  const [billNo, setBillNo] = useState("M-01");
  const [date, setDate] = useState(today());
  const [party, setParty] = useState("ABC Tex");
  const [partyCity, setPartyCity] = useState("Salem");
  const [partyPhone, setPartyPhone] = useState("12345-67890");
  const [mode, setMode] = useState<"CASH" | "CREDIT">("CASH");
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { particulars: "", rate: "", qty: "", amount: "" },
    { particulars: "", rate: "", qty: "", amount: "" },
    { particulars: "", rate: "", qty: "", amount: "" },
  ]);
  const [footerNote, setFooterNote] = useState("Goods Once Sold will not be taken back");

  const total = useMemo(() => {
    return lines.reduce((sum, l) => {
      const r = Number(l.rate) || 0;
      const q = Number(l.qty) || 0;
      const explicit = l.amount !== undefined && l.amount !== "" ? Number(l.amount) || 0 : null;
      return sum + (explicit !== null ? explicit : r * q);
    }, 0);
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((p) => [...p, { particulars: "", rate: "", qty: "", amount: "" }]);
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));
  const [totalMessage, setTotalMessage] = useState("Thank You!");

  const fetchNextMemo = async () => {
    try {
      const res = await fetch(`${API}/api/memo-bills/next`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memo_no) setBillNo(data.memo_no);
      }
    } catch (err) {
      console.error("next memo error", err);
    }
  };

  const fetchMemos = async () => {
    try {
      const res = await fetch(`${API}/api/memo-bills`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMemos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("list memo error", err);
    }
  };

  React.useEffect(() => { fetchNextMemo(); fetchMemos(); }, []);

  const saveMemo = async () => {
    setSaving(true);
    try {
      const payload = {
        memo_no: billNo,
        bill_date: date,
        party,
        city: partyCity,
        phone: partyPhone,
        mode,
        footer_note: footerNote,
        total,
        lines,
      };
      const res = await fetch(`${API}/api/memo-bills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed to save memo");
        return;
      }
      const data = await res.json();
      if (data.memo_no) setBillNo(data.memo_no);
      // Prepare for next memo
      setLines([{ particulars: "", rate: "", qty: "", amount: "" }]);
      setTotalMessage("Thank You!");
      await fetchNextMemo();
      await fetchMemos();
      alert("Memo saved");
    } catch (err) {
      console.error("save memo error", err);
      alert("Failed to save memo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .memo-print {
            width: 96vw;
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Memo Bills</h1>
            <p className="text-slate-500 text-sm">GST-free memo / estimate bills.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveMemo}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Memo"}
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={addLine}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Line
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Saved Memo Bills</h2>
            <span className="text-xs text-slate-500">{memos.length} saved</span>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-5 bg-slate-50 text-xs font-semibold text-slate-700">
              <div className="px-3 py-2">Memo No</div>
              <div className="px-3 py-2">Date</div>
              <div className="px-3 py-2">Party</div>
              <div className="px-3 py-2 text-right">Total</div>
              <div className="px-3 py-2 text-center">Mode</div>
            </div>
            {memos.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500">No memos saved yet.</div>
            ) : (
              memos.map((m) => (
                <div key={m.id} className="grid grid-cols-5 text-sm border-t border-slate-100">
                  <div className="px-3 py-2 font-semibold">{m.memo_no}</div>
                  <div className="px-3 py-2">{m.bill_date || "-"}</div>
                  <div className="px-3 py-2 truncate">{m.party || "-"}</div>
                  <div className="px-3 py-2 text-right">{Number(m.total || 0).toFixed(2)}</div>
                  <div className="px-3 py-2 text-center uppercase text-xs">{m.mode || "-"}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 no-print">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Bill No
          <input value={billNo} onChange={(e) => setBillNo(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Party / M/s
          <input value={party} onChange={(e) => setParty(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Party City
          <input value={partyCity} onChange={(e) => setPartyCity(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Party Phone
          <input value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as "CASH" | "CREDIT")} className="px-3 py-2 rounded-lg border border-slate-300">
            <option value="CASH">Cash</option>
            <option value="CREDIT">Credit</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
          Footer Note
          <input value={footerNote} onChange={(e) => setFooterNote(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300" />
        </label>
      </div>

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm memo-print">
        <div className="flex items-start justify-between border-b border-slate-300 px-4 py-3">
          <div className="text-lg font-bold">No. {billNo}</div>
          <div className="text-xs text-center leading-tight">
            <div className="font-semibold">{mode} BILL</div>
          </div>
          <div className="text-sm">Date: {date}</div>
        </div>

        <div className="border-b border-slate-300 px-4 py-3">
          <div className="text-center font-semibold text-lg">A.K Fabrics</div>
          <div className="text-center text-sm">Kannan Textiles</div>
          <div className="text-center text-sm">Ammapet, Salem - 636003 (TN)</div>
          <div className="text-center text-sm">Cell : 9443095080</div>
        </div>

        <div className="border-b border-slate-300 px-4 py-2 text-sm">
          <div className="flex gap-2">
            <span className="w-10">To</span>
            <div className="flex-1 border-b border-slate-400 pb-0.5 font-semibold">{party}</div>
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <span className="w-10">M/s</span>
            <div className="flex-1 border-b border-slate-400 pb-0.5">{partyPhone ? `[Cell no : ${partyPhone}]` : ""}</div>
            <div className="font-bold text-base px-2">- {partyCity}</div>
          </div>
        </div>

        <div className="grid grid-cols-12 text-xs font-semibold text-slate-700 border-b border-slate-300 bg-slate-50">
          <div className="col-span-2 border-r border-slate-300 px-2 py-2">Rate</div>
          <div className="col-span-6 border-r border-slate-300 px-2 py-2">Particulars</div>
          <div className="col-span-2 border-r border-slate-300 px-2 py-2 text-center">Qty</div>
          <div className="col-span-2 px-2 py-2 text-center">Amount</div>
        </div>

        {lines.map((line, idx) => {
          const computedAmt = ((Number(line.rate) || 0) * (Number(line.qty) || 0)) || 0;
          const amt = line.amount !== undefined && line.amount !== "" ? Number(line.amount) || 0 : computedAmt;
          return (
            <div key={idx} className="grid grid-cols-12 border-b border-slate-200 text-sm">
              <div className="col-span-2 border-r border-slate-200">
                <input
                  value={line.rate}
                  onChange={(e) => updateLine(idx, { rate: e.target.value })}
                  className="w-full px-2 py-2 outline-none"
                  placeholder="0"
                />
              </div>
              <div className="col-span-6 border-r border-slate-200">
                <input
                  value={line.particulars}
                  onChange={(e) => updateLine(idx, { particulars: e.target.value })}
                  className="w-full px-2 py-2 outline-none"
                  placeholder="Particulars"
                />
              </div>
              <div className="col-span-2 border-r border-slate-200">
                <input
                  value={line.qty}
                  onChange={(e) => updateLine(idx, { qty: e.target.value })}
                  className="w-full px-2 py-2 text-center outline-none"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between px-2 py-2">
                <input
                  value={line.amount ?? ""}
                  onChange={(e) => updateLine(idx, { amount: e.target.value })}
                  className="w-full px-2 py-2 text-right outline-none"
                  placeholder={computedAmt ? computedAmt.toFixed(2) : "0"}
                />
                {lines.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500 no-print">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-12 text-sm font-semibold border-b border-slate-300">
          <div className="col-span-8 border-r border-slate-300 px-3 py-3">{totalMessage}</div>
          <div className="col-span-2 border-r border-slate-300 px-3 py-3 text-right">TOTAL</div>
          <div className="col-span-2 px-3 py-3 text-right text-lg">{total.toFixed(2)}</div>
        </div>

        <div className="flex justify-between text-sm border-b border-slate-300 px-3 py-3">
          <div className="flex-1 text-left">Receiver&apos;s Signature</div>
          <div className="flex-1 text-right">Signature</div>
        </div>

        <div className="text-center text-xs text-slate-600 px-3 py-2">{footerNote}</div>
      </div>
    </div>
  );
};

export default MemoBills;
