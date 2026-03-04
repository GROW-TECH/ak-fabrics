import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const PurchaseEditPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    vendor_id: "",
    items: [] as any[],
    grandTotal: 0,
    paidAmount: 0,
    paymentMode: "CREDIT",
    notes: "",
    through: "",
  });

  const normalizeItem = (item: any) => {
    const rate = Number(item?.rate || 0);
    const qty = Number(item?.qty ?? item?.quantity ?? 0);
    const discount = Number(item?.discount || 0);
    const computedTotal = rate * qty - (rate * qty * discount) / 100;
    return {
      product_id: item?.product_id || item?.productId || "",
      hsn: item?.hsn || "",
      size: item?.size || "",
      description: item?.description || "",
      rate,
      qty,
      discount,
      total: Number.isFinite(Number(item?.total)) ? Number(item.total) : computedTotal,
    };
  };

  const computeGrandTotal = (items: any[]) =>
    items.reduce((sum, item) => sum + Number(item?.total || 0), 0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch purchase data
        const purchaseRes = await fetch(`${API}/api/purchases/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (purchaseRes.ok) {
          const purchaseData = await purchaseRes.json();
          const normalizedItems = (purchaseData.items || []).map(normalizeItem);
          setPurchase(purchaseData);
          setFormData({
            vendor_id: purchaseData.vendor_id || "",
            items: normalizedItems,
            grandTotal: Number(purchaseData.total_amount || computeGrandTotal(normalizedItems)),
            paidAmount: Number(purchaseData.paid_amount || 0),
            paymentMode: purchaseData.payment_mode || "CREDIT",
            notes: purchaseData.notes || "",
            through: purchaseData.through_agent || "",
          });
        }

        // Fetch vendors
        const vendorsRes = await fetch(`${API}/api/accounts?type=VENDOR`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (vendorsRes.ok) {
          setVendors(await vendorsRes.json());
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
    const current = { ...newItems[index], [field]: value };
    const rate = Number(current.rate || 0);
    const qty = Number(current.qty ?? current.quantity ?? 0);
    const discount = Number(current.discount || 0);
    current.total = rate * qty - (rate * qty * discount) / 100;
    newItems[index] = current;

    const grandTotal = computeGrandTotal(newItems);
    
    setFormData({ ...formData, items: newItems, grandTotal });
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
    const grandTotal = computeGrandTotal(newItems);
    setFormData({ ...formData, items: newItems, grandTotal });
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/purchases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          vendor_id: formData.vendor_id,
          items: formData.items.map(item => ({
            productId: item.product_id || "",
            hsn: item.hsn || "",
            size: item.size || "",
            description: item.description || "",
            rate: Number(item.rate || 0),
            qty: Number(item.qty ?? item.quantity ?? 0),
            discount: Number(item.discount || 0),
            total: Number(item.total || 0)
          })),
          payment_mode: formData.paymentMode,
          paid_amount: Number(formData.paidAmount || 0),
          through_agent: formData.through || null,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        return alert(error.error || "Failed to update purchase");
      }

      alert("Purchase updated successfully!");
      navigate("/purchase-receipts");
    } catch (error) {
      console.error("Failed to update purchase:", error);
      alert("Failed to update purchase");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Edit Purchase</h1>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Vendor Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Vendor</label>
          <select
            value={formData.vendor_id}
            onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Items</h3>
            <button
              onClick={addNewItem}
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
                        value={item.product_id || ""}
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
                        value={item.hsn || ""}
                        onChange={(e) => handleItemChange(index, "hsn", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="text"
                        value={item.size || ""}
                        onChange={(e) => handleItemChange(index, "size", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="number"
                        value={Number(item.rate || 0)}
                        onChange={(e) => handleItemChange(index, "rate", Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input
                        type="number"
                        value={Number(item.qty ?? item.quantity ?? 0)}
                        onChange={(e) => handleItemChange(index, "qty", Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                      />
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-right">
                      {Number(item.total || 0)}
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseEditPage;
