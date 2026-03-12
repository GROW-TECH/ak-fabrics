"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const pdfkit_1 = __importDefault(require("pdfkit"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function deriveStatus(grandTotal, paidAmount) {
    if (paidAmount <= 0)
        return "NOT_PAID";
    if (paidAmount >= grandTotal)
        return "PAID";
    return "HALF_PAID";
}
// ─── POST /purchases ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        const { vendor_id, vendorId, items, payment_mode = "CREDIT", paid_amount = 0, through_agent = null, notes = null, bankId = null, bank_id = null, } = req.body;
        const resolvedVendorId = vendor_id || vendorId;
        if (!resolvedVendorId) {
            await conn.rollback();
            return res.status(400).json({ error: "vendor_id is required" });
        }
        const resolvedBankId = bankId || bank_id || null;
        const grandTotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
        const paid = Number(paid_amount);
        const balance = Math.max(0, grandTotal - paid);
        const payment_status = deriveStatus(grandTotal, paid);
        const id = (0, uuid_1.v4)();
        const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM purchases WHERE shop_id = ?`, [req.shop.shop_id]);
        const nextNumber = countRows[0].total + 1;
        const invoice_no = `KT-0${nextNumber.toString().padStart(2, "0")}`;
        await conn.query(`INSERT INTO purchases
         (id, shop_id, vendor_id, invoice_no, total_amount,
          payment_mode, bank_id, paid_amount, balance_amount, payment_status,
          through_agent, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.shop.shop_id,
            resolvedVendorId,
            invoice_no,
            grandTotal,
            payment_mode,
            resolvedBankId,
            paid,
            balance,
            payment_status,
            through_agent,
            notes,
        ]);
        for (const item of items) {
            await conn.query(`INSERT INTO purchase_items
           (purchase_id, product_id, hsn, size, description, rate, quantity, discount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                item.productId || item.product_id || null,
                item.hsn || null,
                item.size || null,
                item.description || null,
                Number(item.rate) || 0,
                Number(item.qty ?? item.quantity) || 1,
                Number(item.discount) || 0,
                Number(item.total) || 0,
            ]);
            if (item.productId || item.product_id) {
                await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ?`, [
                    Number(item.qty ?? item.quantity) || 1,
                    item.productId || item.product_id,
                    req.shop.shop_id,
                ]);
            }
        }
        if (paid > 0) {
            await conn.query(`INSERT INTO purchase_payments (purchase_id, shop_id, amount, payment_mode, note)
         VALUES (?, ?, ?, ?, ?)`, [id, req.shop.shop_id, paid, payment_mode, "Initial payment"]);
        }
        await conn.commit();
        res.status(201).json({ id, invoice_no, payment_status });
    }
    catch (error) {
        await conn.rollback();
        console.error("Create purchase error:", error);
        res.status(500).json({ error: error.message });
    }
    finally {
        conn.release();
    }
});
// ─── GET /purchases — List all with vendor_phone + bank_name ─────────────────
router.get("/", async (req, res) => {
    try {
        const { invoice, location } = req.query;
        const [columnRows] = await db_1.default.query(`SHOW COLUMNS FROM purchases`);
        const purchaseColumns = new Set(columnRows.map((r) => r.Field));
        const selectUpdatedAt = purchaseColumns.has("updated_at")
            ? "p.updated_at"
            : "p.created_at AS updated_at";
        const selectThroughAgent = purchaseColumns.has("through_agent")
            ? "p.through_agent"
            : "NULL AS through_agent";
        const selectNotes = purchaseColumns.has("notes")
            ? "p.notes"
            : "NULL AS notes";
        const selectImagePath = purchaseColumns.has("image_path")
            ? "p.image_path"
            : "NULL AS image_path";
        const selectBankId = purchaseColumns.has("bank_id")
            ? "p.bank_id"
            : "NULL AS bank_id";
        let query = `
      SELECT
        p.id, p.shop_id, p.vendor_id, p.invoice_no,
        p.total_amount, p.created_at, ${selectUpdatedAt},
        p.payment_mode, ${selectBankId}, p.paid_amount, p.balance_amount,
        p.payment_status, ${selectThroughAgent}, ${selectNotes}, ${selectImagePath},
        a.name AS vendor_name,
        a.phone AS vendor_phone,
        b.bank_name AS bank_name,
        b.account_number AS bank_account_number,
        b.ifsc_code AS bank_ifsc_code
      FROM purchases p
      JOIN accounts a ON a.id = p.vendor_id
      LEFT JOIN banks b ON b.id = p.bank_id
      WHERE p.shop_id = ?
    `;
        const params = [req.shop.shop_id];
        if (invoice) {
            query += ` AND p.invoice_no = ?`;
            params.push(invoice);
        }
        // Add location filter if provided
        if (location) {
            query += ` AND p.location = ?`;
            params.push(location);
        }
        query += ` ORDER BY p.created_at DESC`;
        const [rows] = await db_1.default.query(query, params);
        res.json(rows);
    }
    catch (error) {
        console.error("List purchases error:", error);
        res.status(500).json({ error: "Failed to fetch purchases" });
    }
});
// ─── GET /purchases/with-images ───────────────────────────────────────────────
router.get("/with-images", async (req, res) => {
    try {
        const [rows] = await db_1.default.query(`SELECT p.id, p.shop_id, p.vendor_id, p.invoice_no,
              p.total_amount, p.created_at, p.payment_mode,
              p.paid_amount, p.balance_amount, p.payment_status,
              p.through_agent, p.notes, p.image_path, p.bank_id,
              a.name AS vendor_name, a.phone AS vendor_phone,
              b.bank_name AS bank_name
       FROM purchases p
       LEFT JOIN accounts a ON p.vendor_id = a.id
       LEFT JOIN banks b ON b.id = p.bank_id
       WHERE p.image_path IS NOT NULL AND p.shop_id = ?
       ORDER BY p.created_at DESC`, [req.shop.shop_id]);
        const data = rows.map((row) => ({
            id: row.id,
            type: "PURCHASE",
            created_at: row.created_at,
            imageUrl: `${process.env.API_URL || "http://localhost:5000"}/uploads/purchase-invoices/${row.image_path}`,
            invoice_no: row.invoice_no,
            vendor_name: row.vendor_name || null,
            vendor_phone: row.vendor_phone || null,
            bank_name: row.bank_name || null,
            total_amount: row.total_amount,
            paid_amount: row.paid_amount || 0,
            balance_amount: row.balance_amount ||
                Number(row.total_amount) - Number(row.paid_amount || 0),
            payment_status: row.payment_status,
            payment_mode: row.payment_mode,
        }));
        res.json(data);
    }
    catch (error) {
        console.error("Get purchases with images error:", error);
        res
            .status(500)
            .json({ error: "Failed to fetch purchase images", details: error.message });
    }
});
// ─── GET /purchases/barcode/:invoiceNo ────────────────────────────────────────
router.get("/barcode/:invoiceNo", async (req, res) => {
    try {
        const { invoiceNo } = req.params;
        const [purchaseRows] = await db_1.default.query(`SELECT p.id, p.shop_id, p.vendor_id, p.invoice_no,
              p.total_amount, p.created_at, p.payment_mode, p.bank_id,
              p.paid_amount, p.balance_amount, p.payment_status,
              p.through_agent, p.notes, p.image_path,
              a.name AS vendor_name, a.address AS vendor_address,
              a.phone AS vendor_phone, a.gstin AS vendor_gstin,
              b.bank_name AS bank_name
       FROM purchases p
       JOIN accounts a ON a.id = p.vendor_id
       LEFT JOIN banks b ON b.id = p.bank_id
       WHERE p.invoice_no = ? AND p.shop_id = ?`, [invoiceNo, req.shop.shop_id]);
        if (!purchaseRows.length)
            return res
                .status(404)
                .json({ error: `Invoice not found: ${invoiceNo}` });
        const [items] = await db_1.default.query(`SELECT id, purchase_id, product_id, hsn, size, description, rate, quantity, discount, total
       FROM purchase_items WHERE purchase_id = ?`, [purchaseRows[0].id]);
        res.json({ ...purchaseRows[0], items });
    }
    catch (error) {
        console.error("Barcode lookup error:", error);
        res.status(500).json({ error: "Failed to fetch purchase by barcode" });
    }
});
// ─── GET /purchases/:id/payments ──────────────────────────────────────────────
router.get("/:id/payments", async (req, res) => {
    try {
        const [rows] = await db_1.default.query(`SELECT id, purchase_id, shop_id, amount, payment_mode, note, paid_at
       FROM purchase_payments
       WHERE purchase_id = ? AND shop_id = ?
       ORDER BY paid_at ASC`, [req.params.id, req.shop.shop_id]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch payments" });
    }
});
// ─── POST /purchases/:id/payments ─────────────────────────────────────────────
router.post("/:id/payments", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        const { id } = req.params;
        const { amount, payment_mode = "CASH", note = null } = req.body;
        await conn.query(`INSERT INTO purchase_payments (purchase_id, shop_id, amount, payment_mode, note)
       VALUES (?, ?, ?, ?, ?)`, [id, req.shop.shop_id, amount, payment_mode, note]);
        const [sumRows] = await conn.query(`SELECT COALESCE(SUM(amount), 0) AS total_paid FROM purchase_payments WHERE purchase_id = ?`, [id]);
        const [purchaseRows] = await conn.query(`SELECT total_amount FROM purchases WHERE id = ?`, [id]);
        const grandTotal = Number(purchaseRows[0].total_amount);
        const totalPaid = Number(sumRows[0].total_paid);
        const balance = Math.max(0, grandTotal - totalPaid);
        const status = deriveStatus(grandTotal, totalPaid);
        await conn.query(`UPDATE purchases SET paid_amount = ?, balance_amount = ?, payment_status = ?
       WHERE id = ? AND shop_id = ?`, [totalPaid, balance, status, id, req.shop.shop_id]);
        await conn.commit();
        res.status(201).json({
            message: "Payment recorded",
            payment_status: status,
            paid_amount: totalPaid,
            balance_amount: balance,
        });
    }
    catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    }
    finally {
        conn.release();
    }
});
// ─── GET /purchases/:id — Single purchase ─────────────────────────────────────
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [purchaseRows] = await db_1.default.query(`SELECT p.id, p.shop_id, p.vendor_id, p.invoice_no,
              p.total_amount, p.created_at, p.payment_mode, p.bank_id,
              p.paid_amount, p.balance_amount, p.payment_status,
              p.through_agent, p.notes, p.image_path,
              a.name AS vendor_name, a.address AS vendor_address,
              a.phone AS vendor_phone, a.gstin AS vendor_gstin,
              b.bank_name AS bank_name,
              b.account_number AS bank_account_number,
              b.ifsc_code AS bank_ifsc_code
       FROM purchases p
       JOIN accounts a ON a.id = p.vendor_id
       LEFT JOIN banks b ON b.id = p.bank_id
       WHERE p.id = ? AND p.shop_id = ?`, [id, req.shop.shop_id]);
        if (!purchaseRows.length)
            return res.status(404).json({ error: "Purchase not found" });
        const [items] = await db_1.default.query(`SELECT id, purchase_id, product_id, hsn, size, description, rate, quantity, discount, total
       FROM purchase_items WHERE purchase_id = ?`, [id]);
        const [payments] = await db_1.default.query(`SELECT id, purchase_id, shop_id, amount, payment_mode, note, paid_at
       FROM purchase_payments WHERE purchase_id = ? AND shop_id = ? ORDER BY paid_at ASC`, [id, req.shop.shop_id]);
        res.json({ ...purchaseRows[0], items, payments });
    }
    catch (error) {
        console.error("Get purchase error:", error);
        res.status(500).json({ error: "Failed to fetch purchase" });
    }
});
// ─── PUT /purchases/:id — Update ──────────────────────────────────────────────
router.put("/:id", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        const { id } = req.params;
        const { vendor_id, vendorId, items, payment_mode = "CREDIT", paid_amount = 0, through_agent = null, notes = null, bankId = null, bank_id = null, } = req.body;
        const resolvedVendorId = vendor_id || vendorId;
        if (!resolvedVendorId) {
            await conn.rollback();
            return res.status(400).json({ error: "vendor_id is required" });
        }
        const resolvedBankId = bankId || bank_id || null;
        const grandTotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
        const paid = Number(paid_amount);
        const balance = Math.max(0, grandTotal - paid);
        const payment_status = deriveStatus(grandTotal, paid);
        // Rollback old stock
        const [oldItems] = await conn.query(`SELECT product_id, quantity FROM purchase_items WHERE purchase_id = ?`, [id]);
        for (const item of oldItems) {
            if (item.product_id) {
                await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?`, [item.quantity, item.product_id, req.shop.shop_id]);
            }
        }
        await conn.query(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);
        await conn.query(`UPDATE purchases
       SET vendor_id = ?, total_amount = ?,
           payment_mode = ?, bank_id = ?, paid_amount = ?, balance_amount = ?,
           payment_status = ?, through_agent = ?, notes = ?
       WHERE id = ? AND shop_id = ?`, [
            resolvedVendorId,
            grandTotal,
            payment_mode,
            resolvedBankId,
            paid,
            balance,
            payment_status,
            through_agent,
            notes,
            id,
            req.shop.shop_id,
        ]);
        for (const item of items) {
            await conn.query(`INSERT INTO purchase_items
           (purchase_id, product_id, hsn, size, description, rate, quantity, discount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                item.productId || item.product_id || null,
                item.hsn || null,
                item.size || null,
                item.description || null,
                Number(item.rate) || 0,
                Number(item.qty ?? item.quantity) || 1,
                Number(item.discount) || 0,
                Number(item.total) || 0,
            ]);
            if (item.productId || item.product_id) {
                await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ?`, [
                    Number(item.qty ?? item.quantity) || 1,
                    item.productId || item.product_id,
                    req.shop.shop_id,
                ]);
            }
        }
        await conn.commit();
        res.json({ message: "Purchase updated successfully", payment_status });
    }
    catch (error) {
        await conn.rollback();
        console.error("Update purchase error:", error);
        res.status(500).json({ error: error.message });
    }
    finally {
        conn.release();
    }
});
// ─── DELETE /purchases/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    const conn = await db_1.default.getConnection();
    await conn.beginTransaction();
    try {
        const { id } = req.params;
        const [items] = await conn.query(`SELECT product_id, quantity FROM purchase_items WHERE purchase_id = ?`, [id]);
        for (const item of items) {
            if (item.product_id) {
                await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?`, [item.quantity, item.product_id, req.shop.shop_id]);
            }
        }
        await conn.query(`DELETE FROM purchase_payments WHERE purchase_id = ?`, [id]);
        await conn.query(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);
        await conn.query(`DELETE FROM purchases WHERE id = ? AND shop_id = ?`, [id, req.shop.shop_id]);
        await conn.commit();
        res.json({ message: "Purchase deleted successfully" });
    }
    catch (error) {
        await conn.rollback();
        console.error("Delete purchase error:", error);
        res.status(500).json({ error: error.message });
    }
    finally {
        conn.release();
    }
});
// ─── GET /purchases/:id/download — PDF ───────────────────────────────────────
router.get("/:id/download", async (req, res) => {
    try {
        const { id } = req.params;
        const [purchaseRows] = await db_1.default.query(`SELECT p.id, p.shop_id, p.vendor_id, p.invoice_no,
              p.total_amount, p.created_at, p.payment_mode, p.bank_id,
              p.paid_amount, p.balance_amount, p.payment_status,
              p.through_agent, p.notes,
              a.name AS vendor_name, a.address AS vendor_address,
              a.phone AS vendor_phone, a.gstin AS vendor_gstin,
              b.bank_name AS bank_name,
              b.account_number AS bank_account_number,
              b.ifsc_code AS bank_ifsc_code
       FROM purchases p
       JOIN accounts a ON a.id = p.vendor_id
       LEFT JOIN banks b ON b.id = p.bank_id
       WHERE p.id = ? AND p.shop_id = ?`, [id, req.shop.shop_id]);
        if (!purchaseRows.length)
            return res.status(404).json({ error: "Purchase not found" });
        const purchase = purchaseRows[0];
        let shop = {};
        try {
            const [shopRows] = await db_1.default.query(`SELECT * FROM shops WHERE id = ?`, [req.shop.shop_id]);
            if (shopRows.length)
                shop = shopRows[0];
        }
        catch (_) { }
        const [items] = await db_1.default.query(`SELECT id, purchase_id, product_id, hsn, size, description, rate, quantity, discount, total
       FROM purchase_items WHERE purchase_id = ?`, [id]);
        const doc = new pdfkit_1.default({ margin: 40, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${purchase.invoice_no}.pdf`);
        doc.pipe(res);
        // Header
        doc
            .fontSize(22)
            .font("Helvetica-Bold")
            .text(shop.name || "AK FABRICS", { align: "center" });
        doc
            .moveDown(0.3)
            .fontSize(10)
            .font("Helvetica")
            .text(shop.address ||
            "34, No-1 PandariNadhar Street, Ammapet, Salem - 636003", { align: "center" });
        doc.text(`Phone: ${shop.phone || "9443095080"}`, { align: "center" });
        doc.text(`GSTIN: ${shop.gstin || "33AKGPK9627B1ZC"}`, { align: "center" });
        doc
            .moveDown(1)
            .moveTo(40, doc.y)
            .lineTo(555, doc.y)
            .stroke();
        doc
            .moveDown(1)
            .fontSize(16)
            .font("Helvetica-Bold")
            .text("PURCHASE INVOICE", { align: "center" });
        doc.moveDown(1.5);
        // Info box
        const startY = doc.y;
        const boxHeight = purchase.bank_name ? 130 : 115;
        doc
            .rect(40, startY, 515, boxHeight)
            .stroke()
            .fontSize(10)
            .font("Helvetica");
        doc.text(`Vendor: ${purchase.vendor_name}`, 50, startY + 10);
        doc.text(`Address: ${purchase.vendor_address || "-"}`, 50, startY + 25);
        doc.text(`Phone: ${purchase.vendor_phone || "-"}`, 50, startY + 40);
        doc.text(`GST No: ${purchase.vendor_gstin || "-"}`, 50, startY + 55);
        if (purchase.through_agent)
            doc.text(`Through: ${purchase.through_agent}`, 50, startY + 70);
        doc.text(`Invoice No: ${purchase.invoice_no}`, 350, startY + 10);
        doc.text(`Date: ${new Date(purchase.created_at).toLocaleDateString()}`, 350, startY + 25);
        doc.text(`Payment Mode: ${purchase.payment_mode}`, 350, startY + 40);
        // Bank details in PDF
        if (purchase.bank_name) {
            doc.text(`Bank: ${purchase.bank_name}`, 350, startY + 55);
            if (purchase.bank_account_number)
                doc.text(`A/C: ${purchase.bank_account_number}`, 350, startY + 70);
            if (purchase.bank_ifsc_code)
                doc.text(`IFSC: ${purchase.bank_ifsc_code}`, 350, startY + 85);
            doc.text(`Status: ${purchase.payment_status.replace("_", " ")}`, 350, startY + 100);
        }
        else {
            doc.text(`Status: ${purchase.payment_status.replace("_", " ")}`, 350, startY + 55);
        }
        if (purchase.notes)
            doc.text(`Notes: ${purchase.notes}`, 50, startY + (purchase.through_agent ? 85 : 70));
        doc.moveDown(purchase.bank_name ? 9 : 8);
        // Items table
        const tableTop = doc.y;
        const rowH = 25;
        const col = {
            sno: 45,
            hsn: 80,
            size: 140,
            desc: 200,
            rate: 340,
            qty: 400,
            disc: 440,
            total: 490,
        };
        doc
            .rect(40, tableTop, 515, rowH)
            .stroke()
            .font("Helvetica-Bold");
        doc.text("S.No", col.sno, tableTop + 8);
        doc.text("HSN", col.hsn, tableTop + 8);
        doc.text("Size", col.size, tableTop + 8);
        doc.text("Description", col.desc, tableTop + 8);
        doc.text("Rate", col.rate, tableTop + 8);
        doc.text("Qty", col.qty, tableTop + 8);
        doc.text("Disc%", col.disc, tableTop + 8);
        doc.text("Amount", col.total, tableTop + 8);
        let y = tableTop + rowH;
        doc.font("Helvetica");
        items.forEach((item, i) => {
            doc.rect(40, y, 515, rowH).stroke();
            doc.text(String(i + 1), col.sno, y + 8);
            doc.text(item.hsn || "-", col.hsn, y + 8);
            doc.text(item.size || "-", col.size, y + 8);
            doc.text(item.description || "-", col.desc, y + 8, { width: 130 });
            doc.text(`₹${item.rate}`, col.rate, y + 8);
            doc.text(String(item.quantity), col.qty, y + 8);
            doc.text(`${item.discount || 0}%`, col.disc, y + 8);
            doc.text(`₹${item.total}`, col.total, y + 8);
            y += rowH;
        });
        const pdfGrandTotal = items.reduce((s, i) => s + Number(i.total), 0);
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Grand Total: ₹${pdfGrandTotal.toLocaleString()}`, 0, y + 10, {
            align: "right",
        });
        doc
            .fontSize(11)
            .font("Helvetica")
            .text(`Paid: ₹${Number(purchase.paid_amount).toLocaleString()}`, 0, y + 28, { align: "right" });
        doc.text(`Balance Due: ₹${Number(purchase.balance_amount).toLocaleString()}`, 0, y + 44, { align: "right" });
        doc.end();
    }
    catch (err) {
        console.error("PDF generation error:", err);
        res.status(500).json({ error: "PDF generation failed" });
    }
});
exports.default = router;
