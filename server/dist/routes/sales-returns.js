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
// GET all sales returns
router.get("/", async (req, res) => {
    try {
        const { shop_id } = req.shop;
        const [returns] = await db_1.default.execute(`SELECT sr.*, s.invoice_no as original_invoice_no, s.created_at as original_sale_date
       FROM sales_returns sr
       JOIN sales s ON sr.original_sale_id = s.id
       WHERE sr.shop_id = ?
       ORDER BY sr.created_at DESC`, [shop_id]);
        res.json(returns);
    }
    catch (error) {
        console.error("Error fetching sales returns:", error);
        res.status(500).json({ error: "Failed to fetch sales returns" });
    }
});
// GET sales returns for a customer
router.get("/customer/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;
        const { shop_id } = req.shop;
        const [returns] = await db_1.default.execute(`SELECT sr.*, s.invoice_no as original_invoice_no, s.created_at as original_sale_date
       FROM sales_returns sr
       JOIN sales s ON sr.original_sale_id = s.id
       WHERE sr.customer_id = ? AND sr.shop_id = ?
       ORDER BY sr.created_at DESC`, [customerId, shop_id]);
        res.json(returns);
    }
    catch (error) {
        console.error("Error fetching sales returns:", error);
        res.status(500).json({ error: "Failed to fetch sales returns" });
    }
});
// GET sales returns for a specific sale
router.get("/sale/:saleId", async (req, res) => {
    try {
        const { saleId } = req.params;
        const { shop_id } = req.shop;
        const [returns] = await db_1.default.execute(`SELECT sr.*, sri.product_id, sri.quantity, sri.rate, sri.total,
              sri.return_reason as item_return_reason, p.name as product_name
       FROM sales_returns sr
       JOIN sales_return_items sri ON sr.id = sri.return_id
       JOIN products p ON sri.product_id = p.id
       WHERE sr.original_sale_id = ? AND sr.shop_id = ?
       ORDER BY sr.created_at DESC`, [saleId, shop_id]);
        res.json(returns);
    }
    catch (error) {
        console.error("Error fetching sales returns for sale:", error);
        res.status(500).json({ error: "Failed to fetch sales returns" });
    }
});
// GET available items for return from a sale
router.get("/available-items/:saleId", async (req, res) => {
    try {
        const { saleId } = req.params;
        const { shop_id } = req.shop;
        const [saleCheck] = await db_1.default.execute(`SELECT id FROM sales WHERE id = ? AND shop_id = ?`, [saleId, shop_id]);
        if (!Array.isArray(saleCheck) || saleCheck.length === 0) {
            return res.status(404).json({ error: "Sale not found" });
        }
        const [columns] = await db_1.default.query(`SHOW COLUMNS FROM sale_items`);
        const columnNames = columns.map((c) => c.Field);
        let qtyCol = "quantity";
        if (columnNames.includes("qty"))
            qtyCol = "qty";
        else if (columnNames.includes("sale_quantity"))
            qtyCol = "sale_quantity";
        const query = `
      SELECT 
        si.product_id,
        si.${qtyCol} AS sold_quantity,
        si.rate,
        p.name AS product_name,
        p.stock,
        COALESCE(
          (
            SELECT SUM(sri2.quantity)
            FROM sales_return_items sri2
            JOIN sales_returns sr2 ON sri2.return_id = sr2.id
            WHERE sri2.product_id = si.product_id
              AND sr2.original_sale_id = si.sale_id
              AND sr2.return_status = 'PROCESSED'
          ), 0
        ) AS returned_quantity
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `;
        const [items] = await db_1.default.execute(query, [saleId]);
        if (!Array.isArray(items)) {
            return res.status(500).json({ error: "Unexpected DB result" });
        }
        const availableItems = items.map((item) => {
            const sold = Number(item.sold_quantity) || 0;
            const returned = Number(item.returned_quantity) || 0;
            return {
                product_id: item.product_id,
                product_name: item.product_name,
                sold_quantity: sold,
                returned_quantity: returned,
                available_quantity: sold - returned,
                rate: Number(item.rate) || 0,
                stock: Number(item.stock) || 0,
                can_return: sold - returned > 0,
            };
        });
        res.json(availableItems);
    }
    catch (error) {
        console.error("[sales-returns] Error in available-items:", error?.message || error);
        res.status(500).json({
            error: "Failed to fetch available items",
            detail: error?.message || String(error),
        });
    }
});
// POST create new sales return
router.post("/", async (req, res) => {
    try {
        const { original_sale_id, customer_id, items, return_reason, refund_method, notes } = req.body;
        const { shop_id } = req.shop;
        if (!original_sale_id || !customer_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const [sales] = await db_1.default.execute("SELECT * FROM sales WHERE id = ? AND shop_id = ?", [original_sale_id, shop_id]);
        if (!Array.isArray(sales) || sales.length === 0) {
            return res.status(404).json({ error: "Original sale not found" });
        }
        const sale = sales[0];
        const saleCustomerRaw = sale.customer_id ?? sale.account_id ?? sale.party_id ?? sale.client_id ?? null;
        const saleCustomerId = String(saleCustomerRaw || "").trim();
        const sentCustomerId = String(customer_id || "").trim();
        if (saleCustomerRaw !== null && saleCustomerRaw !== undefined && saleCustomerId !== sentCustomerId) {
            return res.status(400).json({
                error: "Sale does not belong to this customer",
                debug: { sale_customer_id: saleCustomerId, sent_customer_id: sentCustomerId },
            });
        }
        const [columns] = await db_1.default.query(`SHOW COLUMNS FROM sale_items`);
        const columnNames = columns.map((c) => c.Field);
        let qtyCol = "quantity";
        if (columnNames.includes("qty"))
            qtyCol = "qty";
        else if (columnNames.includes("sale_quantity"))
            qtyCol = "sale_quantity";
        for (const item of items) {
            if (!item.product_id || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ error: "Invalid item data" });
            }
            const [saleItems] = await db_1.default.execute(`SELECT ${qtyCol} as qty FROM sale_items WHERE sale_id = ? AND product_id = ?`, [original_sale_id, item.product_id]);
            if (!Array.isArray(saleItems) || saleItems.length === 0) {
                return res.status(400).json({ error: `Product ${item.product_id} not found in original sale` });
            }
            const soldQty = Number(saleItems[0].qty);
            const [returnedRows] = await db_1.default.execute(`SELECT COALESCE(SUM(sri.quantity), 0) AS returned_qty
         FROM sales_return_items sri
         JOIN sales_returns sr ON sri.return_id = sr.id
         WHERE sri.product_id = ? AND sr.original_sale_id = ? AND sr.return_status = 'PROCESSED'`, [item.product_id, original_sale_id]);
            const returnedQty = Number(returnedRows[0]?.returned_qty || 0);
            const availableQty = soldQty - returnedQty;
            if (item.quantity > availableQty) {
                return res.status(400).json({
                    error: `Return qty (${item.quantity}) exceeds available qty (${availableQty})`,
                });
            }
        }
        const total_amount = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0);
        const connection = await db_1.default.getConnection();
        await connection.beginTransaction();
        try {
            const returnId = (0, uuid_1.v4)();
            // 1. Create sales_return record
            await connection.execute(`INSERT INTO sales_returns 
          (id, original_sale_id, customer_id, shop_id, return_reason, total_amount, refund_method, notes, return_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PROCESSED')`, [returnId, original_sale_id, customer_id, shop_id, return_reason || null, total_amount, refund_method || "CREDIT", notes || null]);
            for (const item of items) {
                const itemId = (0, uuid_1.v4)();
                const itemTotal = Number(item.quantity) * Number(item.rate);
                // 2. Insert return item
                await connection.execute(`INSERT INTO sales_return_items 
            (id, return_id, product_id, quantity, rate, total, return_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [itemId, returnId, item.product_id, item.quantity, item.rate, itemTotal, item.return_reason || "Customer return"]);
                // 3. Increase stock
                await connection.execute("UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ?", [item.quantity, item.product_id, shop_id]);
                // 4. Stock history — correct schema: id, product_id, shop_id, transaction_type, quantity, reference_id, notes, created_at
                await connection.execute(`INSERT INTO stock_history (id, product_id, shop_id, transaction_type, quantity, reference_id, notes, created_at)
           VALUES (?, ?, ?, 'SALES_RETURN', ?, ?, ?, NOW())`, [(0, uuid_1.v4)(), item.product_id, shop_id, item.quantity, returnId, return_reason || "Sales return"]);
            }
            // 5. Accounting transaction — detect actual columns to avoid mismatch
            try {
                const [txColRows] = await db_1.default.query(`SHOW COLUMNS FROM transactions`);
                const txCols = txColRows.map((c) => c.Field);
                console.log("[sales-returns] transactions columns:", txCols);
                const transactionId = (0, uuid_1.v4)();
                if (txCols.includes("amount") && txCols.includes("taxable_amount") && txCols.includes("tax_amount")) {
                    // Full ledger schema
                    await connection.execute(`INSERT INTO transactions 
              (id, date, type, account_id, amount, taxable_amount, tax_amount, description, reference, shop_id)
             VALUES (?, NOW(), 'SALES_RETURN', ?, ?, ?, 0, ?, ?, ?)`, [transactionId, customer_id, total_amount, total_amount, return_reason || "Sales Return", original_sale_id, shop_id]);
                }
                else if (txCols.includes("taxable_amount") && txCols.includes("tax_amount")) {
                    // No amount column — use taxable_amount only
                    await connection.execute(`INSERT INTO transactions 
              (id, date, type, account_id, taxable_amount, tax_amount, description, reference, shop_id)
             VALUES (?, NOW(), 'SALES_RETURN', ?, ?, 0, ?, ?, ?)`, [transactionId, customer_id, total_amount, return_reason || "Sales Return", original_sale_id, shop_id]);
                }
                else if (txCols.includes("total_amount")) {
                    // Simplified schema
                    await connection.execute(`INSERT INTO transactions 
              (id, date, type, account_id, total_amount, description, reference, shop_id)
             VALUES (?, NOW(), 'SALES_RETURN', ?, ?, ?, ?, ?)`, [transactionId, customer_id, total_amount, return_reason || "Sales Return", original_sale_id, shop_id]);
                }
                else {
                    console.warn("[sales-returns] Cannot match transactions schema. Columns found:", txCols);
                }
            }
            catch (txError) {
                // Non-fatal — return + stock update already succeeded
                console.error("[sales-returns] Transaction insert failed (non-fatal):", txError?.message);
            }
            await connection.commit();
            res.status(201).json({
                message: "Sales return created successfully",
                return_id: returnId,
                total_amount,
            });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error("Error creating sales return:", error?.message || error);
        res.status(500).json({ error: "Failed to create sales return", detail: error?.message });
    }
});
exports.default = router;
