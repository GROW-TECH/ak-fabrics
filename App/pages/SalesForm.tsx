import React, { useState, useMemo } from "react";
import { Account, Product } from "../types";
import { Plus, Trash2, FileText, Package, ChevronDown, Image as ImageIcon } from "lucide-react";

interface SalesFormProps {
  accounts: Account[];
  products: Product[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

interface SalesItem {
  productId: string;
  hsn: string;
  size: string;
  description: string;
  rate: number;
  qty: number;
  discount: number;
  total: number;
}

const SalesForm: React.FC<SalesFormProps> = ({
  accounts,
  products,
  onSubmit,
  initialData,
}) => {
  const saleId = useMemo(() => `SAL-${Date.now()}`, []);

  const [customerId, setCustomerId]   = useState(initialData?.customer_id   || "");
  const [paymentMode, setPaymentMode] = useState(initialData?.payment_mode  || "CREDIT");
  const [paidAmount, setPaidAmount]   = useState<number>(Number(initialData?.paid_amount) || 0);
  const [through, setThrough]         = useState(initialData?.through_agent  || "");
  const [notes, setNotes]             = useState(initialData?.notes           || "");

  const [items, setItems] = useState<SalesItem[]>(
    initialData?.items?.map((item: any) => ({
      productId:   item.product_id   || "",
      hsn:         item.hsn          || "",
      size:        item.size         || "",
      description: item.description  || "",
      rate:        Number(item.rate)     || 0,   // ✅ coerce string→number
      qty:         Number(item.quantity) || 1,   // ✅ coerce string→number
      discount:    Number(item.discount) || 0,   // ✅ coerce string→number
      total:       Number(item.total)    || 0,   // ✅ coerce string→number (fixes toFixed crash)
    })) || [
      { productId: "", hsn: "", size: "", description: "", rate: 0, qty: 1, discount: 0, total: 0 },
    ]
  );

  const customer = accounts.find((a) => a.id === customerId);

  // ── calc helpers ──────────────────────────────────────────────────────────
  const calcTotal = (rate: number, qty: number, discount: number) => {
    const sub = rate * qty;
    return sub - (sub * discount) / 100;
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updated = [...items];
    updated[index].productId   = productId;
    updated[index].hsn         = product?.hsnCode || "";
    updated[index].description = product?.name   || "";
    updated[index].rate        = product?.price  || 0;
    updated[index].total       = calcTotal(updated[index].rate, updated[index].qty, updated[index].discount);
    setItems(updated);
  };

  const handleItemField = (index: number, field: keyof SalesItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].total = calcTotal(updated[index].rate, updated[index].qty, updated[index].discount);
    setItems(updated);
  };

  const addItem = () =>
    setItems([...items, { productId: "", hsn: "", size: "", description: "", rate: 0, qty: 1, discount: 0, total: 0 }]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // ── totals ────────────────────────────────────────────────────────────────
  const grandTotal     = items.reduce((s, i) => s + i.total, 0);
  const totalDiscount  = items.reduce((s, i) => s + (i.rate * i.qty * i.discount) / 100, 0);
  const balanceAmount  = Math.max(0, grandTotal - paidAmount);

  const deriveStatus = () => {
    if (paidAmount <= 0)             return "NOT_PAID";
    if (paidAmount >= grandTotal)    return "PAID";
    return "HALF_PAID";
  };

  const handleSubmit = () => {
    if (!customerId)                        return alert("Please select a customer");
    if (items.some((i) => !i.productId))    return alert("Please select a product for all rows");

    onSubmit({
      customerId,
      items,
      grandTotal,
      paidAmount,
      balanceAmount,
      status: deriveStatus(),
      paymentMode,
      through,
      notes,
      date: new Date().toISOString(),
    });
  };

  // ── style helpers ─────────────────────────────────────────────────────────
  const inp  = "w-full border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition";
  const lbl  = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";
  const card = "bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden";

  const statusBadge = {
    PAID:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    NOT_PAID:  "bg-red-50 text-red-700 border-red-200",
    HALF_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  }[deriveStatus()];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)" }} />
        <div className="px-6 py-4 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg,#f8faff,#f1f5ff)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">New Sales Invoice</h2>
              <p className="text-xs text-slate-500">ID: {saleId}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusBadge}`}>
            {deriveStatus().replace("_", " ")}
          </span>
        </div>
      </div>

      {/* ── Invoice Image Display (if uploaded) ─────────────────────────── */}
      {initialData?.imageUrl && (
        <div className={card}>
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-700">Uploaded Invoice Image</h3>
            </div>
            <div className="flex justify-center">
              <img 
                src={initialData.imageUrl} 
                alt="Invoice" 
                className="max-w-full h-48 object-contain rounded-lg border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Customer + Payment ──────────────────────────────────────────── */}
      <div className={card}>
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Details</p>
        </div>
        <div className="p-6 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer select */}
            <div className="md:col-span-2">
              <label className={lbl}>Customer <span className="text-red-400">*</span></label>
              <div className="relative">
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inp + " pr-8 appearance-none"}>
                  <option value="">— Select Customer —</option>
                  {accounts.filter((a) => a.type === "CUSTOMER").map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Payment mode */}
            <div>
              <label className={lbl}>Payment Mode</label>
              <div className="relative">
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inp + " pr-8 appearance-none"}>
                  <option value="CREDIT">Credit</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Customer info card */}
          {customer && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              {[
                { label: "Phone",   value: customer.phone   || "—" },
                { label: "GST No",  value: customer.gstin   || "—" },
                { label: "Address", value: customer.address || "—" },
                { label: "Balance", value: `₹${(customer.balance || 0).toLocaleString()}`, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label}>
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">{label}</p>
                  <p className={`text-sm mt-0.5 ${bold ? "font-bold text-indigo-600" : "text-slate-700 font-medium"}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Through + Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Through (Agent / Broker)</label>
              <input value={through} onChange={(e) => setThrough(e.target.value)}
                placeholder="Agent name (optional)" className={inp} />
            </div>
            <div>
              <label className={lbl}>Notes / Remarks</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes..." className={inp} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items</p>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
              {items.length} row{items.length > 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <div className="p-4 space-y-3">

          {/* Column headers (desktop) */}
          <div className="hidden md:grid gap-2 px-3 py-2 rounded-lg bg-slate-50"
            style={{ gridTemplateColumns: "2.5fr 0.8fr 0.8fr 2fr 1fr 0.8fr 0.8fr 1fr 36px" }}>
            {["Product","HSN","Size","Description","Rate ₹","Qty","Disc %","Total ₹",""].map((h, i) => (
              <div key={i} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          {/* Item rows */}
          {items.map((item, index) => (
            <div key={index}
              className="grid gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition items-center"
              style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>

              {/* Row 1: Product (full width on mobile, 2.5fr on desktop) */}
              <div className="col-span-4 md:col-span-1"
                style={{ gridColumn: "1 / -1" }}>
                {/* We'll use a different layout approach below */}
              </div>

              {/* ── Full responsive layout ── */}
              <div className="col-span-4 grid grid-cols-2 md:grid-cols-9 gap-2 items-center"
                style={{ gridColumn: "1 / -1" }}>

                {/* Product */}
                <div className="col-span-2 md:col-span-3">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Product</label>
                  <select value={item.productId} onChange={(e) => handleProductChange(index, e.target.value)} className={inp}>
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* HSN */}
                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">HSN</label>
                  <input value={item.hsn} onChange={(e) => handleItemField(index, "hsn", e.target.value)}
                    placeholder="HSN" className={inp} />
                </div>

                {/* Size */}
                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Size</label>
                  <input value={item.size} onChange={(e) => handleItemField(index, "size", e.target.value)}
                    placeholder="Size" className={inp} />
                </div>

                {/* Description */}
                <div className="col-span-2 md:col-span-2">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Description</label>
                  <input value={item.description} onChange={(e) => handleItemField(index, "description", e.target.value)}
                    placeholder="Description" className={inp} />
                </div>

                {/* Rate */}
                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Rate</label>
                  <input type="number" min={0} value={item.rate}
                    onChange={(e) => handleItemField(index, "rate", Number(e.target.value))}
                    placeholder="0" className={inp} />
                </div>

                {/* Qty */}
                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Qty</label>
                  <input type="number" min={1} value={item.qty}
                    onChange={(e) => handleItemField(index, "qty", Number(e.target.value))}
                    className={inp} />
                </div>

                {/* Discount */}
                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Disc %</label>
                  <input type="number" min={0} max={100} value={item.discount}
                    onChange={(e) => handleItemField(index, "discount", Number(e.target.value))}
                    placeholder="0" className={inp} />
                </div>

                {/* Total + Delete */}
                <div className="col-span-1 flex items-center gap-1">
                  <input value={`₹${item.total.toFixed(2)}`} readOnly
                    className="w-full border border-slate-100 bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold text-indigo-700" />
                  <button onClick={() => removeItem(index)} disabled={items.length === 1}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-20 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment + Summary ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Paid Amount */}
        <div className={card}>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Details</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className={lbl}>Amount Paid Now ₹</label>
              <input type="number" min={0} max={grandTotal} value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                placeholder="0" className={inp} />
              <p className="text-xs text-slate-400 mt-1">Leave 0 for full credit sale</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, Math.round(grandTotal / 2), grandTotal].map((v, i) => (
                <button key={i} onClick={() => setPaidAmount(v)}
                  className="py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition text-slate-600">
                  {i === 0 ? "₹0 (Credit)" : i === 1 ? "Half" : "Full Paid"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className={card}>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bill Summary</p>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>₹{(grandTotal + totalDiscount).toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>− ₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-3">
              <span>Grand Total</span>
              <span className="text-indigo-600 text-lg">₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Paid Now</span>
              <span>₹{paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-red-500 border-t border-slate-100 pt-2">
              <span>Balance Due</span>
              <span>₹{balanceAmount.toFixed(2)}</span>
            </div>

            {/* Status pill */}
            <div className={`text-center py-1.5 rounded-lg text-xs font-bold border mt-2 ${statusBadge}`}>
              {deriveStatus().replace("_", " ")}
            </div>
          </div>
        </div>

      </div>

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => window.history.back()}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
          Cancel
        </button>
        <button onClick={handleSubmit}
          className="px-8 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-lg shadow-indigo-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          Save Sale
        </button>
      </div>

    </div>
  );
};

export default SalesForm;