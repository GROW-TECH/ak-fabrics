import React, { useState, useMemo, useEffect } from "react";
import { Account, Product } from "../types";
import {
  Plus, Trash2, FileText, Package, ChevronDown,
  CreditCard, User, Save, ArrowLeft,
  IndianRupee, Hash, Ruler, AlignLeft, ShoppingBag,
} from "lucide-react";

interface PurchaseFormProps {
  accounts: Account[];
  products: Product[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

interface PurchaseItem {
  productId:   string;
  hsn:         string;
  size:        string;
  description: string;
  rate:        number;
  qty:         number;
  discount:    number;
  total:       number;
}

// ─── reusable label ─────────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

// ─── shared input classes ────────────────────────────────────────────────────
const inputCls =
  "w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 " +
  "focus:bg-white transition placeholder-slate-300";

// ────────────────────────────────────────────────────────────────────────────
const PurchaseForm: React.FC<PurchaseFormProps> = ({
  accounts, products, onSubmit, initialData,
}) => {
  const isEdit     = Boolean(initialData?.id);
  const purchaseId = useMemo(
    () => initialData?.invoice_no || "New Purchase",
    [initialData]
  );

  // GST calculation function
  const calculateGST = (totalAmount: number, gstRate: number, vendorPincode: string, shopPincode: string = "") => {
    const taxableAmount = totalAmount;
    const isInterState = vendorPincode && shopPincode && vendorPincode.slice(0, 2) !== shopPincode.slice(0, 2);
    
    const cgstAmount = isInterState ? 0 : (taxableAmount * gstRate) / 200;
    const sgstAmount = isInterState ? 0 : (taxableAmount * gstRate) / 200;
    const igstAmount = isInterState ? (taxableAmount * gstRate) / 100 : 0;
    const totalAfterTax = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    return {
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAfterTax,
    };
  };

  // ── state ────────────────────────────────────────────────────────────────
  const [vendorId,    setVendorId]    = useState(initialData?.vendor_id     || "");
  const [paymentMode, setPaymentMode] = useState(initialData?.payment_mode  || "CREDIT");
  const [paidAmount,  setPaidAmount]  = useState<number>(Number(initialData?.paid_amount) || 0);
  const [through,     setThrough]     = useState(initialData?.through_agent || "");
  const [notes,       setNotes]       = useState(initialData?.notes         || "");
  const [vendorPincode, setVendorPincode] = useState(initialData?.vendor_pincode || "");
  const [gstRate, setGstRate] = useState(initialData?.gst_rate || 5);

  const blankItem = (): PurchaseItem => ({
    productId: "", hsn: "", size: "", description: "",
    rate: 0, qty: 1, discount: 0, total: 0,
  });

  const mapItems = (raw: any[]): PurchaseItem[] =>
    raw.map((it: any) => ({
      productId:   it.product_id  || it.productId  || "",
      hsn:         it.hsn         || "",
      size:        it.size        || "",
      description: it.description || "",
      rate:        Number(it.rate)                 || 0,
      qty:         Number(it.quantity ?? it.qty)   || 1,
      discount:    Number(it.discount)             || 0,
      total:       Number(it.total)                || 0,
    }));

  const [items, setItems] = useState<PurchaseItem[]>(
    initialData?.items?.length ? mapItems(initialData.items) : [blankItem()]
  );

  useEffect(() => {
    if (!initialData) return;
    setVendorId(initialData.vendor_id     || "");
    setPaymentMode(initialData.payment_mode  || "CREDIT");
    setPaidAmount(Number(initialData.paid_amount)  || 0);
    setThrough(initialData.through_agent || "");
    setNotes(initialData.notes           || "");
    setItems(initialData.items?.length ? mapItems(initialData.items) : [blankItem()]);
  }, [initialData]);

  const vendor  = accounts.find((a) => a.id === vendorId);
  const vendors = accounts.filter((a) => (a as any).type === "VENDOR");

  // ── item helpers ─────────────────────────────────────────────────────────
  const calcTotal = (rate: number, qty: number, discount: number) => {
    const sub = rate * qty;
    return Math.round((sub - (sub * discount) / 100) * 100) / 100;
  };

  const handleProductChange = (index: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId,
        hsn:         (p as any)?.hsnCode || (p as any)?.hsn || "",
        description: p?.name || "",
        rate:        Number((p as any)?.price ?? (p as any)?.rate) || 0,
        total:       calcTotal(
          Number((p as any)?.price ?? (p as any)?.rate) || 0,
          next[index].qty,
          next[index].discount,
        ),
      };
      return next;
    });
  };

  const handleItemField = (index: number, field: keyof PurchaseItem, value: any) => {
    setItems((prev) => {
      const next  = [...prev];
      (next[index] as any)[field] = value;
      next[index].total = calcTotal(next[index].rate, next[index].qty, next[index].discount);
      return next;
    });
  };

  const addItem    = () => setItems((p) => [...p, blankItem()]);
  const removeItem = (i: number) => {
    if (items.length > 1) setItems((p) => p.filter((_, idx) => idx !== i));
  };

  // ── totals ───────────────────────────────────────────────────────────────
  const grandTotal    = items.reduce((s, i) => s + i.total, 0);
  const totalDiscount = items.reduce((s, i) => s + (i.rate * i.qty * i.discount) / 100, 0);
  const subtotal      = grandTotal + totalDiscount;
  const balanceAmount = Math.max(0, grandTotal - paidAmount);
  const totalQty      = items.reduce((s, i) => s + Number(i.qty || 0), 0);

  // GST Calculation
  const gstCalc = calculateGST(grandTotal, gstRate, vendorPincode);
  const { taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAfterTax } = gstCalc;

  const deriveStatus = (): "NOT_PAID" | "HALF_PAID" | "PAID" => {
    if (paidAmount <= 0)          return "NOT_PAID";
    if (paidAmount >= totalAfterTax) return "PAID";
    return "HALF_PAID";
  };
  const status = deriveStatus();

  const statusCls = {
    NOT_PAID:  "bg-red-50 text-red-600 border-red-200",
    PAID:      "bg-emerald-50 text-emerald-600 border-emerald-200",
    HALF_PAID: "bg-amber-50 text-amber-600 border-amber-200",
  };
  const dotCls = {
    NOT_PAID:  "bg-red-400",
    PAID:      "bg-emerald-400",
    HALF_PAID: "bg-amber-400",
  };

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!vendorId) { alert("Please select a vendor"); return; }
    onSubmit({
      vendor_id:     vendorId,
      payment_mode:  paymentMode,
      paid_amount:   paidAmount,
      through_agent: through  || null,
      notes:         notes    || null,
      total_amount:  grandTotal,
      vendorPincode,
      gstRate,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAfterTax,
      items: items.map((it) => ({
        productId:   it.productId,
        hsn:         it.hsn,
        size:        it.size,
        description: it.description,
        rate:        it.rate,
        qty:         it.qty,
        discount:    it.discount,
        total:       it.total,
      })),
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)" }} />

        <div
          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ background: "linear-gradient(135deg,#f8faff,#f1f5ff)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-none">
                {isEdit ? "Edit Purchase Invoice" : "New Purchase Invoice"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {purchaseId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* live total */}
            <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-sm font-bold text-indigo-600">
                {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {/* status badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${statusCls[status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotCls[status]}`} />
              {status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* ══ VENDOR DETAILS ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-50 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vendor Details</p>
        </div>

        <div className="p-6 space-y-5">

          {/* Vendor + Payment Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label required>Vendor Name</Label>
              <div className="relative">
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className={inputCls + " appearance-none pr-9"}
                >
                  <option value="">— Select Vendor —</option>
                  {(vendors.length > 0 ? vendors : accounts).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <Label>Payment Mode</Label>
              <div className="relative">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className={inputCls + " appearance-none pr-9"}
                >
                  <option value="CREDIT">Credit</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Vendor info card */}
          {vendor && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              {[
                { label: "Phone",   value: (vendor as any).phone   || "—" },
                { label: "GST No",  value: (vendor as any).gstin   || "—" },
                { label: "Address", value: (vendor as any).address || "—" },
                { label: "Balance", value: `₹${Number((vendor as any).balance || 0).toLocaleString()}`, highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className={`text-sm font-semibold ${highlight ? "text-indigo-600" : "text-slate-700"}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* GST Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vendor Pincode</Label>
              <input
                value={vendorPincode}
                onChange={(e) => setVendorPincode(e.target.value)}
                placeholder="Enter vendor pincode"
                className={inputCls}
              />
            </div>
            <div>
              <Label>GST Rate (%)</Label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className={inputCls}
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>

          {/* GST Calculation Display */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">GST Calculation</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="ml-2 font-medium">₹{taxableAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">CGST:</span>
                <span className="ml-2 font-medium">₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">SGST:</span>
                <span className="ml-2 font-medium">₹{sgstAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">IGST:</span>
                <span className="ml-2 font-medium">₹{igstAmount.toFixed(2)}</span>
              </div>
              <div className="col-span-2 md:col-span-4 pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-semibold">Total After Tax:</span>
                <span className="ml-2 font-bold text-lg text-indigo-600">₹{totalAfterTax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Through + Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Through (Agent / Broker)</Label>
              <input
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                placeholder="Agent name (optional)"
                className={inputCls}
              />
            </div>
            <div>
              <Label>Notes / Remarks</Label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes..."
                className={inputCls}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ══ ITEMS ════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        <div className="px-6 py-3.5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Items</p>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
              {items.length} row{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <div className="p-4 space-y-2.5">

          {/* Column headers — desktop */}
          <div
            className="hidden md:grid gap-2 px-3 py-2 rounded-lg bg-slate-50"
            style={{ gridTemplateColumns: "2.5fr 0.8fr 0.8fr 2fr 1fr 0.7fr 0.7fr 1.1fr 36px" }}
          >
            {[
              { icon: <ShoppingBag className="w-3 h-3" />, label: "Product" },
              { icon: <Hash className="w-3 h-3" />,        label: "HSN" },
              { icon: <Ruler className="w-3 h-3" />,       label: "Size" },
              { icon: <AlignLeft className="w-3 h-3" />,   label: "Description" },
              { icon: <IndianRupee className="w-3 h-3" />, label: "Rate" },
              { icon: null, label: "Qty" },
              { icon: null, label: "Disc %" },
              { icon: <IndianRupee className="w-3 h-3" />, label: "Total" },
              { icon: null, label: "" },
            ].map(({ icon, label }, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {icon && <span className="text-slate-300">{icon}</span>}
                {label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {items.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition group"
            >
              <div
                className="grid grid-cols-2 md:grid-cols-9 gap-2 items-center"
                style={{ gridTemplateColumns: "2.5fr 0.8fr 0.8fr 2fr 1fr 0.7fr 0.7fr 1.1fr 36px" }}
              >
                {/* Product */}
                <div className="col-span-2 md:col-span-1">
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className={inputCls + " text-xs py-2"}
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{(p as any).designNo ? ` (${(p as any).designNo})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* HSN */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">HSN</label>
                  <input
                    value={item.hsn}
                    onChange={(e) => handleItemField(index, "hsn", e.target.value)}
                    placeholder="HSN"
                    className={inputCls + " text-xs py-2"}
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Size</label>
                  <input
                    value={item.size}
                    onChange={(e) => handleItemField(index, "size", e.target.value)}
                    placeholder="Size"
                    className={inputCls + " text-xs py-2"}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Description</label>
                  <input
                    value={item.description}
                    onChange={(e) => handleItemField(index, "description", e.target.value)}
                    placeholder="Description"
                    className={inputCls + " text-xs py-2"}
                  />
                </div>

                {/* Rate */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Rate ₹</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={item.rate || ""}
                    onChange={(e) => handleItemField(index, "rate", Number(e.target.value))}
                    placeholder="0"
                    className={inputCls + " text-xs py-2"}
                  />
                </div>

                {/* Qty */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Qty</label>
                  <input
                    type="number" min={1}
                    value={item.qty || ""}
                    onChange={(e) => handleItemField(index, "qty", Number(e.target.value))}
                    className={inputCls + " text-xs py-2 text-center"}
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Disc %</label>
                  <input
                    type="number" min={0} max={100} step="0.1"
                    value={item.discount || ""}
                    onChange={(e) => handleItemField(index, "discount", Number(e.target.value))}
                    placeholder="0"
                    className={inputCls + " text-xs py-2 text-center"}
                  />
                </div>

                {/* Total (read-only) */}
                <div>
                  <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Total ₹</label>
                  <div className="px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50 text-xs font-bold text-indigo-700 text-right">
                    ₹{item.total.toFixed(2)}
                  </div>
                </div>

                {/* Delete */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-20 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          ))}

          {/* Items footer */}
          <div className="flex justify-end pt-2 pr-1">
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span>Total Qty: <strong className="text-slate-700">{totalQty}</strong></span>
              <span>Rows: <strong className="text-slate-700">{items.length}</strong></span>
              <span className="text-base font-bold text-slate-800">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ══ PAYMENT + SUMMARY ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Payment Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-3.5 border-b border-slate-50 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Details</p>
          </div>
          <div className="p-6 space-y-4">

            <div>
              <Label>Amount Paid Now ₹</Label>
              <input
                type="number" min={0} max={totalAfterTax} step="0.01"
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
              <p className="text-[11px] text-slate-400 mt-1">Leave 0 for full credit purchase</p>
            </div>

            {/* Quick-set */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "₹0  Credit", value: 0 },
                { label: "Half",       value: Math.round(totalAfterTax / 2) },
                { label: "Full Paid",  value: totalAfterTax },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPaidAmount(value)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    paidAmount === value
                      ? "border-indigo-400 text-indigo-600 bg-indigo-50 shadow-sm"
                      : "border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status pill */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border font-semibold text-xs ${statusCls[status]}`}>
              <span>Payment Status</span>
              <span className="font-bold">{status.replace("_", " ")}</span>
            </div>

          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-3.5 border-b border-slate-50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bill Summary</p>
          </div>
          <div className="p-6 space-y-3">

            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal (before discount)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Total Discount</span>
                <span>− ₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-bold text-slate-800 border-t border-slate-100 pt-3">
              <span className="text-sm">Grand Total</span>
              <span className="text-indigo-600 text-xl">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* GST Breakdown */}
            {(cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0) && (
              <>
                {cgstAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>CGST ({gstRate/2}%)</span>
                    <span>₹{cgstAmount.toFixed(2)}</span>
                  </div>
                )}
                {sgstAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>SGST ({gstRate/2}%)</span>
                    <span>₹{sgstAmount.toFixed(2)}</span>
                  </div>
                )}
                {igstAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>IGST ({gstRate}%)</span>
                    <span>₹{igstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-green-600 border-t border-slate-100 pt-2">
                  <span>Total After Tax</span>
                  <span className="text-lg">₹{totalAfterTax.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm font-semibold text-emerald-600">
              <span>Paid Now</span>
              <span>₹{paidAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-red-500 border-t border-slate-100 pt-3">
              <span>Balance Due</span>
              <span>₹{(totalAfterTax - paidAmount).toFixed(2)}</span>
            </div>

            <div className={`text-center py-2 rounded-xl text-xs font-bold border mt-1 ${statusCls[status]}`}>
              {status.replace("_", " ")}
            </div>

          </div>
        </div>

      </div>

      {/* ══ ACTIONS ═════════════════════════════════════════════════════════ */}
      <div className="flex justify-end gap-3 pb-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-lg shadow-indigo-200 hover:opacity-95"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Save className="w-4 h-4" />
          {isEdit ? "Update Purchase" : "Save Purchase"}
        </button>
      </div>

    </div>
  );
};

export default PurchaseForm;