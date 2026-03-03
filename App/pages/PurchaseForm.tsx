import React, { useState, useMemo, useEffect } from "react";
import { Account, Product } from "../types";
import { Plus, Trash2, FileText, Package, ChevronDown, CreditCard } from "lucide-react";

interface PurchaseFormProps {
  accounts: Account[];
  products: Product[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

interface PurchaseItem {
  productId: string;
  hsn: string;
  size: string;
  description: string;
  rate: number;
  qty: number;
  discount: number;
  total: number;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  accounts,
  products,
  onSubmit,
  initialData,
}) => {
  const isEdit = Boolean(initialData?.id);
  const purchaseId = useMemo(
    () => initialData?.invoice_no || `PUR-${Date.now()}`,
    [initialData]
  );

  // ── form state ──────────────────────────────────────────────
  const [vendorId,     setVendorId]     = useState(initialData?.vendor_id     || "");
  const [paymentMode,  setPaymentMode]  = useState(initialData?.payment_mode  || "CREDIT");
  const [paidAmount,   setPaidAmount]   = useState<number>(Number(initialData?.paid_amount)  || 0);
  const [through,      setThrough]      = useState(initialData?.through_agent || "");
  const [notes,        setNotes]        = useState(initialData?.notes         || "");

  const blankItem = (): PurchaseItem => ({
    productId: "", hsn: "", size: "", description: "", rate: 0, qty: 1, discount: 0, total: 0,
  });

  const mapItems = (rawItems: any[]): PurchaseItem[] =>
    rawItems.map((item: any) => ({
      productId:   item.product_id   || item.productId   || "",
      hsn:         item.hsn          || "",
      size:        item.size         || "",
      description: item.description  || "",
      rate:        Number(item.rate)             || 0,
      qty:         Number(item.quantity ?? item.qty) || 1,
      discount:    Number(item.discount)         || 0,
      total:       Number(item.total)            || 0,
    }));

  const [items, setItems] = useState<PurchaseItem[]>(
    initialData?.items?.length ? mapItems(initialData.items) : [blankItem()]
  );

  // Re-populate when initialData arrives (modal open with existing record)
  useEffect(() => {
    if (!initialData) return;
    setVendorId(initialData.vendor_id     || "");
    setPaymentMode(initialData.payment_mode  || "CREDIT");
    setPaidAmount(Number(initialData.paid_amount)  || 0);
    setThrough(initialData.through_agent || "");
    setNotes(initialData.notes           || "");
    setItems(
      initialData.items?.length ? mapItems(initialData.items) : [blankItem()]
    );
  }, [initialData]);

  const vendor = accounts.find((a) => a.id === vendorId);

  // ── calc helpers ─────────────────────────────────────────────
  const calcTotal = (rate: number, qty: number, discount: number) => {
    const sub = rate * qty;
    return sub - (sub * discount) / 100;
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updated = [...items];
    updated[index].productId   = productId;
    updated[index].hsn         = product?.hsnCode    || "";
    updated[index].description = product?.name       || "";
    updated[index].rate        = Number(product?.price) || 0;
    updated[index].total       = calcTotal(updated[index].rate, updated[index].qty, updated[index].discount);
    setItems(updated);
  };

  const handleItemField = (index: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].total = calcTotal(updated[index].rate, updated[index].qty, updated[index].discount);
    setItems(updated);
  };

  const addItem    = () => setItems([...items, blankItem()]);
  const removeItem = (i: number) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  // ── totals ───────────────────────────────────────────────────
  const grandTotal    = items.reduce((s, i) => s + i.total, 0);
  const totalDiscount = items.reduce((s, i) => s + (i.rate * i.qty * i.discount) / 100, 0);
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  const deriveStatus = (): "NOT_PAID" | "HALF_PAID" | "PAID" => {
    if (paidAmount <= 0)          return "NOT_PAID";
    if (paidAmount >= grandTotal) return "PAID";
    return "HALF_PAID";
  };

  // ── submit ───────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!vendorId) { alert("Please select a vendor"); return; }

    onSubmit({
      vendor_id:     vendorId,
      payment_mode:  paymentMode,
      paid_amount:   paidAmount,
      through_agent: through  || null,
      notes:         notes    || null,
      total_amount:  grandTotal,
      items: items.map(item => ({
        productId:   item.productId,
        hsn:         item.hsn,
        size:        item.size,
        description: item.description,
        rate:        item.rate,
        qty:         item.qty,
        discount:    item.discount,
        total:       item.total,
      })),
    });
  };

  // ── status badge ─────────────────────────────────────────────
  const statusBadge = {
    NOT_PAID:  "bg-red-100 text-red-600 border-red-200",
    PAID:      "bg-emerald-100 text-emerald-600 border-emerald-200",
    HALF_PAID: "bg-yellow-100 text-yellow-600 border-yellow-200",
  };

  const status = deriveStatus();

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* ── Page header ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)" }} />
        <div className="px-6 py-4 flex justify-between items-center"
          style={{ background: "linear-gradient(135deg,#f8faff,#f1f5ff)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-none">
                {isEdit ? "Edit Purchase Invoice" : "New Purchase Invoice"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">ID: {purchaseId}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusBadge[status]}`}>
            {status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* ── Vendor + Payment ─────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Details</p>
        </div>
        <div className="p-6 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vendor */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Vendor <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition pr-8 appearance-none"
                >
                  <option value="">— Select Vendor —</option>
                  {accounts
                    .filter((a) => a.type === "VENDOR")
                    .map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Payment mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
              <div className="relative">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition pr-8 appearance-none"
                >
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

          {/* Vendor info card */}
          {vendor && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              {[
                { label: "Phone",   value: vendor.phone   || "—" },
                { label: "GST No",  value: vendor.gstin   || "—" },
                { label: "Address", value: vendor.address || "—" },
                { label: "Balance", value: `₹${(vendor.balance || 0).toLocaleString()}`, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label}>
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                  <p className={`text-sm mt-0.5 ${bold ? "font-bold text-indigo-600" : "text-slate-700 font-medium"}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Through + Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Through (Agent / Broker)
              </label>
              <input
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                placeholder="Agent name (optional)"
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Notes / Remarks
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes..."
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Items ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
            {["Product", "HSN", "Size", "Description", "Rate ₹", "Qty", "Disc %", "Total ₹", ""].map((h, i) => (
              <div key={i} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          {items.map((item, index) => (
            <div key={index}
              className="p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition">
              <div className="grid grid-cols-2 md:grid-cols-9 gap-2 items-center"
                style={{ gridTemplateColumns: "2.5fr 0.8fr 0.8fr 2fr 1fr 0.8fr 0.8fr 1fr 36px" }}>

                {/* Product */}
                <div className="col-span-2 md:col-span-1" style={{ gridColumn: "1" }}>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                  >
                    <option value="">Select</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.designNo ? `(${p.designNo})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* HSN */}
                <div>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">HSN</label>
                  <input value={item.hsn} onChange={(e) => handleItemField(index, "hsn", e.target.value)}
                    placeholder="HSN"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
                </div>

                {/* Size */}
                <div>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Size</label>
                  <input value={item.size} onChange={(e) => handleItemField(index, "size", e.target.value)}
                    placeholder="Size"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
                </div>

                {/* Description */}
                <div>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Description</label>
                  <input value={item.description} onChange={(e) => handleItemField(index, "description", e.target.value)}
                    placeholder="Description"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
                </div>

                {/* Rate */}
                <div>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Rate</label>
                  <input type="number" min={0} value={item.rate}
                    onChange={(e) => handleItemField(index, "rate", Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
                </div>

                {/* Qty */}
                <div>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Qty</label>
                  <input type="number" min={1} value={item.qty}
                    onChange={(e) => handleItemField(index, "qty", Number(e.target.value))}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
                </div>

                {/* Discount */}
                <div>
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Disc %</label>
                  <input type="number" min={0} max={100} value={item.discount}
                    onChange={(e) => handleItemField(index, "discount", Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
                </div>

                {/* Total + Delete */}
                <div className="flex items-center gap-1">
                  <input value={`₹${item.total.toFixed(2)}`} readOnly
                    className="w-full border border-slate-100 bg-slate-50 px-3 py-2.5 rounded-lg text-sm font-bold text-indigo-700" />
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

      {/* ── Payment + Summary ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Paid Amount */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Details</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Amount Paid Now ₹
              </label>
              <input
                type="number" min={0} max={grandTotal} value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
              <p className="text-xs text-slate-400 mt-1">Leave 0 for full credit purchase</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, Math.round(grandTotal / 2), grandTotal].map((v, i) => (
                <button key={i} onClick={() => setPaidAmount(v)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition ${
                    paidAmount === v
                      ? "border-indigo-400 text-indigo-600 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-600"
                  }`}>
                  {i === 0 ? "₹0 (Credit)" : i === 1 ? "Half" : "Full Paid"}
                </button>
              ))}
            </div>

            {/* Payment status indicator */}
            <div className={`flex items-center justify-between p-3 rounded-xl border ${statusBadge[status]}`}>
              <span className="text-xs font-semibold">Payment Status</span>
              <span className="text-xs font-bold">{status.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
            <div className="flex justify-between text-sm font-bold text-emerald-600">
              <span>Paid Now</span>
              <span>₹{paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-red-500 border-t border-slate-100 pt-2">
              <span>Balance Due</span>
              <span>₹{balanceAmount.toFixed(2)}</span>
            </div>

            <div className={`text-center py-1.5 rounded-lg text-xs font-bold border mt-2 ${statusBadge[status]}`}>
              {status.replace("_", " ")}
            </div>
          </div>
        </div>

      </div>

      {/* ── Action Buttons ──────────────────────────── */}
      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => window.history.back()}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
          Cancel
        </button>
        <button onClick={handleSubmit}
          className="px-8 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-lg shadow-indigo-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          {isEdit ? "Update Purchase" : "Save Purchase"}
        </button>
      </div>

    </div>
  );
};

export default PurchaseForm;