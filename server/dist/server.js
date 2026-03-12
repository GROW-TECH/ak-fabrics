"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const categories_1 = __importDefault(require("./routes/categories"));
const products_1 = __importDefault(require("./routes/products"));
const subCategories_1 = __importDefault(require("./routes/subCategories"));
const stocks_1 = __importDefault(require("./routes/stocks"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const purchase_1 = __importDefault(require("./routes/purchase"));
const stockHistory_1 = __importDefault(require("./routes/stockHistory"));
const sales_1 = __importDefault(require("./routes/sales")); // ✅ NEW
const dashboard_1 = __importDefault(require("./routes/dashboard")); // ✅ NEW
const image_scan_1 = __importDefault(require("./routes/image-scan")); // ✅ NEW
const transfers_1 = __importDefault(require("./routes/transfers"));
const banks_1 = __importDefault(require("./routes/banks")); // ✅ NEW
const bank_transactions_1 = __importDefault(require("./routes/bank-transactions")); // ✅ NEW
const eway_bills_1 = __importDefault(require("./routes/eway-bills")); // ✅ NEW
const setup_banks_1 = __importDefault(require("./routes/setup-banks")); // ✅ NEW
const sales_returns_1 = __importDefault(require("./routes/sales-returns"));
const stock_transfers_1 = __importDefault(require("./routes/stock-transfers")); // ✅ NEW
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// app.use(cors());
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
app.use("/uploads/sales-invoices", express_1.default.static(path_1.default.join(__dirname, "uploads/sales-invoices")));
app.use("/uploads/purchase-invoices", express_1.default.static(path_1.default.join(__dirname, "uploads/purchase-invoices")));
app.use("/api/auth", auth_1.default);
app.use("/api/categories", categories_1.default);
app.use("/api/products", products_1.default);
app.use("/api/subcategories", subCategories_1.default);
app.use("/api/stock", stocks_1.default);
app.use("/api/accounts", accounts_1.default);
app.use("/api/purchases", purchase_1.default);
app.use("/api/stock-history", stockHistory_1.default);
app.use("/api/sales", sales_1.default); // ✅ NEW
app.use("/api/dashboard", dashboard_1.default); // ✅ NEW
app.use("/api", image_scan_1.default); // ✅ NEW (image scan routes)
app.use("/api/transfers", transfers_1.default);
app.use("/api/banks", banks_1.default); // ✅ NEW
app.use("/api/bank-transactions", bank_transactions_1.default); // ✅ NEW
app.use("/api/eway-bills", eway_bills_1.default); // ✅ NEW
app.use("/api/setup", setup_banks_1.default); // ✅ NEW
app.use("/api/sales-returns", sales_returns_1.default); // ✅ NEW
app.use("/api/stock-transfers", stock_transfers_1.default); // ✅ NEW
app.get("/", (req, res) => {
    res.send("AK Fabrics Backend Running 🚀");
});
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
