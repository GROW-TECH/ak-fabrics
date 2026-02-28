import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const PurchaseInvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      const res = await fetch(`${API}/api/purchases/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPurchase(data);
      }
    };

    fetchInvoice();
  }, [id]);

  if (!purchase) return <div className="p-10">Loading...</div>;

  const items = purchase.items || [];
  const total = items.reduce(
    (sum: number, item: any) => sum + Number(item.total),
    0
  );

  return (
    <div className="p-10 max-w-5xl mx-auto bg-white">

      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-200 rounded"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold mb-4">Purchase Invoice</h2>

     {/* Header Section */}
<div className="border p-6 mb-6">

  <div className="grid grid-cols-2 gap-6">

    {/* LEFT SIDE - Vendor Details */}
    <div className="space-y-2 text-sm">
      <p><b>Vendor Name:</b> {purchase.vendor_name}</p>
      <p><b>Address:</b> {purchase.vendor_address}</p>
      <p><b>Phone:</b> {purchase.vendor_phone}</p>
      <p><b>GST No:</b> {purchase.vendor_gstin}</p>
    </div>

    {/* RIGHT SIDE - Invoice Details */}
    <div className="space-y-2 text-sm text-right">
      <p><b>Purchase ID:</b> {purchase.invoice_no}</p>
      <p><b>Date:</b> {new Date(purchase.created_at).toLocaleDateString()}</p>
      <p><b>Time:</b> {new Date(purchase.created_at).toLocaleTimeString()}</p>
    </div>

  </div>

</div>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">S.No</th>
            <th className="border p-2">HSN</th>
            <th className="border p-2">Size</th>
            <th className="border p-2">Description</th>
            <th className="border p-2 text-right">Rate</th>
            <th className="border p-2 text-right">Qty</th>
            <th className="border p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, index: number) => (
            <tr key={index}>
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2 text-center">{item.hsn}</td>
              <td className="border p-2 text-center">{item.size}</td>
              <td className="border p-2">{item.description}</td>
              <td className="border p-2 text-right">₹{item.rate}</td>
              <td className="border p-2 text-right">{item.quantity}</td>
              <td className="border p-2 text-right">₹{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <div className="text-xl font-bold">
          Total: ₹ {total.toLocaleString()}
        </div>
      </div>

    </div>
  );
};

export default PurchaseInvoicePage;