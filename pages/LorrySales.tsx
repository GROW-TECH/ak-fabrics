import React, { useMemo, useState } from "react";
import { Account, Product } from "../types";
import { ChevronDown, FileText, Image as ImageIcon, Package, Plus, Trash2, Truck } from "lucide-react";

interface LorrySalesProps {
  accounts: Account[];
  products: Product[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

interface LorrySalesItem {
  productId: string;
  hsn: string;
  size: string;
  description: string;
  rate: number;
  qty: number;
  discount: number;
  total: number;
}

const LorrySales: React.FC<LorrySalesProps> = ({ accounts, products, onSubmit, initialData }) => {
  // Debug: Check if initialData is provided
  console.log('LorrySales - initialData received:', initialData);
  console.log('LorrySales - initialData keys:', initialData ? Object.keys(initialData) : 'null');
  
  const saleId = useMemo(() => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LOR-${timestamp}-${random}`;
  }, []);

  // Debug: Check if accounts data is available
  console.log('LorrySales - Accounts data:', accounts);
  console.log('LorrySales - Products data:', products);
  console.log('LorrySales - Customers found:', accounts.filter((a) => a.type === "CUSTOMER"));
  console.log('LorrySales - Products found:', products.length);

  // GST calculation function
  const calculateGST = (totalAmount: number, gstRate: number, customerPincode: string, shopPincode: string = "636003") => {
    const taxableAmount = totalAmount;
    const isInterState = customerPincode && shopPincode && customerPincode.slice(0, 2) !== shopPincode.slice(0, 2);
    
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

  const [customerId, setCustomerId] = useState(initialData?.customer_id || "");
  const [paymentMode, setPaymentMode] = useState(initialData?.payment_mode || "CREDIT");
  const [paidAmount, setPaidAmount] = useState<number>(Number(initialData?.paid_amount) || 0);
  const [through, setThrough] = useState(initialData?.through_agent || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [customerPincode, setCustomerPincode] = useState(initialData?.customer_pincode || initialData?.pincode || "");
  const [gstRate, setGstRate] = useState(initialData?.gst_rate || 5);
  
  // Lorry-specific fields
  const [lorryNumber, setLorryNumber] = useState(initialData?.lorry_number || "");
  const [driverName, setDriverName] = useState(initialData?.driver_name || "");
  
  // Debug: Log initial state values
  console.log('LorrySales - Initial state values:', {
    customerId: initialData?.customer_id || "",
    paymentMode: initialData?.payment_mode || "CREDIT",
    paidAmount: Number(initialData?.paid_amount) || 0,
    lorryNumber: initialData?.lorry_number || "",
    driverName: initialData?.driver_name || "",
    customerPincode: initialData?.customer_pincode || initialData?.pincode || "",
    gstRate: initialData?.gst_rate || 5
  });
  
  const [items, setItems] = useState<LorrySalesItem[]>(
    initialData?.items?.map((item: any) => ({
      productId: item.product_id || "",
      hsn: item.hsn || "",
      size: item.size || "",
      description: item.description || "",
      rate: Number(item.rate) || 0,
      qty: Number(item.quantity || item.qty) || 1,
      discount: Number(item.discount) || 0,
      total: Number(item.total) || 0,
    })) || [{ productId: "", hsn: "", size: "", description: "", rate: 0, qty: 1, discount: 0, total: 0 }]
  );

  const customer = accounts.find((a) => a.id === customerId);

  const calcTotal = (rate: number, qty: number, discount: number) => {
    const sub = rate * qty;
    return sub - (sub * discount) / 100;
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updated = [...items];
    updated[index].productId = productId;
    updated[index].hsn = product?.hsnCode || "";
    updated[index].description = product?.name || "";
    updated[index].rate = product?.price || 0;
    updated[index].total = calcTotal(updated[index].rate, updated[index].qty, updated[index].discount);
    setItems(updated);
  };

  const handleItemField = (index: number, field: keyof LorrySalesItem, value: any) => {
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

  const grandTotal = items.reduce((s, i) => s + i.total, 0);
  const totalDiscount = items.reduce((s, i) => s + (i.rate * i.qty * i.discount) / 100, 0);

  // GST Calculation - Fix: Calculate taxable amount from base amounts
  const taxableAmount = useMemo(() => items.reduce((s, i) => {
    const rate = Number(i.rate || 0);
    const qty = Number(i.qty || 0);
    const discount = Number(i.discount || 0);
    const itemTotal = rate * qty;
    const discountAmount = (itemTotal * discount) / 100;
    return s + (itemTotal - discountAmount);
  }, 0), [items]);
  
  const gstCalc = useMemo(() => calculateGST(taxableAmount, gstRate, customerPincode), [taxableAmount, gstRate, customerPincode]);
  const { cgstAmount, sgstAmount, igstAmount, totalAfterTax } = gstCalc;
  
  const balanceAmount = useMemo(() => Math.max(0, totalAfterTax - paidAmount), [totalAfterTax, paidAmount]);

  const deriveStatus = () => {
    if (paidAmount <= 0) return "NOT_PAID";
    if (paidAmount >= totalAfterTax) return "PAID";
    return "HALF_PAID";
  };

  const handleSubmit = () => {
    if (!customerId) return alert("Please select a customer");
    if (!lorryNumber.trim()) return alert("Please enter lorry number");
    if (items.some((i) => !i.productId)) return alert("Please select a product for all rows");

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
      lorryNumber,
      driverName,
      customerPincode,
      gstRate,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAfterTax,
      date: new Date().toISOString(),
    });
  };

  const inp =
    "w-full border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition";
  const lbl = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";
  const card = "bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden";

  const statusBadge = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    NOT_PAID: "bg-red-50 text-red-700 border-red-200",
    HALF_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  }[deriveStatus()];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className={card}>
        <div className="h-1" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)" }} />
        <div className="px-6 py-4 flex justify-between items-center" style={{ background: "linear-gradient(135deg,#f8faff,#f1f5ff)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">New Lorry Sales Invoice</h2>
              <p className="text-xs text-slate-500">ID: {saleId}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusBadge}`}>{deriveStatus().replace("_", " ")}</span>
        </div>
      </div>

      {initialData?.imageUrl && (
        <div className={card}>
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-700">Uploaded Invoice Image</h3>
            </div>
            <div className="flex justify-center">
              <img src={initialData.imageUrl} alt="Invoice" className="max-w-full h-48 object-contain rounded-lg border border-slate-200" />
            </div>
          </div>
        </div>
      )}

      <div className={card}>
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Details</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={lbl}>
                Customer <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => {
                    console.log('Customer dropdown changed to:', e.target.value);
                    const selectedId = e.target.value;
                    setCustomerId(selectedId);
                    const selectedCustomer = accounts.find((a) => a.id === selectedId);
                    console.log('Selected customer:', selectedCustomer);
                    setCustomerPincode(selectedCustomer?.pincode || "");
                  }}
                  className={inp + " pr-8 appearance-none"}
                >
                  <option value="">Select Customer</option>
                  {accounts.length === 0 ? (
                    <option disabled>No customers available</option>
                  ) : (
                    <>
                      {console.log('Rendering customer options, total customers:', accounts.length)}
                      {accounts
                        .filter((a) => a.type === "CUSTOMER")
                        .map((c) => {
                          console.log('Customer option:', c.id, c.name, c.type);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          );
                        })}
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {accounts.length === 0 && (
                <div className="text-xs text-red-500 mt-1">
                  No customers found. Please add customers first.
                </div>
              )}
            </div>

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

          {customer && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              {[
                { label: "Phone", value: customer.phone || "-" },
                { label: "GST No", value: customer.gstin || "-" },
                { label: "Pincode", value: customerPincode || "-" },
                { label: "Address", value: customer.address || "-" },
                { label: "Balance", value: `Rs ${(customer.balance || 0).toLocaleString()}`, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label}>
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">{label}</p>
                  <p className={`text-sm mt-0.5 ${bold ? "font-bold text-indigo-600" : "text-slate-700 font-medium"}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Lorry Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Lorry Number <span className="text-red-400">*</span></label>
              <input value={lorryNumber} onChange={(e) => setLorryNumber(e.target.value)} placeholder="Enter lorry number" className={inp} />
            </div>
            <div>
              <label className={lbl}>Driver Name</label>
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Enter driver name" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Customer Pincode</label>
              <input value={customerPincode} onChange={(e) => setCustomerPincode(e.target.value)} placeholder="Enter pincode" className={inp} />
            </div>
            <div>
              <label className={lbl}>GST Rate (%)</label>
              <select value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} className={inp}>
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Through (Agent / Broker)</label>
              <input value={through} onChange={(e) => setThrough(e.target.value)} placeholder="Agent name (optional)" className={inp} />
            </div>
          </div>

          {/* GST Calculation Display */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">GST Calculation</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="ml-2 font-medium">Rs {taxableAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">CGST:</span>
                <span className="ml-2 font-medium">Rs {cgstAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">SGST:</span>
                <span className="ml-2 font-medium">Rs {sgstAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">IGST:</span>
                <span className="ml-2 font-medium">Rs {igstAmount.toFixed(2)}</span>
              </div>
              <div className="col-span-2 md:col-span-4 pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-semibold">Total After Tax:</span>
                <span className="ml-2 font-bold text-lg text-indigo-600">Rs {totalAfterTax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Notes / Remarks</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." className={inp} />
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items</p>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
              {items.length} row{items.length > 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="hidden md:grid gap-2 px-3 py-2 rounded-lg bg-slate-50" style={{ gridTemplateColumns: "2.5fr 0.8fr 0.8fr 2fr 1fr 0.8fr 0.8fr 1fr 36px" }}>
            {["Product", "HSN", "Size", "Description", "Rate Rs", "Qty", "Disc %", "Total Rs", ""].map((h, i) => (
              <div key={i} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition items-center"
              style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
            >
              <div className="col-span-4 grid grid-cols-2 md:grid-cols-9 gap-2 items-center" style={{ gridColumn: "1 / -1" }}>
                <div className="col-span-2 md:col-span-3">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Product</label>
                  <select value={item.productId} onChange={(e) => {
                    console.log('Product dropdown changed to:', e.target.value);
                    handleProductChange(index, e.target.value);
                  }} className={inp}>
                    <option value="">Select Product</option>
                    {products.length === 0 ? (
                      <option disabled>No products available</option>
                    ) : (
                      <>
                        {console.log('Rendering product options, total products:', products.length)}
                        {products.map((p) => {
                          console.log('Product option:', p.id, p.name);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                  {products.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      No products found. Please add products first.
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">HSN</label>
                  <input value={item.hsn} onChange={(e) => handleItemField(index, "hsn", e.target.value)} placeholder="HSN" className={inp} />
                </div>

                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Size</label>
                  <input value={item.size} onChange={(e) => handleItemField(index, "size", e.target.value)} placeholder="Size" className={inp} />
                </div>

                <div className="col-span-2 md:col-span-2">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Description</label>
                  <input value={item.description} onChange={(e) => handleItemField(index, "description", e.target.value)} placeholder="Description" className={inp} />
                </div>

                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Rate</label>
                  <input type="number" min={0} value={item.rate} onChange={(e) => handleItemField(index, "rate", Number(e.target.value))} placeholder="0" className={inp} />
                </div>

                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Qty</label>
                  <input type="number" min={1} value={item.qty} onChange={(e) => handleItemField(index, "qty", Number(e.target.value))} className={inp} />
                </div>

                <div className="col-span-1">
                  <label className="md:hidden text-xs text-slate-400 mb-0.5 block">Disc %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discount}
                    onChange={(e) => handleItemField(index, "discount", Number(e.target.value))}
                    placeholder="0"
                    className={inp}
                  />
                </div>

                <div className="col-span-1 flex items-center gap-1">
                  <input value={`Rs ${item.total.toFixed(2)}`} readOnly className="w-full border border-slate-100 bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold text-indigo-700" />
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-20 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={card}>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Details</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className={lbl}>Amount Paid Now Rs</label>
              <input type="number" min={0} max={totalAfterTax} value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} placeholder="0" className={inp} />
              <p className="text-xs text-slate-400 mt-1">Leave 0 for full credit sale</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, Math.round(totalAfterTax / 2), totalAfterTax].map((v, i) => (
                <button
                  key={i}
                  onClick={() => setPaidAmount(v)}
                  className="py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition text-slate-600"
                >
                  {i === 0 ? "Rs 0 (Credit)" : i === 1 ? "Half" : "Full Paid"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bill Summary</p>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>Rs {(grandTotal + totalDiscount).toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>- Rs {totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-3">
              <span>Grand Total</span>
              <span className="text-indigo-600 text-lg">Rs {grandTotal.toFixed(2)}</span>
            </div>
            
            {/* GST Breakdown */}
            {(cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0) && (
              <>
                {cgstAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>CGST ({gstRate/2}%)</span>
                    <span>Rs {cgstAmount.toFixed(2)}</span>
                  </div>
                )}
                {sgstAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>SGST ({gstRate/2}%)</span>
                    <span>Rs {sgstAmount.toFixed(2)}</span>
                  </div>
                )}
                {igstAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>IGST ({gstRate}%)</span>
                    <span>Rs {igstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-green-600 border-t border-slate-100 pt-2">
                  <span>Total After Tax</span>
                  <span className="text-lg">Rs {totalAfterTax.toFixed(2)}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Paid Now</span>
              <span>Rs {paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-red-500 border-t border-slate-100 pt-2">
              <span>Balance Due</span>
              <span>Rs {(totalAfterTax - paidAmount).toFixed(2)}</span>
            </div>
            <div className={`text-center py-1.5 rounded-lg text-xs font-bold border mt-2 ${statusBadge}`}>{deriveStatus().replace("_", " ")}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => window.history.back()} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-lg shadow-indigo-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          Save Lorry Sale
        </button>
      </div>
    </div>
  );
};

export default LorrySales;
