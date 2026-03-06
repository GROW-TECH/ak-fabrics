import React, { useEffect, useState } from "react";
import { Package, History, X } from "lucide-react";
import * as XLSX from "xlsx";

const API = import.meta.env.VITE_API_URL;

const StockReport = ({ showOnlyCurrentStock = false }: { showOnlyCurrentStock?: boolean }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [productFilter, setProductFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState<any[]>([]);


    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                await Promise.all([
                    fetchProducts(),
                    fetchHistory(),
                    fetchCategories()
                ]);
            } catch (err) {
                setError("Failed to load stock data");
                console.error("Error loading stock data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);


    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API}/api/categories`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                console.log("categories : ", data);
                // Handle different response formats
                if (data.success && data.data) {
                    setCategories(data.data);
                } else if (Array.isArray(data)) {
                    setCategories(data);
                } else {
                    console.error("Unexpected categories format:", data);
                    setCategories([]);
                }
            } else {
                console.error("Failed to fetch categories");
                setCategories([]);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            setCategories([]);
        }
    };


    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || "—";
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API}/api/products`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                // Handle different response formats
                if (data.success && data.data) {
                    setProducts(data.data);
                } else if (Array.isArray(data)) {
                    setProducts(data);
                } else {
                    console.error("Unexpected products format:", data);
                    setProducts([]);
                }
            } else {
                console.error("Failed to fetch products");
                setProducts([]);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API}/api/stock-history`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                // Handle different response formats
                if (data.success && data.data) {
                    setHistory(data.data);
                } else if (Array.isArray(data)) {
                    setHistory(data);
                } else {
                    console.error("Unexpected history format:", data);
                    setHistory([]);
                }
            } else {
                console.error("Failed to fetch stock history");
                setHistory([]);
            }
        } catch (error) {
            console.error("Error fetching stock history:", error);
            setHistory([]);
        }
    };


    const filteredProducts = products.filter((p) => {

        // Product dropdown filter
        if (productFilter && p.id !== productFilter)
            return false;

        if (fromDate && new Date(p.created_at) < new Date(fromDate))
            return false;

        if (toDate && new Date(p.created_at) > new Date(toDate))
            return false;

        return true;
    });

    // Calculate totals for summary
    const totalQuantity = filteredProducts.reduce((sum, p) => sum + Number(p.stock), 0);
    const totalProducts = filteredProducts.length;
    const totalDefaultPrice = filteredProducts.reduce((sum, p) => sum + Number(p.price), 0);
    const totalStockValue = filteredProducts.reduce((sum, p) => sum + (Number(p.stock) * Number(p.price)), 0);




    const exportCurrentStock = () => {
        const formattedData = products.map((p, index) => ({
            "S.No": index + 1,
            "Date": new Date(p.created_at).toLocaleDateString(),
            "Product Name": p.name,
            "Category": p.categoryId,
            "Default Price": p.price,
            "Qty": p.stock,
            "Stock Value": p.stock * p.price,
            "Status": p.isActive ? "Active" : "Inactive"
        }));

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Current Stock");

        XLSX.writeFile(workbook, "Current_Stock_Report.xlsx");
    };


    const filteredHistory = history.filter((row) => {

        if (productFilter && !row.product_name.toLowerCase().includes(productFilter.toLowerCase()))
            return false;

        if (fromDate && new Date(row.created_at) < new Date(fromDate))
            return false;

        if (toDate && new Date(row.created_at) > new Date(toDate))
            return false;

        return true;
    });

    // Group stock history by date and vendor
    const groupedHistory = filteredHistory.reduce((acc: any[], row) => {
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

    // Loading and error handling
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading stock data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-red-600 mb-4">
                        <Package className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-lg font-semibold">Error loading stock data</p>
                    </div>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">

            {/* ================= CURRENT STOCK ================= */}

            <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">

                {/* Product */}
                <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Products</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                {/* Date From */}
                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                {/* Date To */}
                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

                <button
                    onClick={() => {
                        setProductFilter("");
                        setFromDate("");
                        setToDate("");
                    }}
                    className="bg-gray-200 px-3 py-2 rounded-lg text-sm"
                >
                    Reset
                </button>

            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">
                        Current Stock
                    </h2>

                    <button
                        onClick={exportCurrentStock}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
                    >
                        Download Excel
                    </button>
                </div>

                {/* Summary Statistics */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    <div className="text-sm text-slate-600 font-medium">Total Default Price</div>
                                    <div className="text-2xl font-bold text-orange-600 mt-1">₹{totalDefaultPrice.toLocaleString()}</div>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <div className="text-orange-600 font-bold text-lg">₹</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-600 font-medium">Total Stock Value</div>
                                    <div className="text-2xl font-bold text-emerald-600 mt-1">₹{totalStockValue.toLocaleString()}</div>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <div className="text-emerald-600 font-bold text-lg">💰</div>
                                </div>
                            </div>
                        </div>
                    </div>
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
                                <th className="px-4 py-4 text-center">Qty</th>
                                <th className="px-4 py-4 text-right">Stock Value</th>
                                <th className="px-4 py-4 text-center">Status</th>
                                <th className="px-4 py-4">Image</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map((product, index) => {
                                const stockValue = Number(product.stock) * Number(product.price);
                                const image =
                                    product.images && product.images.length > 0
                                        ? product.images[0]
                                        : null;

                                return (
                                    <tr key={product.id}>

                                        <td className="px-4 py-4">{index + 1}</td>

                                        <td className="px-4 py-4">
                                            {new Date(product.created_at).toLocaleDateString()}
                                        </td>

                                        <td className="px-4 py-4 font-semibold">
                                            {product.name}
                                        </td>

                                        <td className="px-4 py-4">
                                            {product.category_name || product.categoryId}
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                            ₹{Number(product.price).toLocaleString()}
                                        </td>

                                        <td className="px-4 py-4 text-center font-bold text-indigo-600">
                                            {product.stock}
                                        </td>

                                        <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                            ₹{stockValue.toLocaleString()}
                                        </td>

                                        <td className="px-4 py-4 text-center">
                                            {product.isActive ? (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-4">
                                            {image ? (
                                                <img
                                                    src={`${API}/uploads/products/${image}`}
                                                    alt="product"
                                                    className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => setSelectedImage(`${API}/uploads/products/${image}`)}
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                                            )}
                                        </td>

                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= STOCK HISTORY ================= */}
            {!showOnlyCurrentStock && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">
                        Stock History
                    </h2>

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
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Vendor</th>
                                <th className="px-6 py-4">Products</th>
                                <th className="px-6 py-4 text-center">Total Qty</th>
                                <th className="px-6 py-4 text-right">Total Amount</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {groupedHistory.map((group, index) => {
                                // Get first product image for display
                                let firstImage = null;
                                if (group.products[0]?.image) {
                                    try {
                                        const imgs = JSON.parse(group.products[0].image);
                                        firstImage = imgs.length > 0 ? imgs[0] : null;
                                    } catch {
                                        firstImage = null;
                                    }
                                }

                                return (
                                    <tr key={group.key}>
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
                        </tbody>
                    </table>
                </div>
            </div>
            )}

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

export default StockReport;