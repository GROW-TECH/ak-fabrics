import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";

const router = Router();
router.use(authenticate);

// ─── Helper: derive status from amounts ──────────────────────────────────────
const deriveStatus = (totalAmount: number, paidAmount: number): string => {
  if (paidAmount <= 0) return "NOT_PAID";
  if (paidAmount >= totalAmount) return "PAID";
  return "HALF_PAID";
};

// ─── POST /api/sales — Create new sale ───────────────────────────────────────
router.post("/", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const {
      customerId,
      items,
      grandTotal,
      paidAmount = 0,
      paymentMode,
      notes,
      through
    } = req.body;

    const id = uuidv4();

    // Auto invoice number
    const [countRows]: any = await conn.query(
      `SELECT COUNT(*) as total FROM sales WHERE shop_id = ?`,
      [req.shop.shop_id]
    );
    const nextNumber = countRows[0].total + 1;
    const invoice_no = `SAL${nextNumber.toString().padStart(7, "0")}`;

    // Total qty
    const totalQty = items.reduce((sum: number, i: any) => sum + i.qty, 0);

    // Derive status
    const status = deriveStatus(grandTotal, paidAmount);

    // Insert sale
    await conn.query(
      `INSERT INTO sales 
        (id, shop_id, customer_id, invoice_no, total_qty, total_amount, paid_amount, status, payment_mode, notes, through_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.shop.shop_id, customerId, invoice_no, totalQty, grandTotal, paidAmount, status, paymentMode, notes, through]
    );

    // Insert items + reduce stock
    for (const item of items) {
      await conn.query(
        `INSERT INTO sale_items
          (sale_id, product_id, hsn, size, description, rate, quantity, discount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.productId, item.hsn, item.size, item.description, item.rate, item.qty, item.discount || 0, item.total]
      );

      await conn.query(
        `UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?`,
        [item.qty, item.productId, req.shop.shop_id]
      );
    }

    // Log payment if paid amount > 0
    if (paidAmount > 0) {
      await conn.query(
        `INSERT INTO sale_payments (sale_id, shop_id, amount, payment_mode, note)
         VALUES (?, ?, ?, ?, ?)`,
        [id, req.shop.shop_id, paidAmount, paymentMode === "CREDIT" ? "CASH" : paymentMode, "Initial payment"]
      );
    }

    // Update customer balance (amount still owed)
    const balanceAmount = grandTotal - paidAmount;
    if (balanceAmount > 0) {
      await conn.query(
        `UPDATE accounts SET balance = balance + ? WHERE id = ? AND shop_id = ?`,
        [balanceAmount, customerId, req.shop.shop_id]
      );
    }

    await conn.commit();
    res.status(201).json({ id, invoice_no, status });

  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// ─── GET /api/sales — List all sales ─────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        s.id, s.invoice_no, s.total_qty, s.total_amount,
        s.paid_amount, s.balance_amount, s.status,
        s.payment_mode, s.through_agent, s.notes, s.created_at,
        a.name AS customer_name, a.gstin AS customer_gstin,
        a.phone AS customer_phone
      FROM sales s
      JOIN accounts a ON a.id = s.customer_id
      WHERE s.shop_id = ?
    `;

    const params: any[] = [req.shop.shop_id];

    if (search) {
      query += ` AND (a.name LIKE ? OR s.invoice_no LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// ─── POST /api/sales/:id/payment — Add partial payment ───────────────────────
router.post("/:id/payment", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const { amount, paymentMode, note } = req.body;

    // Get current sale
    const [saleRows]: any = await conn.query(
      `SELECT * FROM sales WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );

    if (!saleRows.length) return res.status(404).json({ error: "Sale not found" });

    const sale = saleRows[0];
    const newPaid = Number(sale.paid_amount) + Number(amount);
    const newStatus = deriveStatus(Number(sale.total_amount), newPaid);

    // Update sale paid amount + status
    await conn.query(
      `UPDATE sales SET paid_amount = ?, status = ? WHERE id = ? AND shop_id = ?`,
      [newPaid, newStatus, id, req.shop.shop_id]
    );

    // Log payment
    await conn.query(
      `INSERT INTO sale_payments (sale_id, shop_id, amount, payment_mode, note)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.shop.shop_id, amount, paymentMode, note || "Payment received"]
    );

    // Reduce customer balance
    await conn.query(
      `UPDATE accounts SET balance = balance - ? WHERE id = ? AND shop_id = ?`,
      [amount, sale.customer_id, req.shop.shop_id]
    );

    await conn.commit();
    res.json({ message: "Payment recorded", status: newStatus, paid_amount: newPaid });

  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// ─── GET /api/sales/barcode/:invoiceNo ───────────────────────────────────────
router.get("/barcode/:invoiceNo", async (req: AuthRequest, res) => {
  try {
    const { invoiceNo } = req.params;

    const [rows]: any = await pool.query(
      `SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin
       FROM sales s JOIN accounts a ON a.id = s.customer_id
       WHERE s.invoice_no = ? AND s.shop_id = ?`,
      [invoiceNo, req.shop.shop_id]
    );

    if (!rows.length) return res.status(404).json({ error: `Invoice not found: ${invoiceNo}` });

    const [items]: any = await pool.query(
      `SELECT * FROM sale_items WHERE sale_id = ?`, [rows[0].id]
    );

    res.json({ ...rows[0], items });
  } catch (error) {
    res.status(500).json({ error: "Barcode lookup failed" });
  }
});

// ─── GET /api/sales/with-images ───────────────────────────────────────────────
router.get("/with-images", async (req: AuthRequest, res) => {
  try {
    console.log('Fetching sales with images for shop_id:', req.shop?.shop_id || 'NO_SHOP_ID');
    
    // Temporarily remove shop_id filter to show all uploaded invoices
    const [rows] = await pool.query(
      `SELECT s.*, a.name as customer_name, a.phone as customer_phone, a.address as customer_address, a.gstin as customer_gstin
       FROM sales s
       LEFT JOIN accounts a ON s.customer_id = a.id
       WHERE s.image_path IS NOT NULL
       ORDER BY s.created_at DESC`
    );

    console.log('Found', (rows as any[]).length, 'sales records with images');

    const data = (rows as any[]).map((row) => ({
      id: row.id,
      type: "SALE",
      created_at: row.created_at,
      imageUrl: `http://localhost:5000/uploads/sales-invoices/${row.image_path}`,
      invoice_no: row.invoice_no,
      customer_name: row.customer_name || null,
      total_amount: row.total_amount,
      total_qty: row.total_qty,
      status: row.status,
      payment_mode: row.payment_mode,
    }));

    console.log('Returning data:', data.length, 'items');
    res.json(data);
  } catch (error: any) {
    console.error("Get sales with images error:", error);
    res.status(500).json({ error: "Failed to fetch sales images", details: error.message });
  }
});

// ─── GET /api/sales/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    console.log('Fetching sales invoice from main routes:', id, 'for shop_id:', req.shop?.shop_id || 'NO_SHOP_ID');

    // Temporarily remove shop_id filter to allow access to uploaded invoices
    const [rows]: any = await pool.query(
      `SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin
       FROM sales s LEFT JOIN accounts a ON a.id = s.customer_id
       WHERE s.id = ?`,
      [id]
    );

    if (!rows.length) {
      console.log('Sales invoice not found in main routes:', id);
      return res.status(404).json({ error: "Sale not found" });
    }

    console.log('Found sales invoice in main routes:', rows[0].invoice_no, 'shop_id:', rows[0].shop_id);

    const [items]: any = await pool.query(
      `SELECT * FROM sale_items WHERE sale_id = ?`, [id]
    );

    const [payments]: any = await pool.query(
      `SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY paid_at DESC`, [id]
    );

    res.json({ ...rows[0], items, payments });
  } catch (error) {
    console.error('Error in main sales routes:', error);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
});

// ─── GET /api/sales/:id/download — PDF Invoice ───────────────────────────────
router.get("/:id/download", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [saleRows]: any = await pool.query(
      `SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin
       FROM sales s JOIN accounts a ON a.id = s.customer_id
       WHERE s.id = ? AND s.shop_id = ?`,
      [id, req.shop.shop_id]
    );

    if (!saleRows.length) return res.status(404).json({ error: "Sale not found" });
    const sale = saleRows[0];

    let shop: any = {};
    try {
      const [shopRows]: any = await pool.query(`SELECT * FROM shops WHERE id = ?`, [req.shop.shop_id]);
      if (shopRows.length) shop = shopRows[0];
    } catch (_) {}

    const [items]: any = await pool.query(`SELECT * FROM sale_items WHERE sale_id = ?`, [id]);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${sale.invoice_no}.pdf`);
    doc.pipe(res);

    // Shop header
    doc.fontSize(22).font("Helvetica-Bold").text(shop.name || "AK Fabrics", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").text(shop.address || "", { align: "center" });
    doc.text(`Phone: ${shop.phone || "-"}  |  GSTIN: ${shop.gstin || "-"}`, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);
    doc.fontSize(16).font("Helvetica-Bold").text("SALES INVOICE", { align: "center" });
    doc.moveDown(1.5);

    // Info box
    const startY = doc.y;
    doc.rect(40, startY, 515, 110).stroke();
    doc.fontSize(10).font("Helvetica");
    doc.text(`Customer: ${sale.customer_name}`, 50, startY + 10);
    doc.text(`Address:  ${sale.customer_address || "-"}`, 50, startY + 25);
    doc.text(`Phone:    ${sale.customer_phone || "-"}`, 50, startY + 40);
    doc.text(`GST No:   ${sale.customer_gstin || "-"}`, 50, startY + 55);
    if (sale.through_agent) doc.text(`Through:  ${sale.through_agent}`, 50, startY + 70);

    doc.text(`Invoice No:   ${sale.invoice_no}`, 350, startY + 10);
    doc.text(`Date:         ${new Date(sale.created_at).toLocaleDateString()}`, 350, startY + 25);
    doc.text(`Payment Mode: ${sale.payment_mode}`, 350, startY + 40);
    doc.text(`Status:       ${sale.status.replace("_", " ")}`, 350, startY + 55);
    doc.text(`Paid:         ₹${Number(sale.paid_amount).toLocaleString()}`, 350, startY + 70);
    doc.text(`Balance:      ₹${Number(sale.balance_amount).toLocaleString()}`, 350, startY + 85);

    doc.moveDown(7);

    // Table
    const tableTop = doc.y;
    const rowH = 25;
    const col = { sno: 45, hsn: 80, size: 135, desc: 190, rate: 330, disc: 378, qty: 415, total: 460 };

    doc.rect(40, tableTop, 515, rowH).fill("#f1f5f9").stroke();
    doc.fillColor("black").font("Helvetica-Bold").fontSize(9);
    doc.text("S.No",  col.sno,  tableTop + 8);
    doc.text("HSN",   col.hsn,  tableTop + 8);
    doc.text("Size",  col.size, tableTop + 8);
    doc.text("Description", col.desc, tableTop + 8);
    doc.text("Rate",  col.rate, tableTop + 8);
    doc.text("Disc%", col.disc, tableTop + 8);
    doc.text("Qty",   col.qty,  tableTop + 8);
    doc.text("Amount",col.total,tableTop + 8);

    let y = tableTop + rowH;
    doc.font("Helvetica").fontSize(9);

    items.forEach((item: any, i: number) => {
      if (i % 2 === 0) doc.rect(40, y, 515, rowH).fill("#fafafa").stroke();
      else doc.rect(40, y, 515, rowH).stroke();
      doc.fillColor("black");
      doc.text(i + 1,                     col.sno,  y + 8);
      doc.text(item.hsn || "-",           col.hsn,  y + 8);
      doc.text(item.size || "-",          col.size, y + 8);
      doc.text(item.description || "-",   col.desc, y + 8, { width: 130 });
      doc.text(`₹${item.rate}`,           col.rate, y + 8);
      doc.text(`${item.discount || 0}%`,  col.disc, y + 8);
      doc.text(item.quantity.toString(),  col.qty,  y + 8);
      doc.text(`₹${item.total}`,          col.total,y + 8);
      y += rowH;
    });

    // Totals
    y += 15;
    doc.fontSize(10).font("Helvetica");
    doc.text(`Total Qty: ${sale.total_qty}`, 50, y);
    doc.font("Helvetica-Bold").fontSize(13)
      .text(`Grand Total: ₹${Number(sale.total_amount).toLocaleString()}`, 0, y, { align: "right" });

    y += 20;
    doc.fontSize(10).font("Helvetica")
      .text(`Paid: ₹${Number(sale.paid_amount).toLocaleString()}   Balance: ₹${Number(sale.balance_amount).toLocaleString()}`, 0, y, { align: "right" });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

// ─── PUT /api/sales/:id ───────────────────────────────────────────────────────
router.put("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const { id } = req.params;
    const { customerId, items, grandTotal, paidAmount = 0, paymentMode, notes, through } = req.body;

    // Restore stock from old items
    const [oldItems]: any = await conn.query(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`, [id]
    );
    for (const item of oldItems) {
      await conn.query(
        `UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ?`,
        [item.quantity, item.product_id, req.shop.shop_id]
      );
    }

    await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);

    const totalQty = items.reduce((s: number, i: any) => s + i.qty, 0);
    const status = deriveStatus(grandTotal, paidAmount);

    await conn.query(
      `UPDATE sales SET customer_id=?, total_qty=?, total_amount=?, paid_amount=?,
       status=?, payment_mode=?, notes=?, through_agent=?
       WHERE id=? AND shop_id=?`,
      [customerId, totalQty, grandTotal, paidAmount, status, paymentMode, notes, through, id, req.shop.shop_id]
    );

    for (const item of items) {
      await conn.query(
        `INSERT INTO sale_items (sale_id, product_id, hsn, size, description, rate, quantity, discount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.productId, item.hsn, item.size, item.description, item.rate, item.qty, item.discount || 0, item.total]
      );
      await conn.query(
        `UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?`,
        [item.qty, item.productId, req.shop.shop_id]
      );
    }

    await conn.commit();
    res.json({ message: "Sale updated", status });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// ─── DELETE /api/sales/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const { id } = req.params;

    const [items]: any = await conn.query(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`, [id]
    );
    for (const item of items) {
      await conn.query(
        `UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ?`,
        [item.quantity, item.product_id, req.shop.shop_id]
      );
    }

    await conn.query(`DELETE FROM sale_payments WHERE sale_id = ?`, [id]);
    await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);
    await conn.query(`DELETE FROM sales WHERE id = ? AND shop_id = ?`, [id, req.shop.shop_id]);

    await conn.commit();
    res.json({ message: "Sale deleted" });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

export default router;