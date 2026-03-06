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
// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
const DEFAULT_GST_RATE = 5;
const deriveStatus = (totalAmount, paidAmount) => {
    if (paidAmount <= 0)
        return "NOT_PAID";
    if (paidAmount >= totalAmount)
        return "PAID";
    return "HALF_PAID";
};
const normalizePincode = (value) => String(value || "").trim();
const stateCodeFromGstin = (gstin) => {
    const cleaned = String(gstin || "").trim();
    const code = cleaned.slice(0, 2);
    return /^\d{2}$/.test(code) ? code : "";
};
const isLikelyInterState = (customerGstin, customerPincode, shopGstin, shopPincode) => {
    const customerStateCode = stateCodeFromGstin(customerGstin);
    const shopStateCode = stateCodeFromGstin(shopGstin);
    if (customerStateCode && shopStateCode) {
        return customerStateCode !== shopStateCode;
    }
    const customerPinPrefix = normalizePincode(customerPincode).slice(0, 2);
    const shopPinPrefix = normalizePincode(shopPincode).slice(0, 2);
    if (customerPinPrefix && shopPinPrefix) {
        return customerPinPrefix !== shopPinPrefix;
    }
    return false;
};
const round2 = (value) => Number((Number(value) || 0).toFixed(2));
const computeTaxBreakdown = ({ totalAmount, gstRate, customerGstin, customerPincode, shopGstin, shopPincode, }) => {
    const taxableAmount = round2(totalAmount);
    const safeRate = Number.isFinite(Number(gstRate)) ? Number(gstRate) : DEFAULT_GST_RATE;
    const interState = isLikelyInterState(customerGstin, customerPincode, shopGstin, shopPincode);
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    if (interState) {
        igstAmount = round2((taxableAmount * safeRate) / 100);
    }
    else {
        cgstAmount = round2((taxableAmount * safeRate) / 200);
        sgstAmount = round2((taxableAmount * safeRate) / 200);
    }
    const totalTaxAmount = round2(cgstAmount + sgstAmount + igstAmount);
    const totalAfterTax = round2(taxableAmount + totalTaxAmount);
    return {
        gstRate: safeRate,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAfterTax,
        interState,
    };
};
const ensureSalesTaxColumns = async () => {
    const alterQueries = [
        `ALTER TABLE sales ADD COLUMN customer_pincode VARCHAR(10) NULL`,
        `ALTER TABLE sales ADD COLUMN gst_rate DECIMAL(5,2) NULL DEFAULT 5.00`,
        `ALTER TABLE sales ADD COLUMN taxable_amount DECIMAL(12,2) NULL`,
        `ALTER TABLE sales ADD COLUMN cgst_amount DECIMAL(12,2) NULL`,
        `ALTER TABLE sales ADD COLUMN sgst_amount DECIMAL(12,2) NULL`,
        `ALTER TABLE sales ADD COLUMN igst_amount DECIMAL(12,2) NULL`,
        `ALTER TABLE sales ADD COLUMN total_after_tax DECIMAL(12,2) NULL`,
    ];
    for (const sql of alterQueries) {
        try {
            await db_1.default.query(sql);
        }
        catch (error) {
            if (error?.code !== "ER_DUP_FIELDNAME") {
                throw error;
            }
        }
    }
};
ensureSalesTaxColumns().catch((error) => {
    console.error("Failed to ensure GST columns on sales table:", error);
});
// Helper function to safely fetch data with optional pincode column
const safeFetchCustomer = async (conn, customerId, shopId) => {
    try {
        const [rows] = await conn.query(`SELECT gstin, pincode FROM accounts WHERE id = ? AND shop_id = ?`, [customerId, shopId]);
        return rows[0] || {};
    }
    catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            // Column doesn't exist, fetch without pincode
            const [rows] = await conn.query(`SELECT gstin FROM accounts WHERE id = ? AND shop_id = ?`, [customerId, shopId]);
            return rows[0] || {};
        }
        throw error;
    }
};
const safeFetchShop = async (conn, shopId) => {
    try {
        const [rows] = await conn.query(`SELECT gstin, pincode FROM shops WHERE id = ?`, [shopId]);
        return rows[0] || {};
    }
    catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            // Column doesn't exist, fetch without pincode
            const [rows] = await conn.query(`SELECT gstin FROM shops WHERE id = ?`, [shopId]);
            return rows[0] || {};
        }
        throw error;
    }
};
router.post("/", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        const { customerId, items, grandTotal, paidAmount = 0, paymentMode, notes, through, customerPincode = "", gstRate = DEFAULT_GST_RATE, } = req.body;
        const id = (0, uuid_1.v4)();
        const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM sales WHERE shop_id = ?`, [req.shop.shop_id]);
        const nextNumber = countRows[0].total + 1;
        const invoice_no = `SAL${nextNumber.toString().padStart(7, "0")}`;
        const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
        const status = deriveStatus(Number(grandTotal || 0), Number(paidAmount || 0));
        const customer = await safeFetchCustomer(conn, customerId, req.shop.shop_id);
        const shop = await safeFetchShop(conn, req.shop.shop_id);
        const resolvedPincode = normalizePincode(customerPincode) || normalizePincode(customer.pincode || "");
        const tax = computeTaxBreakdown({
            totalAmount: Number(grandTotal || 0),
            gstRate: Number(gstRate || DEFAULT_GST_RATE),
            customerGstin: customer.gstin,
            customerPincode: resolvedPincode,
            shopGstin: shop.gstin,
            shopPincode: shop.pincode || "",
        });
        await conn.query(`INSERT INTO sales
        (id, shop_id, customer_id, invoice_no, total_qty, total_amount, paid_amount, status, payment_mode, notes, through_agent,
         customer_pincode, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_after_tax)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.shop.shop_id,
            customerId,
            invoice_no,
            totalQty,
            grandTotal,
            paidAmount,
            status,
            paymentMode,
            notes,
            through,
            resolvedPincode || null,
            tax.gstRate,
            tax.taxableAmount,
            tax.cgstAmount,
            tax.sgstAmount,
            tax.igstAmount,
            tax.totalAfterTax,
        ]);
        for (const item of items) {
            await conn.query(`INSERT INTO sale_items
          (sale_id, product_id, hsn, size, description, rate, quantity, discount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, item.productId, item.hsn, item.size, item.description, item.rate, item.qty, item.discount || 0, item.total]);
            await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?`, [item.qty, item.productId, req.shop.shop_id]);
        }
        if (paidAmount > 0) {
            await conn.query(`INSERT INTO sale_payments (sale_id, shop_id, amount, payment_mode, note)
         VALUES (?, ?, ?, ?, ?)`, [id, req.shop.shop_id, paidAmount, paymentMode === "CREDIT" ? "CASH" : paymentMode, "Initial payment"]);
        }
        const balanceAmount = Number(grandTotal || 0) - Number(paidAmount || 0);
        if (balanceAmount > 0) {
            await conn.query(`UPDATE accounts SET balance = balance + ? WHERE id = ? AND shop_id = ?`, [balanceAmount, customerId, req.shop.shop_id]);
        }
        await conn.commit();
        res.status(201).json({ id, invoice_no, status });
    }
    catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    }
    finally {
        conn.release();
    }
});
// Helper function for safe SELECT with pincode fallback
const safeSelectWithPincode = async (query, params) => {
    try {
        const [rows] = await db_1.default.query(query, params);
        return rows;
    }
    catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            // Try without pincode references
            const fallbackQuery = query.replace(/,?\s*a\.pincode/g, '').replace(/COALESCE\(s\.customer_pincode,\s*a\.pincode\)/g, 's.customer_pincode');
            const [rows] = await db_1.default.query(fallbackQuery, params);
            return rows;
        }
        throw error;
    }
};
router.get("/", async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
      SELECT
        s.id, s.invoice_no, s.total_qty, s.total_amount,
        s.paid_amount, s.balance_amount, s.status,
        s.payment_mode, s.through_agent, s.notes, s.created_at, s.updated_at,
        s.customer_pincode, s.gst_rate, s.taxable_amount, s.cgst_amount, s.sgst_amount, s.igst_amount, s.total_after_tax,
        a.name AS customer_name, a.gstin AS customer_gstin,
        a.phone AS customer_phone
      FROM sales s
      JOIN accounts a ON a.id = s.customer_id
      WHERE s.shop_id = ?
    `;
        const params = [req.shop.shop_id];
        if (search) {
            query += ` AND (a.name LIKE ? OR s.invoice_no LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            query += ` AND s.status = ?`;
            params.push(status);
        }
        query += ` ORDER BY s.created_at DESC`;
        const [rows] = await db_1.default.query(query, params);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch sales" });
    }
});
router.put("/:id", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        const { id } = req.params;
        const { customer_id, items, payment_mode = "CREDIT", paid_amount = 0, through_agent = null, notes = null, } = req.body;
        if (!customer_id) {
            await conn.rollback();
            return res.status(400).json({ error: "customer_id is required" });
        }
        // Calculate grand total from items
        const grandTotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
        const paid = Number(paid_amount);
        const balance = Math.max(0, grandTotal - paid);
        const status = deriveStatus(grandTotal, paid);
        // Rollback old stock
        const [oldItems] = await conn.query(`SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`, [id]);
        for (const item of oldItems) {
            if (item.product_id) {
                await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ?`, [item.quantity, item.product_id, req.shop.shop_id]);
            }
        }
        // Delete old items
        await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);
        // Update sale header
        await conn.query(`UPDATE sales
       SET customer_id = ?, total_amount = ?, paid_amount = ?, balance_amount = ?,
           payment_mode = ?, status = ?, through_agent = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND shop_id = ?`, [
            customer_id, grandTotal,
            paid, balance, status,
            payment_mode, through_agent, notes,
            id, req.shop.shop_id,
        ]);
        // Insert new items + update stock
        for (const item of items) {
            await conn.query(`INSERT INTO sale_items
           (sale_id, product_id, hsn, size, description, rate, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                item.productId || item.product_id || null,
                item.hsn || null,
                item.size || null,
                item.description || null,
                Number(item.rate) || 0,
                Number(item.qty || item.quantity) || 1,
                Number(item.total) || 0,
            ]);
            if (item.productId || item.product_id) {
                await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?`, [
                    Number(item.qty || item.quantity) || 1,
                    item.productId || item.product_id,
                    req.shop.shop_id,
                ]);
            }
        }
        await conn.commit();
        res.json({ message: "Sale updated successfully" });
    }
    catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message || "Failed to update sale" });
    }
    finally {
        conn.release();
    }
});
router.put("/:id/tax-details", async (req, res) => {
    const conn = await db_1.default.getConnection();
    try {
        const { id } = req.params;
        const { customerPincode = "", gstRate = DEFAULT_GST_RATE } = req.body;
        const [saleRows] = await conn.query(`SELECT s.*, a.gstin AS customer_gstin
       FROM sales s
       LEFT JOIN accounts a ON a.id = s.customer_id
       WHERE s.id = ? AND s.shop_id = ?`, [id, req.shop.shop_id]);
        if (!saleRows.length)
            return res.status(404).json({ error: "Sale not found" });
        const sale = saleRows[0];
        const shop = await safeFetchShop(conn, req.shop.shop_id);
        const resolvedPincode = normalizePincode(customerPincode) ||
            normalizePincode(sale.customer_pincode) ||
            "";
        const tax = computeTaxBreakdown({
            totalAmount: Number(sale.total_amount || 0),
            gstRate: Number(gstRate || sale.gst_rate || DEFAULT_GST_RATE),
            customerGstin: sale.customer_gstin,
            customerPincode: resolvedPincode,
            shopGstin: shop.gstin,
            shopPincode: shop.pincode || "",
        });
        await conn.query(`UPDATE sales
       SET customer_pincode = ?, gst_rate = ?, taxable_amount = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, total_after_tax = ?, updated_at = NOW()
       WHERE id = ? AND shop_id = ?`, [
            resolvedPincode || null,
            tax.gstRate,
            tax.taxableAmount,
            tax.cgstAmount,
            tax.sgstAmount,
            tax.igstAmount,
            tax.totalAfterTax,
            id,
            req.shop.shop_id,
        ]);
        const [updatedRows] = await safeSelectWithPincode(`SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin,
              COALESCE(s.customer_pincode, a.pincode) AS customer_pincode
       FROM sales s LEFT JOIN accounts a ON a.id = s.customer_id
       WHERE s.id = ? AND s.shop_id = ?`, [id, req.shop.shop_id]);
        res.json({ message: "Tax details updated", sale: updatedRows[0] });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Failed to update tax details" });
    }
    finally {
        conn.release();
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await safeSelectWithPincode(`SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin,
              COALESCE(s.customer_pincode, a.pincode) AS customer_pincode
       FROM sales s LEFT JOIN accounts a ON a.id = s.customer_id
       WHERE s.id = ?`, [id]);
        if (!rows.length)
            return res.status(404).json({ error: "Sale not found" });
        const [items] = await db_1.default.query(`SELECT * FROM sale_items WHERE sale_id = ?`, [id]);
        const [payments] = await db_1.default.query(`SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY paid_at DESC`, [id]);
        res.json({ ...rows[0], items, payments });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch sale" });
    }
});
router.get("/with-images", async (req, res) => {
    try {
        const [rows] = await db_1.default.query(`SELECT s.*, a.name as customer_name, a.phone as customer_phone, a.address as customer_address, a.gstin as customer_gstin
       FROM sales s
       LEFT JOIN accounts a ON s.customer_id = a.id
       WHERE s.image_path IS NOT NULL
       ORDER BY s.created_at DESC`);
        const data = rows.map((row) => ({
            id: row.id,
            type: "SALE",
            created_at: row.created_at,
            imageUrl: `http://localhost:5000/uploads/sales-invoices/${row.image_path}`,
            invoice_no: row.invoice_no,
            customer_name: row.customer_name || null,
            total_amount: row.total_amount,
            paid_amount: row.paid_amount || 0,
            balance_amount: row.balance_amount || (Number(row.total_amount) - Number(row.paid_amount || 0)),
            total_qty: row.total_qty,
            status: row.status,
            payment_mode: row.payment_mode,
        }));
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch sales images", details: error.message });
    }
});
// Add other routes similarly with safe pincode handling...
exports.default = router;
