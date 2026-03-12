"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const ensureTransfersTable = async () => {
    await db_1.default.query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id VARCHAR(64) PRIMARY KEY,
      shop_id VARCHAR(64) NOT NULL,
      module VARCHAR(20) NOT NULL DEFAULT 'general',
      paid_account_id VARCHAR(64) NOT NULL,
      received_account_id VARCHAR(64) NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      transfer_date DATE NOT NULL,
      transfer_time VARCHAR(8) NULL,
      note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_transfers_shop_created (shop_id, created_at),
      INDEX idx_transfers_shop_module (shop_id, module)
    )
  `);
};
router.get("/", async (req, res) => {
    try {
        await ensureTransfersTable();
        const moduleFilter = String(req.query.module || "").trim().toLowerCase();
        const params = [req.shop.shop_id];
        let sql = `
      SELECT
        t.id,
        t.shop_id,
        t.module,
        t.paid_account_id,
        t.received_account_id,
        t.amount,
        t.transfer_date,
        t.transfer_time,
        t.note,
        t.created_at,
        p.name AS paid_account_name,
        r.name AS received_account_name
      FROM transfers t
      LEFT JOIN accounts p ON p.id = t.paid_account_id AND p.shop_id = t.shop_id
      LEFT JOIN accounts r ON r.id = t.received_account_id AND r.shop_id = t.shop_id
      WHERE t.shop_id = ?
    `;
        if (moduleFilter && ["sales", "purchases", "general"].includes(moduleFilter)) {
            sql += ` AND t.module = ?`;
            params.push(moduleFilter);
        }
        sql += ` ORDER BY t.created_at DESC`;
        const [rows] = await db_1.default.query(sql, params);
        res.json(rows);
    }
    catch (error) {
        console.error("List transfers error:", error);
        res.status(500).json({ error: "Failed to fetch transfers", details: error.message });
    }
});
router.post("/", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        await ensureTransfersTable();
        const { module = "general", paid_account_id, received_account_id, amount, transfer_date, transfer_time = null, note = null, } = req.body || {};
        const normalizedModule = String(module || "general").toLowerCase();
        const safeModule = ["sales", "purchases", "general"].includes(normalizedModule) ? normalizedModule : "general";
        const numericAmount = Number(amount || 0);
        if (!paid_account_id || !received_account_id) {
            await conn.rollback();
            return res.status(400).json({ error: "paid_account_id and received_account_id are required" });
        }
        if (paid_account_id === received_account_id) {
            await conn.rollback();
            return res.status(400).json({ error: "Paid and received accounts must be different" });
        }
        if (!(numericAmount > 0)) {
            await conn.rollback();
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }
        const id = (0, uuid_1.v4)();
        await conn.query(`INSERT INTO transfers
         (id, shop_id, module, paid_account_id, received_account_id, amount, transfer_date, transfer_time, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.shop.shop_id,
            safeModule,
            paid_account_id,
            received_account_id,
            numericAmount,
            transfer_date || new Date().toISOString().slice(0, 10),
            transfer_time,
            note,
        ]);
        // Keep party balances in sync with transfer adjustments.
        await conn.query(`UPDATE accounts SET balance = COALESCE(balance, 0) - ? WHERE id = ? AND shop_id = ?`, [numericAmount, paid_account_id, req.shop.shop_id]);
        await conn.query(`UPDATE accounts SET balance = COALESCE(balance, 0) + ? WHERE id = ? AND shop_id = ?`, [numericAmount, received_account_id, req.shop.shop_id]);
        const [rows] = await conn.query(`SELECT
         t.id, t.shop_id, t.module, t.paid_account_id, t.received_account_id, t.amount,
         t.transfer_date, t.transfer_time, t.note, t.created_at,
         p.name AS paid_account_name, r.name AS received_account_name
       FROM transfers t
       LEFT JOIN accounts p ON p.id = t.paid_account_id AND p.shop_id = t.shop_id
       LEFT JOIN accounts r ON r.id = t.received_account_id AND r.shop_id = t.shop_id
       WHERE t.id = ? AND t.shop_id = ?`, [id, req.shop.shop_id]);
        await conn.commit();
        res.status(201).json(rows[0] || { id });
    }
    catch (error) {
        await conn.rollback();
        console.error("Create transfer error:", error);
        res.status(500).json({ error: "Failed to create transfer", details: error.message });
    }
    finally {
        conn.release();
    }
});
router.delete("/:id", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        await ensureTransfersTable();
        const { id } = req.params;
        const [rows] = await conn.query(`SELECT paid_account_id, received_account_id, amount
       FROM transfers WHERE id = ? AND shop_id = ?`, [id, req.shop.shop_id]);
        if (!rows.length) {
            await conn.rollback();
            return res.status(404).json({ error: "Transfer not found" });
        }
        const t = rows[0];
        const amount = Number(t.amount || 0);
        // Revert balance impact before deleting.
        await conn.query(`UPDATE accounts SET balance = COALESCE(balance, 0) + ? WHERE id = ? AND shop_id = ?`, [amount, t.paid_account_id, req.shop.shop_id]);
        await conn.query(`UPDATE accounts SET balance = COALESCE(balance, 0) - ? WHERE id = ? AND shop_id = ?`, [amount, t.received_account_id, req.shop.shop_id]);
        await conn.query(`DELETE FROM transfers WHERE id = ? AND shop_id = ?`, [id, req.shop.shop_id]);
        await conn.commit();
        res.json({ message: "Transfer deleted" });
    }
    catch (error) {
        await conn.rollback();
        console.error("Delete transfer error:", error);
        res.status(500).json({ error: "Failed to delete transfer", details: error.message });
    }
    finally {
        conn.release();
    }
});
exports.default = router;
