import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const SalesEditPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // GST calculation function
  const calculateGST = (totalAmount: number, gstRate: number, customerPincode: string, shopPincode: string = "") => {
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

  const [formData, setFormData] = useState({
    customer_id: "",
    items: [] as any[],
    grandTotal: 0,
    paidAmount: 0,
    paymentMode: "CREDIT",
    notes: "",
    through: "",
    customerPincode: "",
    gstRate: 5,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalAfterTax: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch sale data
        const saleRes = await fetch(`${API}/api/sales/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (saleRes.ok) {
          const saleData = await saleRes.json();
          setSale(saleData);
          setFormData({
            customer_id: saleData.customer_id || "",
            items: saleData.items || [],
            grandTotal: saleData.total_amount || 0,
            paidAmount: saleData.paid_amount || 0,
            paymentMode: saleData.payment_mode || "CREDIT",
            notes: saleData.notes || "",
            through: saleData.through_agent || "",
            customerPincode: saleData.customer_pincode || "",
            gstRate: saleData.gst_rate || 5,
            taxableAmount: saleData.taxable_amount || 0,
            cgstAmount: saleData.cgst_amount || 0,
            sgstAmount: saleData.sgst_amount || 0,
            igstAmount: saleData.igst_amount || 0,
            totalAfterTax: saleData.total_after_tax || 0,
          });
        }

        // Fetch customers
        const customersRes = await fetch(`${API}/api/accounts?type=CUSTOMER`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (customersRes.ok) {
          setCustomers(await customersRes.json());
        }

        // Fetch products
        const productsRes = await fetch(`${API}/api/products`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (productsRes.ok) {
          setProducts(await productsRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate item total
    const itemTotal = Number(newItems[index].rate) * Number(newItems[index].qty);
    newItems[index].total = itemTotal;
    
    // Recalculate grand total
    const grandTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    
    // Recalculate GST
    const gstCalc = calculateGST(grandTotal, formData.gstRate, formData.customerPincode);
    
    setFormData({ 
      ...formData, 
      items: newItems, 
      grandTotal,
      ...gstCalc
    });
  };

  const addNewItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        product_id: "",
        hsn: "",
        size: "",
        description: "",
        rate: 0,
        qty: 0,
        total: 0
      }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const grandTotal = newItems.reduce((sum, item) => sum + (Number(item.rate) * Number(item.qty)), 0);
    
    // Recalculate GST
    const gstCalc = calculateGST(grandTotal, formData.gstRate, formData.customerPincode);
    
    setFormData({ 
      ...formData, 
      items: newItems, 
      grandTotal,
      ...gstCalc
    });
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/sales/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          items: formData.items.map(item => ({
            product_id: item.product_id,
            hsn: item.hsn,
            size: item.size,
            description: item.description,
            rate: Number(item.rate),
            quantity: Number(item.qty), // Backend expects 'quantity', not 'qty'
            total: Number(item.rate) * Number(item.qty)
          })),
          payment_mode: formData.paymentMode,
          paid_amount: formData.paidAmount, // Backend expects 'paid_amount', not 'paidAmount'
          through_agent: formData.through, // Backend expects 'through_agent', not 'through'
          notes: formData.notes,
          customerPincode: formData.customerPincode,
          gstRate: formData.gstRate,
          taxableAmount: formData.taxableAmount,
          cgstAmount: formData.cgstAmount,
          sgstAmount: formData.sgstAmount,
          igstAmount: formData.igstAmount,
          totalAfterTax: formData.totalAfterTax,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        return alert(error.error || "Failed to update sale");
      }

      alert("Sale updated successfully!");
      navigate("/sales-receipts");
    } catch (error) {
      console.error("Failed to update sale:", error);
      alert("Failed to update sale");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Edit Sale</h1>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Customer</label>
          <select
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* GST and Pincode Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Customer Pincode</label>
            <input
              type="text"
              value={formData.customerPincode}
              onChange={(e) => {
                const gstCalc = calculateGST(formData.grandTotal, formData.gstRate, e.target.value);
                setFormData({ ...formData, customerPincode: e.target.value, ...gstCalc });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter pincode"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">GST Rate (%)</label>
            <select
              value={formData.gstRate}
              onChange={(e) => {
                const gstCalc = calculateGST(formData.grandTotal, Number(e.target.value), formData.customerPincode);
                setFormData({ ...formData, gstRate: Number(e.target.value), ...gstCalc });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">GST Calculation</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Taxable Amount:</span>
              <span className="ml-2 font-medium">₹{formData.taxableAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-600">CGST:</span>
              <span className="ml-2 font-medium">₹{formData.cgstAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-600">SGST:</span>
              <span className="ml-2 font-medium">₹{formData.sgstAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-600">IGST:</span>
              <span className="ml-2 font-medium">₹{formData.igstAmount.toFixed(2)}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-semibold">Total After Tax:</span>
              <span className="ml-2 font-bold text-lg">₹{formData.totalAfterTax.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Items</h3>
            <button
              onClick={addNewItem}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-3 py-2 text-left text-sm">Product</th>
                  <th className="border border-slate-200 px-3 py-2 text-left text-sm">HSN</th>
                  <th className="border border-slate-200 px-3 py-2 text-left text-sm">Size</th>
                  <th className="border border-slate-200 px-3 py-2 text-left text-sm">Description</th>
                  <th className="border border-slate-200 px-3 py-2 text-right text-sm">Rate</th>
                  <th className="border border-slate-200 px-3 py-2 text-right text-sm">Qty</th>
                  <th className="border border-slate-200 px-3 py-2 text-right text-sm">Total</th>
                  <th className="border border-slate-200 px-3 py-2 text-center text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-slate-200 px-3 py-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const product = products.find(p => p.id === e.target.value);
                          handleItemChange(index, "product_id", e.target.value);
                          if (product) {
                            handleItemChange(index, "description", product.name);
                            handleItemChange(index, "rate", product.rate || 0);
                            handleItemChange(index, "hsn", product.hsn || "");
                          }
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => handleItemChange(index, "hsn", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) => handleItemChange(index, "size", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-right">
                      {Number(item.rate) * Number(item.qty)}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Grand Total</label>
            <input
              type="number"
              value={formData.grandTotal}
              readOnly
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Paid Amount</label>
            <input
              type="number"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit</option>
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Through Agent</label>
            <input
              type="text"
              value={formData.through}
              onChange={(e) => setFormData({ ...formData, through: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesEditPage;
