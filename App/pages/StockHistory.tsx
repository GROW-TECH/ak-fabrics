import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

const StockHistory = () => {
  const [stock, setStock] = useState<any[]>([]);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    const res = await fetch(`${API}/api/stock-history`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      setStock(data);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">
          Stock History (Purchase)
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="px-6 py-4">S.No</th>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4 text-center">Qty</th>
              <th className="px-6 py-4">Vendor</th>
              <th className="px-6 py-4 text-right">Price</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {stock.map((row, index) => {
              let image = null;

              if (row.images) {
                try {
                  const imgs = JSON.parse(row.images);
                  image = imgs.length > 0 ? imgs[0] : null;
                } catch {
                  image = null;
                }
              }

              return (
                <tr key={row.id} className="hover:bg-slate-50">

                  <td className="px-6 py-4">{index + 1}</td>

                  <td className="px-6 py-4">
                    {image ? (
                      <img
                        src={`${API}/uploads/products/${image}`}
                        alt="product"
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                    )}
                  </td>

                  <td className="px-6 py-4 font-semibold">
                    {row.product_name}
                  </td>

                  <td className="px-6 py-4 text-center font-bold text-emerald-600">
                    {row.quantity}
                  </td>

                  <td className="px-6 py-4">
                    {row.vendor_name}
                  </td>

                  <td className="px-6 py-4 text-right font-semibold">
                    ₹{Number(row.rate).toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>

                </tr>
              );
            })}

            {stock.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No stock history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default StockHistory;