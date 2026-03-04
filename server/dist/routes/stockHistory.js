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
router.get("/", async (req, res) => {
    try {
        const [rows] = await db_1.default.query(`
      SELECT 
        pi.id,
        pr.name AS product_name,
        pr.images,
        pi.quantity,
        pi.rate,
        a.name AS vendor_name,
        pu.created_at
      FROM purchase_items pi
      JOIN purchases pu ON pu.id = pi.purchase_id
      JOIN products pr ON pr.id = pi.product_id
      JOIN accounts a ON a.id = pu.vendor_id
      WHERE pu.shop_id = ?
      ORDER BY pu.created_at DESC
      `, [req.shop.shop_id]);
        res.json(rows);
    }
    catch (error) {
        console.error("Stock history error:", error);
        res.status(500).json({ error: "Failed to fetch stock history" });
    }
});
exports.default = router;
