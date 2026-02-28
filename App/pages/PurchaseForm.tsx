import React, { useState, useMemo ,useEffect } from "react";
import { Account, Product } from "../types";

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
  total: number;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  accounts,
  products,
  onSubmit,
    initialData,
}) => {
  const purchaseId = useMemo(() => `PUR-${Date.now()}`, []);

const [vendorId, setVendorId] = useState(initialData?.vendor_id || "");

const [items, setItems] = useState<PurchaseItem[]>(
  initialData?.items?.map((item: any) => ({
    productId: item.product_id,
    hsn: item.hsn,
    size: item.size,
    description: item.description,
    rate: item.rate,
    qty: item.quantity,
    total: item.total,
  })) || [
    {
      productId: "",
      hsn: "",
      size: "",
      description: "",
      rate: 0,
      qty: 1,
      total: 0,
    },
  ]
);

  const vendor = accounts.find((a) => a.id === vendorId);

  // Handle product change
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    console.log("Product Details : " , product);
    
    const updated = [...items];

    updated[index].productId = productId;
    updated[index].hsn = product?.hsnCode || "";
    updated[index].rate = product?.price || 0;
    updated[index].total = updated[index].rate * updated[index].qty;

    setItems(updated);

  };

  useEffect(()=>{
    console.log(items)
  },[items]);

  // Handle qty change
  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].qty = qty;
    updated[index].total = qty * updated[index].rate;
    setItems(updated);
  };

  // Add new product row
  const addItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        hsn: "",
        size: "",
        description: "",
        rate: 0,
        qty: 1,
        total: 0,
      },
    ]);
  };

  const grandTotal = items.reduce((sum, i) => sum + i.total, 0);

  const handleSubmit = () => {
    onSubmit({
      vendorId,
      items,
      grandTotal,
      date: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">New Purchase</h2>
        <div className="text-sm font-semibold text-gray-600">
          Purchase ID: {purchaseId}
        </div>
      </div>

      {/* Vendor Section */}
      <div className="space-y-2">
        <label className="font-medium">Select Vendor</label>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          <option value="">Select Vendor</option>
          {accounts
            .filter((a) => a.type === "VENDOR")
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>

        {vendor && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><b>Address:</b> {vendor.address}</p>
            <p><b>GST No:</b> {vendor.gstin}</p>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={index} className="border p-4 rounded-xl space-y-3">

            <div>
              <label className="text-sm font-medium">Product</label>
              <select
                value={item.productId}
                onChange={(e) =>
                  handleProductChange(index, e.target.value)
                }
                className="w-full border rounded-lg p-2"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.hsn})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              <div>
                <label className="text-sm">HSN</label>
                <input
                  value={item.hsn}
                  readOnly
                  className="w-full border rounded-lg p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="text-sm">Size</label>
                <input
                  value={item.size}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[index].size = e.target.value;
                    setItems(updated);
                  }}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-sm">Rate</label>
                <input
                  value={item.rate}
                  readOnly
                  className="w-full border rounded-lg p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="text-sm">Quantity</label>
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) =>
                    handleQtyChange(index, Number(e.target.value))
                  }
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-sm">Item Description</label>
                <input
                  value={item.description}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[index].description = e.target.value;
                    setItems(updated);
                  }}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-sm">Total</label>
                <input
                  value={item.total}
                  readOnly
                  className="w-full border rounded-lg p-2 bg-gray-100"
                />
              </div>

            </div>

          </div>
        ))}

        <button
          onClick={addItem}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          + Add Product
        </button>
      </div>

      {/* Grand Total */}
      <div className="text-right text-lg font-bold">
        Grand Total: ₹ {grandTotal.toLocaleString()}
      </div>

      {/* Submit */}
      <div className="text-right">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded-lg"
        >
          Save Purchase
        </button>
      </div>

    </div>
  );
};

export default PurchaseForm;