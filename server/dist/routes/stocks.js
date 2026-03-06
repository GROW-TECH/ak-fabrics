"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post("/", async (req, res) => {
    try {
        const { product_id, type, quantity, reference_id, note } = req.body;
        if (!product_id || !type || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const qty = Number(quantity);
        if (qty <= 0) {
            return res.status(400).json({ error: "Quantity must be greater than 0" });
        }
        if (!["PURCHASE", "RETURN", "DEFECT"].includes(type)) {
            return res.status(400).json({ error: "Invalid stock type" });
        }
        // 🔹 Calculate stock change
        let stockChange = 0;
        if (type === "PURCHASE")
            stockChange = qty;
        if (type === "RETURN")
            stockChange = -qty;
        if (type === "DEFECT")
            stockChange = -qty;
        // 🔹 Prevent negative stock
        const [productRows] = await db_1.default.query(`SELECT stock FROM products WHERE id = ? AND shop_id = ?`, [product_id, req.shop.shop_id]);
        if (productRows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        const currentStock = Number(productRows[0].stock);
        const newStock = currentStock + stockChange;
        if (newStock < 0) {
            return res.status(400).json({
                error: "Insufficient stock. Cannot go negative."
            });
        }
        // 1️⃣ Insert stock transaction
        await db_1.default.query(`INSERT INTO stock_transactions
       (product_id, shop_id, type, quantity, reference_id, note)
       VALUES (?, ?, ?, ?, ?, ?)`, [
            product_id,
            req.shop.shop_id,
            type,
            qty,
            reference_id || null,
            note || null
        ]);
        // 2️⃣ Update product stock
        await db_1.default.query(`UPDATE products
       SET stock = ?
       WHERE id = ? AND shop_id = ?`, [newStock, product_id, req.shop.shop_id]);
        res.status(201).json({
            message: "Stock updated successfully",
            newStock
        });
    }
    catch (error) {
        console.error("STOCK TRANSACTION ERROR:", error);
        res.status(500).json({
            error: "Failed to update stock",
            details: error.message
        });
    }
});
/* ===========================
   GET STOCK HISTORY
=========================== */
router.get("/:product_id", async (req, res) => {
    try {
        const { product_id } = req.params;
        const [rows] = await db_1.default.query(`SELECT id, type, quantity, reference_id, note, created_at
       FROM stock_transactions
       WHERE product_id = ? AND shop_id = ?
       ORDER BY created_at DESC`, [product_id, req.shop.shop_id]);
        res.json(rows);
    }
    catch (error) {
        console.error("GET STOCK HISTORY ERROR:", error);
        res.status(500).json({ error: "Failed to fetch stock history" });
    }
});
exports.default = router;
