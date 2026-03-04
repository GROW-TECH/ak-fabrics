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
// 🔹 Create Account
router.post("/", async (req, res) => {
    const { id, name, type, phone, address, gstin, pincode, through, throughGstin, balance } = req.body;
    try {
        await db_1.default.query(`INSERT INTO accounts 
       (id, shop_id, name, type, phone, address, gstin, pincode, through, through_gstin, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.shop.shop_id, // 🔥 MULTI TENANT
            name,
            type,
            phone,
            address,
            gstin,
            pincode,
            through,
            throughGstin,
            balance
        ]);
        res.json({ message: "Account created" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create account" });
    }
});
// 🔹 Get All Accounts
router.get("/", async (req, res) => {
    try {
        const [rows] = await db_1.default.query("SELECT * FROM accounts WHERE shop_id = ?", [req.shop.shop_id]);
        res.json(rows);
    }
    catch {
        res.status(500).json({ error: "Failed to fetch accounts" });
    }
});
// 🔹 Update Account
router.put("/:id", async (req, res) => {
    const { name, type, phone, address, gstin, pincode, through, throughGstin, balance } = req.body;
    try {
        await db_1.default.query(`UPDATE accounts SET
        name = ?,
        type = ?,
        phone = ?,
        address = ?,
        gstin = ?,
        pincode = ?,
        through = ?,
        through_gstin = ?,
        balance = ?
       WHERE id = ? AND shop_id = ?`, [
            name,
            type,
            phone,
            address,
            gstin,
            pincode,
            through,
            throughGstin,
            balance,
            req.params.id,
            req.shop.shop_id
        ]);
        res.json({ message: "Account updated" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update account" });
    }
});
// 🔹 Delete Account
router.delete("/:id", async (req, res) => {
    try {
        await db_1.default.query("DELETE FROM accounts WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        res.json({ message: "Account deleted" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete account" });
    }
});
exports.default = router;
