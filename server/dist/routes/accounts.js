"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const pdfkit_1 = __importDefault(require("pdfkit"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ─── Create Account ───────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    const { name, type, phone, address, gstin, pincode, through, throughGstin, balance, } = req.body;
    // ✅ Input validation
    if (!name || !type) {
        return res.status(400).json({ error: "name and type are required" });
    }
    // ✅ Server-generated ID (never trust client)
    const id = (0, uuid_1.v4)();
    // ✅ Parse balance safely
    const parsedBalance = parseFloat(balance) || 0;
    const conn = await db_1.default.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(`INSERT INTO accounts 
         (id, shop_id, name, type, phone, address, gstin, pincode, through, through_gstin, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.shop.shop_id,
            name,
            type,
            phone || null,
            address || null,
            gstin || null,
            pincode || null,
            through || null,
            throughGstin || null,
            parsedBalance,
        ]);
        await conn.commit();
        res.status(201).json({ message: "Account created", id });
    }
    catch (err) {
        await conn.rollback();
        console.error("Create account error:", err);
        res.status(500).json({ error: "Failed to create account" });
    }
    finally {
        conn.release();
    }
});
// ─── Get All Accounts ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const [rows] = await db_1.default.query("SELECT * FROM accounts WHERE shop_id = ? ORDER BY name ASC", [req.shop.shop_id]);
        res.json(rows);
    }
    catch (err) {
        console.error("Fetch accounts error:", err);
        res.status(500).json({ error: "Failed to fetch accounts" });
    }
});
// ─── Update Account ───────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
    const { name, type, phone, address, gstin, pincode, through, throughGstin, balance, } = req.body;
    // ✅ Input validation
    if (!name || !type) {
        return res.status(400).json({ error: "name and type are required" });
    }
    // ✅ Parse balance safely
    const parsedBalance = parseFloat(balance) || 0;
    const conn = await db_1.default.getConnection();
    try {
        await conn.beginTransaction();
        // ✅ Verify account belongs to this shop before updating
        const [existing] = await conn.query("SELECT id FROM accounts WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        if (!existing.length) {
            await conn.rollback();
            return res.status(404).json({ error: "Account not found" });
        }
        await conn.query(`UPDATE accounts SET
         name        = ?,
         type        = ?,
         phone       = ?,
         address     = ?,
         gstin       = ?,
         pincode     = ?,
         through     = ?,
         through_gstin = ?,
         balance     = ?
       WHERE id = ? AND shop_id = ?`, [
            name,
            type,
            phone || null,
            address || null,
            gstin || null,
            pincode || null,
            through || null,
            throughGstin || null,
            parsedBalance,
            req.params.id,
            req.shop.shop_id,
        ]);
        await conn.commit();
        res.json({ message: "Account updated" });
    }
    catch (err) {
        await conn.rollback();
        console.error("Update account error:", err);
        res.status(500).json({ error: "Failed to update account" });
    }
    finally {
        conn.release();
    }
});
// ─── Delete Account ───────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    const conn = await db_1.default.getConnection();
    try {
        await conn.beginTransaction();
        // ✅ Verify account belongs to this shop
        const [existing] = await conn.query("SELECT id FROM accounts WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        if (!existing.length) {
            await conn.rollback();
            return res.status(404).json({ error: "Account not found" });
        }
        // ✅ Block delete if linked to sales
        const [linkedSales] = await conn.query("SELECT COUNT(*) as cnt FROM sales WHERE customer_id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        if (linkedSales[0].cnt > 0) {
            await conn.rollback();
            return res.status(400).json({
                error: "Cannot delete account with existing sales transactions",
            });
        }
        // ✅ Block delete if linked to purchases
        const [linkedPurchases] = await conn.query("SELECT COUNT(*) as cnt FROM purchases WHERE vendor_id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        if (linkedPurchases[0].cnt > 0) {
            await conn.rollback();
            return res.status(400).json({
                error: "Cannot delete account with existing purchase transactions",
            });
        }
        await conn.query("DELETE FROM accounts WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        await conn.commit();
        res.json({ message: "Account deleted" });
    }
    catch (err) {
        await conn.rollback();
        console.error("Delete account error:", err);
        res.status(500).json({ error: "Failed to delete account" });
    }
    finally {
        conn.release();
    }
});
// ─── Payment Reminder PDF ─────────────────────────────────────────────────────
router.get("/:id/reminder-pdf", async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ Whitelist module values
        const moduleQ = String(req.query.module || "sales").toLowerCase();
        const isPurchase = moduleQ === "purchases";
        const table = isPurchase ? "purchases" : "sales";
        const partyCol = isPurchase ? "vendor_id" : "customer_id";
        const moduleLabel = isPurchase ? "Purchase" : "Sales";
        // ✅ Verify account exists and belongs to shop
        const [accRows] = await db_1.default.query("SELECT id, name, phone, balance FROM accounts WHERE id = ? AND shop_id = ?", [id, req.shop.shop_id]);
        if (!accRows.length) {
            return res.status(404).json({ error: "Account not found" });
        }
        const acc = accRows[0];
        const [rows] = await db_1.default.query(`SELECT created_at, total_amount, paid_amount, balance_amount
       FROM ${table}
       WHERE ${partyCol} = ? AND shop_id = ?
       ORDER BY created_at DESC
       LIMIT 8`, [id, req.shop.shop_id]);
        const totalReceived = rows.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
        const totalPaid = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
        const balance = Number(acc.balance || 0);
        const balanceText = balance < 0
            ? `${Math.abs(balance).toLocaleString("en-IN")} Due`
            : balance > 0
                ? `${Math.abs(balance).toLocaleString("en-IN")} Advance`
                : "0";
        const doc = new pdfkit_1.default({ size: "A4", margin: 40 });
        const safeName = String(acc.name || "party").replace(/[^a-zA-Z0-9-_]/g, "_");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}-payment-reminder.pdf"`);
        doc.pipe(res);
        // Header
        doc.fontSize(8).text(new Date().toLocaleDateString("en-GB"), { align: "right" });
        doc.moveDown(0.5);
        doc.fontSize(9).text("Ledger", { align: "center" });
        doc.font("Helvetica-Bold").fontSize(14).text(acc.name || "Party", { align: "center" });
        doc.font("Helvetica").fontSize(9).text(new Date().toLocaleDateString("en-GB"), { align: "center" });
        doc.moveDown(1);
        // Table
        const startX = 45;
        const rowH = 22;
        const headers = ["#", "Date", "Notes", "Received", "Paid", "Balance"];
        const widths = [22, 80, 145, 75, 65, 70];
        let y = doc.y;
        // Table header row
        let x = startX;
        headers.forEach((h, idx) => {
            doc.rect(x, y, widths[idx], rowH).stroke("#999999");
            doc
                .font("Helvetica-Bold")
                .fontSize(8)
                .text(h, x + 4, y + 7, { width: widths[idx] - 8, align: "center" });
            x += widths[idx];
        });
        y += rowH;
        // ✅ Guard: no transactions
        if (!rows.length) {
            doc
                .font("Helvetica")
                .fontSize(9)
                .text("No transactions found.", startX, y + 8);
            y += 30;
        }
        else {
            rows.forEach((r, i) => {
                const rowVals = [
                    String(i + 1),
                    new Date(r.created_at).toLocaleDateString("en-GB"),
                    moduleLabel,
                    Number(r.paid_amount || 0).toLocaleString("en-IN"),
                    Number(r.total_amount || 0).toLocaleString("en-IN"),
                    Math.abs(Number(r.balance_amount ??
                        Number(r.total_amount || 0) - Number(r.paid_amount || 0))).toLocaleString("en-IN"),
                ];
                let rx = startX;
                rowVals.forEach((val, idx) => {
                    doc.rect(rx, y, widths[idx], rowH).stroke("#bbbbbb");
                    doc
                        .font("Helvetica")
                        .fontSize(8)
                        .text(val, rx + 4, y + 7, {
                        width: widths[idx] - 8,
                        align: idx === 2 ? "left" : "center",
                    });
                    rx += widths[idx];
                });
                y += rowH;
            });
        }
        // Totals
        y += 8;
        doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(`Total Received: ${totalReceived.toLocaleString("en-IN")}`, startX + 180, y);
        y += 14;
        doc.text(`Total Paid: ${totalPaid.toLocaleString("en-IN")}`, startX + 180, y);
        y += 14;
        doc.text(`Balance: ${balanceText}`, startX + 180, y);
        // Footer note
        y += 26;
        doc.font("Helvetica").fontSize(9).text(`${new Date().toLocaleDateString("en-GB")}\nBalance: ${balanceText}\nI will pay as soon as possible.\nThank You.`, startX, y);
        doc.end();
    }
    catch (err) {
        console.error("Reminder PDF error:", err);
        res.status(500).json({ error: "Failed to generate reminder PDF", details: err.message });
    }
});
exports.default = router;
