"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// POST /api/bank-transactions - Add manual bank transaction
router.post('/', async (req, res) => {
    const conn = await db_1.default.getConnection();
    try {
        const { bank_id, date, deposit, withdrawal, description, reference_no } = req.body;
        if (!bank_id || !date) {
            await conn.rollback();
            return res.status(400).json({ error: 'bank_id and date are required' });
        }
        if ((!deposit && !withdrawal) || Number(deposit) < 0 || Number(withdrawal) < 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Deposit or withdrawal amount must be positive' });
        }
        const id = `manual-${Date.now()}`;
        // Get current balance for this bank
        const [balanceResult] = await conn.query(`SELECT COALESCE(MAX(CASE WHEN bank_id = ? AND deposit > 0 THEN balance END), 0) as running_balance
       FROM bank_transactions 
       WHERE bank_id = ? AND shop_id = ?`, [bank_id, bank_id, req.shop.shop_id]);
        const currentBalance = Number(balanceResult[0]?.running_balance || 0);
        const newBalance = currentBalance + Number(deposit || 0) - Number(withdrawal || 0);
        await conn.query(`INSERT INTO bank_transactions 
        (id, shop_id, bank_id, date, deposit, withdrawal, balance, description, reference_no, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
            id,
            req.shop.shop_id,
            bank_id,
            date,
            Number(deposit) || 0,
            Number(withdrawal) || 0,
            newBalance,
            description || null,
            reference_no || null
        ]);
        await conn.commit();
        res.status(201).json({
            message: 'Transaction added successfully',
            transaction: {
                id,
                date,
                deposit: Number(deposit) || 0,
                withdrawal: Number(withdrawal) || 0,
                balance: newBalance,
                description,
                reference_no
            }
        });
    }
    catch (error) {
        await conn.rollback();
        console.error('Bank transaction error:', error);
        res.status(500).json({ error: 'Failed to add transaction' });
    }
    finally {
        conn.release();
    }
});
// GET /api/bank-transactions - Get transactions for a specific bank
router.get('/', async (req, res) => {
    const conn = await db_1.default.getConnection();
    try {
        const { bank_id } = req.query;
        let query = `
      SELECT id, date, deposit, withdrawal, balance, description, reference_no, created_at, updated_at
      FROM bank_transactions 
      WHERE shop_id = ?
    `;
        const params = [req.shop.shop_id];
        if (bank_id) {
            query += ` AND bank_id = ?`;
            params.push(bank_id);
        }
        query += ` ORDER BY date ASC`;
        const [rows] = await conn.query(query, params);
        // Calculate running balance
        let runningBalance = 0;
        const transactions = rows.map((tx, index) => {
            runningBalance += Number(tx.deposit || 0) - Number(tx.withdrawal || 0);
            return {
                ...tx,
                balance: runningBalance
            };
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Get bank transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
    finally {
        conn.release();
    }
});
exports.default = router;
