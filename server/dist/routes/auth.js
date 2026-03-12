"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const JWT_SECRET = "ak_fabrics_secret_key";
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db_1.default.query("SELECT * FROM shops WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const shop = rows[0];
        if (password !== shop.password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({
            shop_id: shop.id,
            shop_name: shop.name
        }, JWT_SECRET);
        res.json({
            token,
            shop: {
                id: shop.id,
                name: shop.name
            }
        });
    }
    catch {
        res.status(500).json({ error: "Login failed" });
    }
});
// Add a simple registration endpoint for testing
router.post("/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
        // Check if shop already exists
        const [existing] = await db_1.default.query("SELECT * FROM shops WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Shop already exists" });
        }
        // Create new shop
        const id = (0, uuid_1.v4)();
        await db_1.default.query("INSERT INTO shops (id, name, email, password) VALUES (?, ?, ?, ?)", [id, name || email, email, password]);
        const token = jsonwebtoken_1.default.sign({
            shop_id: id,
            shop_name: name || email
        }, JWT_SECRET);
        res.json({
            token,
            shop: {
                id: id,
                name: name || email
            }
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed", details: error.message });
    }
});
exports.default = router;
