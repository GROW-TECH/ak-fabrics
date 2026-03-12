import React, { useEffect, useState } from "react";
import { Package, ArrowRight, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

const API = import.meta.env.VITE_API_URL;

const StockReport = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    const [productFilter, setProductFilter] = useState("");
    const [vendorFilter, setVendorFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [minQty, setMinQty] = useState("");
    const [maxQty, setMaxQty] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState<any[]>([]);

    // Shift Modal State
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [shiftQuantity, setShiftQuantity] = useState("");
    const [shiftColors, setShiftColors] = useState<{ color: string; available: number; qty: number }[]>([]);
    const [shiftError, setShiftError] = useState("");
    const [shiftSuccess, setShiftSuccess] = useState("");

    useEffect(() => {
        fetchProducts();
        fetchHistory();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const res = await fetch(`${API}/api/categories`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
            const data = await res.json();
            setCategories(data);
        }
    };

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || "—";
    };

    const fetchProducts = async () => {
        const res = await fetch(`${API}/api/products`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
            const data = await res.json();
            setProducts(data);
        }
    };

    const fetchHistory = async () => {
        const res = await fetch(`${API}/api/stock-history`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
            const data = await res.json();
            setHistory(data);
        }
    };

    // ---- Shift to Erode ----
    const handleShiftClick = (product: any) => {
        console.log('Shift clicked for product:', product);
        setSelectedProduct(product);
        setShiftQuantity("");
                                const colorItems = (() => {
                                  const cs = (product as any).color_stock;
                                  if (Array.isArray(cs)) return cs;
                                  try { return JSON.parse(cs || "[]"); } catch { return []; }
                                })();
        const colors = (colorItems.length ? colorItems : (product.color || "").split(",").map((c: string) => ({ color: c.trim(), qty: null })))
          .filter((c: any) => c.color)
          .map((c: any) => ({ color: c.color, available: Number(c.qty) || Number(product.stock) || 0, qty: 0 }));
        setShiftColors(colors);
        setShiftError("");
        setShiftSuccess("");
        setShowShiftModal(true);
    };

    const handleShiftConfirm = async () => {
        console.log('Shift confirm clicked', { selectedProduct, shiftQuantity, shiftColors });
        
        const totalFromColors = shiftColors.length ? shiftColors.reduce((s, c) => s + (Number(c.qty) || 0), 0) : Number(shiftQuantity) || 0;
        const availableByColors = shiftColors.length ? shiftColors.every(c => (Number(c.qty) || 0) <= (Number(c.available) || 0)) : true;

        if (shiftColors.length && totalFromColors <= 0) {
            setShiftError("Enter quantity for at least one color.");
            return;
        }
        if (!shiftColors.length && (!shiftQuantity || Number(shiftQuantity) <= 0)) {
            setShiftError("Please enter a valid quantity.");
            return;
        }
        const totalToShift = totalFromColors;
        if (totalToShift > selectedProduct.stock) {
            setShiftError("Cannot shift more than available stock.");
            return;
        }
        if (!availableByColors) {
            setShiftError("Color-wise qty exceeds available.");
            return;
        }

        try {
            console.log('Making API call to:', `${API}/api/stock-transfers`);
            
            const res = await fetch(`${API}/api/stock-transfers`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    quantity: totalToShift,
                    color_transfers: shiftColors.length ? shiftColors : undefined,
                    from_location: "MAIN",
                    to_location: "ERODE",
                    notes: `Stock shift to Erode${shiftColors.length ? ' ' + JSON.stringify(shiftColors) : ''}`
                })
            });

            console.log('API response status:', res.status);
            
            if (res.ok) {
                setShiftSuccess(`Successfully shifted ${totalToShift} units to Erode.`);
                setShiftQuantity("");
                setShiftColors([]);
                fetchProducts();
                setTimeout(() => {
                    setShowShiftModal(false);
                    setSelectedProduct(null);
                    setShiftSuccess("");
                }, 1500);
            } else {
                const result = await res.json();
                console.error('API error response:', result);
                setShiftError(result.error || "Failed to shift stock.");
            }
        } catch (error) {
            console.error('Shift error:', error);
            setShiftError("Network error. Please try again.");
        }
    };

    // ---- Filters ----
    const filteredProducts = products.filter((p) => {
        if (productFilter && p.id !== productFilter) return false;
        if (categoryFilter && p.categoryId !== categoryFilter) return false;
        if (minPrice && p.price < Number(minPrice)) return false;
        if (maxPrice && p.price > Number(maxPrice)) return false;
        if (minQty && p.stock < Number(minQty)) return false;
        if (maxQty && p.stock > Number(maxQty)) return false;
        if (fromDate && new Date(p.created_at) < new Date(fromDate)) return false;
        if (toDate && new Date(p.created_at) > new Date(toDate)) return false;
        return true;
    });

    const filteredHistory = history.filter((row) => {
        if (productFilter && !row.product_name.toLowerCase().includes(productFilter.toLowerCase())) return false;
        if (vendorFilter && !row.vendor_name.toLowerCase().includes(vendorFilter.toLowerCase())) return false;
        if (fromDate && new Date(row.created_at) < new Date(fromDate)) return false;
        if (toDate && new Date(row.created_at) > new Date(toDate)) return false;
        return true;
    });

    // ---- Exports ----
    const exportCurrentStock = () => {
        const formattedData = products.map((p, index) => ({
            "Color Stock": (() => {
                const cs: any = (p as any).color_stock;
                const list = Array.isArray(cs) ? cs : (() => { try { return JSON.parse(cs || "[]"); } catch { return []; } })();
                if (list.length) return list.map((c: any) => `${c.color}:${c.qty ?? 0}`).join(" | ");
                return p.color || "";
            })(),
            "S.No": index + 1,
            "Date": new Date(p.created_at).toLocaleDateString(),
            "Product Name": p.name,
            "Category": p.categoryId,
            "Default Price": p.price,
            "Qty": p.stock,
            "Erode Stock": p.erode_stock || 0,
            "Stock Value": p.stock * p.price,
            "Status": p.isActive ? "Active" : "Inactive"
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Current Stock");
        XLSX.writeFile(workbook, "Current_Stock_Report.xlsx");
    };

    const exportStockHistory = () => {
        const formattedData = history.map((row, index) => ({
            "S.No": index + 1,
            "Product Name": row.product_name,
            "Quantity": row.quantity,
            "Vendor": row.vendor_name,
            "Price": row.rate,
            "Date": new Date(row.created_at).toLocaleDateString()
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Stock History");
        XLSX.writeFile(workbook, "Stock_History_Report.xlsx");
    };

    return (
        <div className="space-y-10">

            {/* ================= FILTER BAR ================= */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Products</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Vendor Name"
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <input
                    type="number"
                    placeholder="Min Qty"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <input
                    type="number"
                    placeholder="Max Qty"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <button
                    onClick={() => {
                        setProductFilter(""); setCategoryFilter(""); setVendorFilter("");
                        setFromDate(""); setToDate(""); setMinPrice("");
                        setMaxPrice(""); setMinQty(""); setMaxQty("");
                    }}
                    className="bg-gray-200 px-3 py-2 rounded-lg text-sm"
                >
                    Reset
                </button>
            </div>

            {/* ================= CURRENT STOCK ================= */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Current Stock</h2>
                    <button
                        onClick={exportCurrentStock}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
                    >
                        Download Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <th className="px-4 py-4">S.No</th>
                                <th className="px-4 py-4">Date</th>
                                <th className="px-4 py-4">Product Name</th>
                                <th className="px-4 py-4">Category</th>
                                <th className="px-4 py-4 text-right">Default Price</th>
                                <th className="px-4 py-4 text-center">Main Qty</th>
                                <th className="px-4 py-4 text-center">Erode Qty</th>
                                <th className="px-4 py-4 text-right">Stock Value</th>
                                <th className="px-4 py-4 text-center">Status</th>
                                <th className="px-4 py-4">Image</th>
                                <th className="px-4 py-4 text-center">Shift</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map((product, index) => {
                                const stockValue = Number(product.stock) * Number(product.price);
                                const image = product.images && product.images.length > 0 ? product.images[0] : null;
                                const erodeStock = product.erode_stock || 0;

                                return (
                                    <tr key={product.id}>
                                        <td className="px-4 py-4">{index + 1}</td>
                                        <td className="px-4 py-4">{new Date(product.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-4 font-semibold">
                                          <div>{product.name}</div>
                                          {(() => {
                                            const items = (() => {
                                              const cs = (product as any).color_stock;
                                              if (Array.isArray(cs)) return cs;
                                              try { return JSON.parse(cs || "[]"); } catch { return []; }
                                            })();
                                            const fallback = (product.color || "").split(",").map((c: string) => ({ color: c.trim(), qty: null }));
                                            const colors = items.length ? items : fallback;
                                            return colors.filter((c: any) => c.color).length ? (
                                              <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    {colors.filter((c: any) => c.color).map((c: any) => (
                                                  <span key={c.color} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full border border-slate-200">
                                                    <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: c.color }} />
                                                    {c.color} · {c.qty != null ? c.qty : Number(product.stock) || 0}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : null;
                                          })()}
                                        </td>
                                        <td className="px-4 py-4">{product.category_name || product.categoryId}</td>
                                        <td className="px-4 py-4 text-right">₹{Number(product.price).toLocaleString()}</td>
                                        <td className="px-4 py-4 text-center font-bold text-indigo-600">{product.stock}</td>
                                        <td className="px-4 py-4 text-center font-bold text-emerald-600">{erodeStock}</td>
                                        <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                            ₹{stockValue.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {product.isActive ? (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold">Active</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
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
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => handleShiftClick(product)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                                            >
                                                <ArrowRight className="w-3 h-3" />
                                                Erode
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= STOCK HISTORY ================= */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Stock History</h2>
                    <button
                        onClick={exportStockHistory}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold"
                    >
                        Download Excel
                    </button>
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
                            {filteredHistory.map((row, index) => {
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
                                    <tr key={row.id}>
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
                                        <td className="px-6 py-4 font-semibold">{row.product_name}</td>
                                        <td className="px-6 py-4 text-center font-bold text-indigo-600">{row.quantity}</td>
                                        <td className="px-6 py-4">{row.vendor_name}</td>
                                        <td className="px-6 py-4 text-right">₹{Number(row.rate).toLocaleString()}</td>
                                        <td className="px-6 py-4">{new Date(row.created_at).toLocaleDateString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= SHIFT TO ERODE MODAL ================= */}
            {showShiftModal && selectedProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-indigo-600" />
                            Shift Stock to Erode
                        </h3>
                        {console.log('Modal rendered', { showShiftModal, selectedProduct })}

                        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="font-semibold text-slate-800">{selectedProduct.name}</div>
                            <div className="text-sm text-slate-500 mt-1">
                                Main Stock Available: <span className="font-bold text-indigo-600">{selectedProduct.stock}</span>
                            </div>
                            <div className="text-sm text-slate-500">
                                Current Erode Stock: <span className="font-bold text-emerald-600">{selectedProduct.erode_stock || 0}</span>
                            </div>
                        </div>

                        {shiftError && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {shiftError}
                            </div>
                        )}

                        {shiftSuccess && (
                            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">
                                ✓ {shiftSuccess}
                            </div>
                        )}

                        <div className="mb-5 space-y-3">
                            <label className="block text-sm font-medium text-slate-700">
                                Quantity to Shift
                            </label>
                            {shiftColors.length ? (
                              <div className="space-y-2">
                                {shiftColors.map((c, idx) => (
                                  <div key={c.color} className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: c.color }} />
                                    <span className="text-sm text-slate-700 flex-1">{c.color} (avail {c.available})</span>
                                    <input
                                      type="number"
                                      value={c.qty}
                                      min={0}
                                      max={c.available}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setShiftColors(prev => prev.map((x, i) => i === idx ? { ...x, qty: val } : x));
                                        setShiftError("");
                                      }}
                                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-right"
                                    />
                                  </div>
                                ))}
                                <div className="text-xs text-slate-500">Total to shift: {shiftColors.reduce((s,c)=>s+(Number(c.qty)||0),0)}</div>
                              </div>
                            ) : (
                              <input
                                  type="number"
                                  value={shiftQuantity}
                                  onChange={(e) => { setShiftQuantity(e.target.value); setShiftError(""); }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                  placeholder="Enter quantity"
                                  min="1"
                                  max={selectedProduct.stock}
                              />
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowShiftModal(false); setSelectedProduct(null); }}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShiftConfirm}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm"
                            >
                                Shift to Erode
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StockReport;
