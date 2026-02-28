import React, { useState, useMemo } from "react";
import { Account, Product } from "../types";

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
  total: number;
}

const SalesForm: React.FC<SalesFormProps> = ({
  accounts,
  products,
  onSubmit,
  initialData,
}) => {
  const saleId = useMemo(() => `SAL-${Date.now()}`, []);

  const [customerId, setCustomerId] = useState(
    initialData?.customer_id || ""
  );

  const [items, setItems] = useState<SalesItem[]>(
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

  const customer = accounts.find((a) => a.id === customerId);

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updated = [...items];

    updated[index].productId = productId;
    updated[index].hsn = product?.hsnCode || "";
    updated[index].rate = product?.price || 0;
    updated[index].total = updated[index].rate * updated[index].qty;

    setItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].qty = qty;
    updated[index].total = qty * updated[index].rate;
    setItems(updated);
  };

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
      customerId,
      items,
      grandTotal,
      date: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">New Sale</h2>
        <div className="text-sm font-semibold text-gray-600">
          Sale ID: {saleId}
        </div>
      </div>

      {/* Customer Section */}
      <div className="space-y-2">
        <label className="font-medium">Select Customer</label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          <option value="">Select Customer</option>
          {accounts
            .filter((a) => a.type === "CUSTOMER")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        {customer && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><b>Address:</b> {customer.address}</p>
            <p><b>GST No:</b> {customer.gstin}</p>
          </div>
        )}
      </div>

      {/* Items same as Purchase */}
      {items.map((item, index) => (
        <div key={index} className="border p-4 rounded-xl space-y-3">
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
                {p.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-4">
            <input value={item.hsn} readOnly className="border p-2 bg-gray-100 rounded" />
            <input type="number" value={item.qty}
              onChange={(e) => handleQtyChange(index, Number(e.target.value))}
              className="border p-2 rounded"
            />
            <input value={item.total} readOnly className="border p-2 bg-gray-100 rounded" />
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        + Add Product
      </button>

      <div className="text-right font-bold text-lg">
        Grand Total: ₹ {grandTotal.toLocaleString()}
      </div>

      <div className="text-right">
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded-lg"
        >
          Save Sale
        </button>
      </div>
    </div>
  );
};

export default SalesForm;