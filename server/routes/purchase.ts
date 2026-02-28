import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";



const router = Router();
router.use(authenticate);



router.post("/", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { vendor_id, total_amount, items } = req.body;

    console.log("Shop id ", req.shop);
    // 1️⃣ Generate UUID (internal ID)
    const id = uuidv4();

    // 2️⃣ Get next invoice number safely
    const [countRows]: any = await conn.query(
      `SELECT COUNT(*) as total FROM purchases WHERE shop_id = ?`,
      [req.shop.shop_id]
    );

    const nextNumber = countRows[0].total + 1;

    // 3️⃣ Generate 10-character invoice number
    const invoice_no = `PUR${nextNumber.toString().padStart(7, "0")}`;

    // 4️⃣ Insert purchase
    await conn.query(
      `INSERT INTO purchases (id, shop_id, vendor_id, invoice_no, total_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.shop.shop_id, vendor_id, invoice_no, total_amount]
    );

    // 5️⃣ Insert items + update stock
    for (const item of items) {
      await conn.query(
        `INSERT INTO purchase_items
         (purchase_id, product_id, hsn, size, description, rate, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.productId,
          item.hsn,
          item.size,
          item.description,
          item.rate,
          item.qty,
          item.total
        ]
      );

      await conn.query(
        `UPDATE products
         SET stock = stock + ?
         WHERE id = ? AND shop_id = ?`,
        [item.qty, item.productId, req.shop.shop_id]
      );
    }

    await conn.commit();

    res.status(201).json({
      id,
      invoice_no
    });

  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});


router.get("/", async (req: AuthRequest, res) => {
  try {
    const { invoice } = req.query;

    let query = `
      SELECT id, vendor_id, invoice_no, total_amount, created_at
      FROM purchases
      WHERE shop_id = ?
    `;

    const params: any[] = [req.shop.shop_id];

    if (invoice) {
      query += ` AND invoice_no = ?`;
      params.push(invoice);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

router.get("/:id/download", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    /* ---------- FETCH PURCHASE ---------- */
    const [purchaseRows]: any = await pool.query(
      `SELECT 
        p.*,
        a.name AS vendor_name,
        a.address AS vendor_address,
        a.phone AS vendor_phone,
        a.gstin AS vendor_gstin
       FROM purchases p
       JOIN accounts a ON a.id = p.vendor_id
       WHERE p.id = ? AND p.shop_id = ?`,
      [id, req.shop.shop_id]
    );

    if (!purchaseRows.length) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    const purchase = purchaseRows[0];

    /* ---------- FETCH SHOP (SAFE) ---------- */
    let shop: any = {};

    try {
      const [shopRows]: any = await pool.query(
        `SELECT * FROM shops WHERE id = ?`,
        [req.shop.shop_id]
      );
      console.log("Shop Details :" , shopRows);

      if (shopRows.length) {
        shop = shopRows[0];
      }
    } catch (err) {
      console.log("Shop fetch error:", err);
    }

    /* ---------- FETCH ITEMS ---------- */
    const [items]: any = await pool.query(
      `SELECT * FROM purchase_items WHERE purchase_id = ?`,
      [id]
    );

    /* ---------- CREATE PDF ---------- */
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${purchase.invoice_no}.pdf`
    );

    doc.pipe(res);

    /* ---------- SHOP HEADER ---------- */
    doc.fontSize(22)
      .font("Helvetica-Bold")
      .text(shop.name || "Your Shop Name", { align: "center" });

    doc.moveDown(0.3);

    doc.fontSize(10)
      .font("Helvetica")
      .text(shop.address || "", { align: "center" });

    doc.text(`Phone: ${shop.phone || "-"}`, { align: "center" });
    doc.text(`GSTIN: ${shop.gstin || "-"}`, { align: "center" });

    doc.moveDown(1);

    doc.moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .stroke();

    doc.moveDown(1);

    doc.fontSize(16)
      .font("Helvetica-Bold")
      .text("PURCHASE INVOICE", { align: "center" });

    doc.moveDown(1.5);

    /* ---------- HEADER BOX ---------- */
    const startY = doc.y;

    doc.rect(40, startY, 515, 100).stroke();

    doc.fontSize(10).font("Helvetica");

    doc.text(`Vendor Name: ${purchase.vendor_name}`, 50, startY + 10);
    doc.text(`Address: ${purchase.vendor_address}`, 50, startY + 25);
    doc.text(`Phone: ${purchase.vendor_phone}`, 50, startY + 40);
    doc.text(`GST No: ${purchase.vendor_gstin}`, 50, startY + 55);

    doc.text(`Invoice No: ${purchase.invoice_no}`, 350, startY + 10);
    doc.text(
      `Date: ${new Date(purchase.created_at).toLocaleDateString()}`,
      350,
      startY + 25
    );

    doc.moveDown(6);

    /* ---------- TABLE ---------- */
    const tableTop = doc.y;
    const rowHeight = 25;

    const col = {
      sno: 45,
      hsn: 80,
      size: 140,
      desc: 200,
      rate: 360,
      qty: 420,
      total: 470,
    };

    doc.rect(40, tableTop, 515, rowHeight).stroke();

    doc.font("Helvetica-Bold");
    doc.text("S.No", col.sno, tableTop + 8);
    doc.text("HSN", col.hsn, tableTop + 8);
    doc.text("Size", col.size, tableTop + 8);
    doc.text("Description", col.desc, tableTop + 8);
    doc.text("Rate", col.rate, tableTop + 8);
    doc.text("Qty", col.qty, tableTop + 8);
    doc.text("Amount", col.total, tableTop + 8);

    let y = tableTop + rowHeight;
    doc.font("Helvetica");

    items.forEach((item: any, index: number) => {
      doc.rect(40, y, 515, rowHeight).stroke();

      doc.text(index + 1, col.sno, y + 8);
      doc.text(item.hsn || "-", col.hsn, y + 8);
      doc.text(item.size || "-", col.size, y + 8);
      doc.text(item.description, col.desc, y + 8, { width: 140 });
      doc.text(`₹${item.rate}`, col.rate, y + 8);
      doc.text(item.quantity.toString(), col.qty, y + 8);
      doc.text(`₹${item.total}`, col.total, y + 8);

      y += rowHeight;
    });

    const grandTotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.total),
      0
    );

    doc.moveDown(2);

    doc.fontSize(14)
      .font("Helvetica-Bold")
      .text(
        `Grand Total: ₹ ${grandTotal.toLocaleString()}`,
        0,
        y + 20,
        { align: "right" }
      );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed" });
  }
}); 

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [purchaseRows]: any = await pool.query(
  `SELECT 
  p.*,
  a.name AS vendor_name,
  a.address AS vendor_address,
  a.phone AS vendor_phone,
  a.gstin AS vendor_gstin
FROM purchases p
JOIN accounts a ON a.id = p.vendor_id
WHERE p.id = ? AND p.shop_id = ?`,
  [id, req.shop.shop_id]
);

    if (purchaseRows.length === 0) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    const [items]: any = await pool.query(
      `SELECT * FROM purchase_items
       WHERE purchase_id = ?`,
      [id]
    );

    res.json({
      ...purchaseRows[0],
      items
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const { vendor_id, total_amount, items } = req.body;

    // 1️⃣ Get old items
    const [oldItems]: any = await conn.query(
      `SELECT product_id, quantity FROM purchase_items
       WHERE purchase_id = ?`,
      [id]
    );

    // 2️⃣ Rollback old stock
    for (const item of oldItems) {
      await conn.query(
        `UPDATE products
         SET stock = stock - ?
         WHERE id = ? AND shop_id = ?`,
        [item.quantity, item.product_id, req.shop.shop_id]
      );
    }

    // 3️⃣ Delete old items
    await conn.query(
      `DELETE FROM purchase_items WHERE purchase_id = ?`,
      [id]
    );

    // 4️⃣ Update purchase header
    await conn.query(
      `UPDATE purchases
       SET vendor_id = ?, total_amount = ?
       WHERE id = ? AND shop_id = ?`,
      [vendor_id, total_amount, id, req.shop.shop_id]
    );

    // 5️⃣ Insert new items + update stock
    for (const item of items) {
      await conn.query(
        `INSERT INTO purchase_items
         (purchase_id, product_id, hsn, size, description, rate, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.productId,
          item.hsn,
          item.size,
          item.description,
          item.rate,
          item.qty,
          item.total
        ]
      );

      await conn.query(
        `UPDATE products
         SET stock = stock + ?
         WHERE id = ? AND shop_id = ?`,
        [item.qty, item.productId, req.shop.shop_id]
      );
    }

    await conn.commit();

    res.json({ message: "Purchase updated successfully" });

  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;

    // 1️⃣ Get items
    const [items]: any = await conn.query(
      `SELECT product_id, quantity
       FROM purchase_items
       WHERE purchase_id = ?`,
      [id]
    );

    // 2️⃣ Reduce stock
    for (const item of items) {
      await conn.query(
        `UPDATE products
         SET stock = stock - ?
         WHERE id = ? AND shop_id = ?`,
        [item.quantity, item.product_id, req.shop.shop_id]
      );
    }

    // 3️⃣ Delete items
    await conn.query(
      `DELETE FROM purchase_items WHERE purchase_id = ?`,
      [id]
    );

    // 4️⃣ Delete purchase
    await conn.query(
      `DELETE FROM purchases
       WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );

    await conn.commit();

    res.json({ message: "Purchase deleted successfully" });

  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});
         


export default router;