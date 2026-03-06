import React, { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import * as XLSX from "xlsx";

const API = import.meta.env.VITE_API_URL;

const StockHistory = () => {
  const [stock, setStock] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [vendorFilter, setVendorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchStock();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch(`${API}/api/categories`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
  };

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

  // Filter stock by category, vendor, and dates
  const filteredStock = stock.filter((row) => {
    // Category filter
    if (categoryFilter && row.category_id !== categoryFilter)
      return false;
    
    // Vendor filter
    if (vendorFilter) {
      if (vendorFilter === "vendor1" && !row.vendor_name?.toLowerCase().includes("vendor 1"))
        return false;
      if (vendorFilter === "vendor2" && !row.vendor_name?.toLowerCase().includes("vendor 2"))
        return false;
    }
    
    // Date filters
    if (fromDate && new Date(row.created_at) < new Date(fromDate))
      return false;
    
    if (toDate && new Date(row.created_at) > new Date(toDate))
      return false;
    
    return true;
  });

  // Group stock history by date and vendor
  const groupedStock = filteredStock.reduce((acc: any[], row) => {
    const date = new Date(row.created_at).toLocaleDateString();
    const vendor = row.vendor_name;
    const key = `${date}_${vendor}`;
    
    const existingGroup = acc.find(group => group.key === key);
    
    if (existingGroup) {
      existingGroup.products.push({
        name: row.product_name,
        quantity: row.quantity,
        rate: row.rate,
        image: row.images
      });
      const rowAmount = Number(row.quantity) * Number(row.rate);
      existingGroup.totalQuantity += Number(row.quantity);
      existingGroup.totalAmount += rowAmount;
    } else {
      const initialAmount = Number(row.quantity) * Number(row.rate);
      acc.push({
        key,
        date,
        vendor,
        products: [{
          name: row.product_name,
          quantity: row.quantity,
          rate: row.rate,
          image: row.images
        }],
        totalQuantity: Number(row.quantity),
        totalAmount: initialAmount,
        created_at: row.created_at
      });
    }
    
    return acc;
  }, []);

  // Calculate totals for summary
  const totalQuantity = groupedStock.reduce((sum, group) => sum + group.totalQuantity, 0);
  const totalProducts = groupedStock.reduce((sum, group) => sum + group.products.length, 0);
  const totalAmount = groupedStock.reduce((sum, group) => sum + group.totalAmount, 0);

  // Export to Excel function
  const exportToExcel = () => {
    const formattedData = groupedStock.map((group, index) => ({
      "S.No": index + 1,
      "Date": group.date,
      "Vendor": group.vendor,
      "Products": group.products.map(p => `${p.name} (Qty: ${p.quantity} × ₹${p.rate})`).join(", "),
      "Total Quantity": group.totalQuantity,
      "Total Amount": group.totalAmount
    }));

    // Add summary row at the end
    formattedData.push({
      "S.No": "",
      "Date": "TOTAL",
      "Vendor": "",
      "Products": `${totalProducts} products`,
      "Total Quantity": totalQuantity,
      "Total Amount": totalAmount
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock History");
    XLSX.writeFile(workbook, "Stock_History_Report.xlsx");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">
          Stock History (Purchase)
        </h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 font-medium">Total Quantity</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{totalQuantity}</div>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <div className="text-indigo-600 font-bold text-lg">Q</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 font-medium">Total Products</div>
                <div className="text-2xl font-bold text-purple-600 mt-1">{totalProducts}</div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="text-purple-600 font-bold text-lg">P</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 font-medium">Total Amount</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">₹{totalAmount.toLocaleString()}</div>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <div className="text-emerald-600 font-bold text-lg">₹</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Vendor:</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">All Vendors</option>
              <option value="vendor1">Vendor 1</option>
              <option value="vendor2">Vendor 2</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">From Date:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">To Date:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => {
              setCategoryFilter("");
              setVendorFilter("");
              setFromDate("");
              setToDate("");
            }}
            className="bg-gray-200 px-3 py-2 rounded-lg text-sm"
          >
            Reset All Filters
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="px-6 py-4">S.No</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Vendor</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4 text-center">Total Qty</th>
              <th className="px-6 py-4 text-right">Total Amount</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {groupedStock.map((group, index) => {
              return (
                <tr key={group.key} className="hover:bg-slate-50">
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4">{group.date}</td>
                  <td className="px-6 py-4 font-semibold">{group.vendor}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {group.products.map((product, pIndex) => (
                        <div key={pIndex} className="flex items-center gap-2">
                          {product.image && (() => {
                            let img = null;
                            try {
                              const imgs = JSON.parse(product.image);
                              img = imgs.length > 0 ? imgs[0] : null;
                            } catch {
                              img = null;
                            }
                            return img ? (
                              <img
                                src={`${API}/uploads/products/${img}`}
                                alt="product"
                                className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage(`${API}/uploads/products/${img}`)}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-slate-100 rounded" />
                            );
                          })()}
                          <div>
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-slate-500">
                              Qty: {product.quantity} × ₹{product.rate}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-indigo-600">
                    {group.totalQuantity}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">
                    ₹{group.totalAmount.toLocaleString()}
                  </td>
                </tr>
              );
            })}

            {groupedStock.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  No stock history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= IMAGE POPUP ================= */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors rounded-lg"
            >
              <X className="w-5 h-5" />
              <span className="text-sm font-medium">Close</span>
            </button>
            <img 
              src={selectedImage} 
              alt="Product preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StockHistory;