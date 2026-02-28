import React, { useEffect, useState } from "react";
import { Package, History } from "lucide-react";
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


    useEffect(() => {
        fetchProducts();
        fetchHistory();
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
            console.log("categories : ", data);
            setCategories(data);
        }
    };


    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || "—";
    };

    const fetchProducts = async () => {
        const res = await fetch(`${API}/api/products`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            setProducts(data);
        }
    };

    const fetchHistory = async () => {
        const res = await fetch(`${API}/api/stock-history`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            setHistory(data);
        }
    };


    const filteredProducts = products.filter((p) => {

        // Product dropdown filter
        if (productFilter && p.id !== productFilter)
            return false;

        // Category dropdown filter
        if (categoryFilter && p.categoryId !== categoryFilter)
            return false;

        if (minPrice && p.price < Number(minPrice)) return false;
        if (maxPrice && p.price > Number(maxPrice)) return false;

        if (minQty && p.stock < Number(minQty)) return false;
        if (maxQty && p.stock > Number(maxQty)) return false;

        if (fromDate && new Date(p.created_at) < new Date(fromDate))
            return false;

        if (toDate && new Date(p.created_at) > new Date(toDate))
            return false;

        return true;
    });




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

        if (vendorFilter && !row.vendor_name.toLowerCase().includes(vendorFilter.toLowerCase()))
            return false;

        if (fromDate && new Date(row.created_at) < new Date(fromDate))
            return false;

        if (toDate && new Date(row.created_at) > new Date(toDate))
            return false;

        return true;
    });

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
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Vendor */}
                <input
                    type="text"
                    placeholder="Vendor Name"
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                />

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

                {/* Price Range */}
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

                {/* Quantity */}
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
                        setProductFilter("");
                        setCategoryFilter("");
                        setVendorFilter("");
                        setFromDate("");
                        setToDate("");
                        setMinPrice("");
                        setMaxPrice("");
                        setMinQty("");
                        setMaxQty("");
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
                                                    className="w-12 h-12 object-cover rounded-lg"
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

                                        <td className="px-6 py-4 font-semibold">
                                            {row.product_name}
                                        </td>

                                        <td className="px-6 py-4 text-center font-bold text-indigo-600">
                                            {row.quantity}
                                        </td>

                                        <td className="px-6 py-4">
                                            {row.vendor_name}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            ₹{Number(row.rate).toLocaleString()}
                                        </td>

                                        <td className="px-6 py-4">
                                            {new Date(row.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default StockReport;