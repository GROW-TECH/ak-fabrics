import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";

const router = Router();
router.use(authenticate);

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Ensure color_split column exists in sale_items table
const ensureColorSplitColumn = async () => {
  const [rows]: any = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'color_split'`
  );
  if (!rows.length) {
    await pool.query(`ALTER TABLE sale_items ADD COLUMN color_split LONGTEXT NULL`);
  }
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
    `ALTER TABLE sales ADD COLUMN bank_id INT NULL`,
    `ALTER TABLE sales ADD COLUMN location VARCHAR(20) NULL`,
    `ALTER TABLE sales ADD COLUMN cost_total DECIMAL(14,2) NULL DEFAULT 0`,
    `ALTER TABLE sales ADD COLUMN profit_amount DECIMAL(14,2) NULL DEFAULT 0`,
  ];

  for (const sql of alterQueries) {
    try {
      await pool.query(sql);
    } catch (error: any) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }
};

const ensureSaleItemCostColumns = async () => {
  try {
    await pool.query(`ALTER TABLE sale_items ADD COLUMN cost_price DECIMAL(12,2) NULL DEFAULT 0`);
  } catch (error: any) {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await pool.query(`ALTER TABLE sale_items ADD COLUMN cost_total DECIMAL(14,2) NULL DEFAULT 0`);
  } catch (error: any) {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  }
};

// Initialize columns on startup
ensureColorSplitColumn();
ensureSalesTaxColumns().catch((error) => {
  console.error("Failed to ensure GST/bank columns on sales table:", error);
});
ensureSaleItemCostColumns().catch((error) => {
  console.error("Failed to ensure cost columns on sale_items table:", error);
});

const DEFAULT_GST_RATE = 5;
const normalizeLocation = (value: any): string =>
  String(value || "").trim().toUpperCase();
const stockColumnForLocation = (location: any): "stock" | "erode_stock" =>
  normalizeLocation(location) === "ERODE" ? "erode_stock" : "stock";

const deriveStatus = (totalAmount: number, paidAmount: number): string => {
  if (paidAmount <= 0) return "NOT_PAID";
  if (paidAmount >= totalAmount) return "PAID";
  return "HALF_PAID";
};

const normalizePincode = (value: any): string => String(value || "").trim();

const stateCodeFromGstin = (gstin: any): string => {
  const cleaned = String(gstin || "").trim();
  const code = cleaned.slice(0, 2);
  return /^\d{2}$/.test(code) ? code : "";
};

const isLikelyInterState = (
  customerGstin: any,
  customerPincode: any,
  shopGstin: any,
  shopPincode: any
): boolean => {
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

const round2 = (value: number): number => Number((Number(value) || 0).toFixed(2));

const computeTaxBreakdown = ({
  totalAmount,
  gstRate,
  customerGstin,
  customerPincode,
  shopGstin,
  shopPincode,
}: {
  totalAmount: number;
  gstRate: number;
  customerGstin?: any;
  customerPincode?: any;
  shopGstin?: any;
  shopPincode?: any;
}) => {
  const taxableAmount = round2(totalAmount);
  const safeRate = Number.isFinite(Number(gstRate)) ? Number(gstRate) : DEFAULT_GST_RATE;
  const interState = isLikelyInterState(customerGstin, customerPincode, shopGstin, shopPincode);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (interState) {
    igstAmount = round2((taxableAmount * safeRate) / 100);
  } else {
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

// Helper function to safely fetch customer with optional pincode column
const safeFetchCustomer = async (conn: any, customerId: string, shopId: string) => {
  try {
    const [rows] = await conn.query(
      `SELECT gstin, pincode FROM accounts WHERE id = ? AND shop_id = ?`,
      [customerId, shopId]
    );
    return (rows as any[])[0] || {};
  } catch (error: any) {
    if (error.code === "ER_BAD_FIELD_ERROR") {
      const [rows] = await conn.query(
        `SELECT gstin FROM accounts WHERE id = ? AND shop_id = ?`,
        [customerId, shopId]
      );
      return (rows as any[])[0] || {};
    }
    throw error;
  }
};

const safeFetchShop = async (conn: any, shopId: string) => {
  try {
    const [rows] = await conn.query(
      `SELECT gstin, pincode FROM shops WHERE id = ?`,
      [shopId]
    );
    return (rows as any[])[0] || {};
  } catch (error: any) {
    if (error.code === "ER_BAD_FIELD_ERROR") {
      const [rows] = await conn.query(
        `SELECT gstin FROM shops WHERE id = ?`,
        [shopId]
      );
      return (rows as any[])[0] || {};
    }
    throw error;
  }
};

// Helper for safe SELECT with pincode fallback
const safeSelectWithPincode = async (query: string, params: any[]) => {
  try {
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error: any) {
    if (error.code === "ER_BAD_FIELD_ERROR") {
      const fallbackQuery = query
        .replace(/,?\s*a\.pincode/g, "")
        .replace(/COALESCE\(s\.customer_pincode,\s*a\.pincode\)/g, "s.customer_pincode");
      const [rows] = await pool.query(fallbackQuery, params);
      return rows;
    }
    throw error;
  }
};

// ─── POST /sales ──────────────────────────────────────────────────────────────
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
      through,
      customerPincode = "",
      gstRate = DEFAULT_GST_RATE,
      bankId = null,
      location = null,
    } = req.body;

    const id = uuidv4();
    const resolvedLocation = normalizeLocation(location) || null;

    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items is required" });
    }

    const [countRows]: any = await conn.query(
      `SELECT COUNT(*) as total FROM sales WHERE shop_id = ?`,
      [req.shop.shop_id]
    );
    const nextNumber = countRows[0].total + 1;
    const invoice_no = `KT-0${nextNumber.toString().padStart(2, "0")}`;

    const totalQty = items.reduce((sum: number, i: any) => sum + i.qty, 0);
    const status = deriveStatus(Number(grandTotal || 0), Number(paidAmount || 0));

    const customer = await safeFetchCustomer(conn, customerId, req.shop.shop_id);
    const shop = await safeFetchShop(conn, req.shop.shop_id);

    const resolvedPincode =
      normalizePincode(customerPincode) || normalizePincode(customer.pincode || "");
    const tax = computeTaxBreakdown({
      totalAmount: Number(grandTotal || 0),
      gstRate: Number(gstRate || DEFAULT_GST_RATE),
      customerGstin: customer.gstin,
      customerPincode: resolvedPincode,
      shopGstin: shop.gstin,
      shopPincode: shop.pincode || "",
    });

    await conn.query(
      `INSERT INTO sales
        (id, shop_id, location, customer_id, invoice_no, total_qty, total_amount, paid_amount, status,
         payment_mode, bank_id, notes, through_agent,
         customer_pincode, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_after_tax,
         cost_total, profit_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        resolvedLocation,
        customerId,
        invoice_no,
        totalQty,
        grandTotal,
        paidAmount,
        status,
        paymentMode,
        bankId || null,
        notes,
        through,
        resolvedPincode || null,
        tax.gstRate,
        tax.taxableAmount,
        tax.cgstAmount,
        tax.sgstAmount,
        tax.igstAmount,
        tax.totalAfterTax,
        0,
        0,
      ]
    );

    const stockCol = stockColumnForLocation(resolvedLocation);
    let saleCostTotal = 0;
    for (const item of items) {
      const qty = Number(item.qty || item.quantity) || 0;
      const productId = item.productId || item.product_id || null;
      let costPrice = 0;
      if (productId) {
        const [prodRows]: any = await conn.query(
          `SELECT average_cost FROM products WHERE id = ? AND shop_id = ?`,
          [productId, req.shop.shop_id]
        );
        costPrice = Number(prodRows?.[0]?.average_cost || 0);
      }
      const itemCostTotal = costPrice * qty;
      saleCostTotal += itemCostTotal;

      await conn.query(
        `INSERT INTO sale_items
          (sale_id, product_id, hsn, size, description, rate, quantity, discount, total, color_split, cost_price, cost_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          productId,
          item.hsn,
          item.size,
          item.description,
          item.rate,
          qty,
          item.discount || 0,
          item.total,
          item.colorSplit ? JSON.stringify(item.colorSplit) : null,
          costPrice,
          itemCostTotal,
        ]
      );

      // Update product stock based on color split
      if (!productId) {
        continue;
      }

      if (item.colorSplit && Array.isArray(item.colorSplit)) {
        // Update color stock
        const [productRows]: any = await conn.query(
          `SELECT color_stock FROM products WHERE id = ? AND shop_id = ?`,
          [productId, req.shop.shop_id]
        );
        
        if (productRows.length > 0) {
          const currentColorStock = productRows[0].color_stock ? JSON.parse(productRows[0].color_stock) : [];
          const updatedColorStock = currentColorStock.map((stockItem: any) => {
            const soldColor = item.colorSplit.find((c: any) => c.color === stockItem.color);
            if (soldColor) {
              return { ...stockItem, qty: Math.max(0, stockItem.qty - soldColor.qty) };
            }
            return stockItem;
          });
          
          await conn.query(
            `UPDATE products SET color_stock = ? WHERE id = ? AND shop_id = ?`,
            [JSON.stringify(updatedColorStock), productId, req.shop.shop_id]
          );
        }
      } else {
        // Fallback to regular stock update if no color split
        await conn.query(
          `UPDATE products SET ${stockCol} = ${stockCol} - ? WHERE id = ? AND shop_id = ?`,
          [qty, productId, req.shop.shop_id]
        );
      }
    }

    const profitAmount = Number(grandTotal || 0) - saleCostTotal;
    await conn.query(
      `UPDATE sales SET cost_total = ?, profit_amount = ? WHERE id = ? AND shop_id = ?`,
      [saleCostTotal, profitAmount, id, req.shop.shop_id]
    );

    if (paidAmount > 0) {
      await conn.query(
        `INSERT INTO sale_payments (sale_id, shop_id, amount, payment_mode, note, paid_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          id,
          req.shop.shop_id,
          paidAmount,
          paymentMode === "CREDIT" ? "CASH" : paymentMode,
          "Initial payment",
        ]
      );

      // Record cash transaction if payment mode is CASH
      if (paymentMode === "CASH") {
        await conn.query(
          `INSERT INTO cash_in_hand 
           (shop_id, transaction_type, amount, description, reference_type, reference_id, created_at)
           VALUES (?, 'IN', ?, 'Cash received from sale', 'SALE', ?, NOW())`,
          [req.shop.shop_id, paidAmount, id]
        );
      }
    }

    const balanceAmount = Number(grandTotal || 0) - Number(paidAmount || 0);
    if (balanceAmount > 0) {
      await conn.query(
        `UPDATE accounts SET balance = balance + ? WHERE id = ? AND shop_id = ?`,
        [balanceAmount, customerId, req.shop.shop_id]
      );
    }

    await conn.commit();

    // Auto-generate E-way bill for sales over ₹50,000
    if (Number(grandTotal || 0) > 50000) {
      try {
        const isInterState = isLikelyInterState(customer.gstin, resolvedPincode, shop.gstin, shop.pincode || "");
        
        // Default transport details (can be updated later)
        const distance_km = isInterState ? 300 : 100; // Default distances
        const from_state = 'Unknown'; // Shop state - would need to be added to shops table
        const to_state = 'Unknown'; // Customer state - would need to be added to accounts table
        const from_pincode = shop.pincode || '';
        const to_pincode = resolvedPincode;
        
        await conn.query(
          `INSERT INTO eway_bills 
            (shop_id, sale_id, eway_bill_no, valid_from, valid_until, distance_km, transport_mode, 
             from_state, to_state, from_pincode, to_pincode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.shop.shop_id,
            id,
            `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 12), // Generate E-way bill number
            new Date(),
            new Date(Date.now() + (isInterState ? 3 : 1) * 24 * 60 * 60 * 1000), // 3 days for interstate, 1 day for intrastate
            distance_km,
            'ROAD',
            from_state,
            to_state,
            from_pincode,
            to_pincode
          ]
        );
        
        console.log('E-way bill auto-generated for sale:', invoice_no);
      } catch (ewayError) {
        // Log error but don't fail the sale creation
        console.error('Failed to auto-generate E-way bill:', ewayError);
      }
    }

    res.status(201).json({ id, invoice_no, status });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// ─── GET /sales ───────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  try {
    const { search, status, location } = req.query;

    let query = `
      SELECT
        s.id, s.customer_id, s.invoice_no, s.total_qty, s.total_amount,
        s.paid_amount, s.balance_amount, s.status,
        s.payment_mode, s.bank_id, s.through_agent, s.notes, s.created_at, s.updated_at,
        s.customer_pincode, s.gst_rate, s.taxable_amount, s.cgst_amount, s.sgst_amount,
        s.igst_amount, s.total_after_tax,
        a.name AS customer_name, a.gstin AS customer_gstin,
        a.phone AS customer_phone,
        b.bank_name AS bank_name,
        b.account_number AS bank_account_number,
        b.ifsc_code AS bank_ifsc_code
      FROM sales s
      JOIN accounts a ON a.id = s.customer_id
      LEFT JOIN banks b ON b.id = s.bank_id
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

    // Add location filter if provided
    if (location) {
      query += ` AND s.location = ?`;
      params.push(location);
    }

    query += ` ORDER BY s.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// ─── GET /sales/with-images ───────────────────────────────────────────────────
router.get("/with-images", async (req: AuthRequest, res) => {
  try {
    const { location } = req.query as any;
    let query = `
      SELECT s.*, a.name as customer_name, a.phone as customer_phone,
              a.address as customer_address, a.gstin as customer_gstin,
              b.bank_name AS bank_name
       FROM sales s
       LEFT JOIN accounts a ON s.customer_id = a.id
       LEFT JOIN banks b ON b.id = s.bank_id
       WHERE s.image_path IS NOT NULL AND s.shop_id = ?
    `;
    const params: any[] = [req.shop.shop_id];
    if (location) {
      query += ` AND s.location = ?`;
      params.push(location);
    }
    query += ` ORDER BY s.created_at DESC`;
    const [rows] = await pool.query(query, params);

    const data = (rows as any[]).map((row) => ({
      id: row.id,
      type: "SALE",
      created_at: row.created_at,
      imageUrl: `${process.env.API_URL || "http://localhost:5000"}/uploads/sales-invoices/${row.image_path}`,
      invoice_no: row.invoice_no,
      customer_name: row.customer_name || null,
      bank_name: row.bank_name || null,
      total_amount: row.total_amount,
      paid_amount: row.paid_amount || 0,
      balance_amount:
        row.balance_amount ||
        Number(row.total_amount) - Number(row.paid_amount || 0),
      total_qty: row.total_qty,
      status: row.status,
      payment_mode: row.payment_mode,
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch sales images", details: error.message });
  }
});

// ─── GET /sales/:id ───────────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const rows = await safeSelectWithPincode(
      `SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin,
              COALESCE(s.customer_pincode, a.pincode) AS customer_pincode,
              b.bank_name AS bank_name,
              b.account_number AS bank_account_number,
              b.ifsc_code AS bank_ifsc_code
       FROM sales s
       LEFT JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN banks b ON b.id = s.bank_id
       WHERE s.id = ?`,
      [id]
    );

    if (!(rows as any[]).length) return res.status(404).json({ error: "Sale not found" });

    const [items]: any = await pool.query(
      `SELECT * FROM sale_items WHERE sale_id = ?`,
      [id]
    );
    const [payments]: any = await pool.query(
      `SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY paid_at DESC`,
      [id]
    );

    res.json({ ...(rows as any[])[0], items, payments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sale" });
  }
});

// ─── PUT /sales/:id ───────────────────────────────────────────────────────────
router.put("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const {
      customer_id,
      customerId,
      items,
      payment_mode = "CREDIT",
      paymentMode,
      paid_amount = 0,
      paidAmount,
      through_agent = null,
      through = null,
      notes = null,
      bankId = null,
      bank_id = null,
    } = req.body;

    const resolvedCustomerId = customer_id || customerId;
    const resolvedPaymentMode = payment_mode || paymentMode;
    const resolvedPaid = Number(paid_amount || paidAmount || 0);
    const resolvedBankId = bankId || bank_id || null;

    if (!resolvedCustomerId) {
      await conn.rollback();
      return res.status(400).json({ error: "customer_id is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "items is required" });
    }

    const [saleRows]: any = await conn.query(
      `SELECT location FROM sales WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    const saleLocation = saleRows?.[0]?.location;
    const stockCol = stockColumnForLocation(saleLocation);

    const grandTotal = items.reduce(
      (s: number, i: any) => s + Number(i.total || 0),
      0
    );
    const balance = Math.max(0, grandTotal - resolvedPaid);
    const status = deriveStatus(grandTotal, resolvedPaid);
    let saleCostTotal = 0;

    // Rollback old stock
    const [oldItems]: any = await conn.query(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`,
      [id]
    );
    for (const item of oldItems) {
      if (item.product_id) {
        await conn.query(
          `UPDATE products SET ${stockCol} = ${stockCol} + ? WHERE id = ? AND shop_id = ?`,
          [item.quantity, item.product_id, req.shop.shop_id]
        );
      }
    }

    await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);

    for (const item of items) {
      const qty = Number(item.qty || item.quantity) || 1;
      const productId = item.productId || item.product_id || null;
      let costPrice = 0;
      if (productId) {
        const [prodRows]: any = await conn.query(
          `SELECT average_cost FROM products WHERE id = ? AND shop_id = ?`,
          [productId, req.shop.shop_id]
        );
        costPrice = Number(prodRows?.[0]?.average_cost || 0);
      }
      const itemCostTotal = costPrice * qty;
      saleCostTotal += itemCostTotal;

      await conn.query(
        `INSERT INTO sale_items
           (sale_id, product_id, hsn, size, description, rate, quantity, total, color_split, cost_price, cost_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          productId,
          item.hsn || null,
          item.size || null,
          item.description || null,
          Number(item.rate) || 0,
          qty,
          Number(item.total) || 0,
          item.colorSplit ? JSON.stringify(item.colorSplit) : (item.color_split ? JSON.stringify(item.color_split) : null),
          costPrice,
          itemCostTotal
        ]
      );

      // Update product stock based on color split
      const colorData = item.colorSplit || item.color_split;
      if (productId && colorData && Array.isArray(colorData)) {
        // Update color stock
        const [productRows]: any = await conn.query(
          `SELECT color_stock FROM products WHERE id = ? AND shop_id = ?`,
          [item.productId || item.product_id, req.shop.shop_id]
        );
        
        if (productRows.length > 0) {
          const currentColorStock = productRows[0].color_stock ? JSON.parse(productRows[0].color_stock) : [];
          const updatedColorStock = currentColorStock.map((stockItem: any) => {
            const soldColor = colorData.find((c: any) => c.color === stockItem.color);
            if (soldColor) {
              return { ...stockItem, qty: Math.max(0, stockItem.qty - soldColor.qty) };
            }
            return stockItem;
          });
          
          await conn.query(
            `UPDATE products SET color_stock = ? WHERE id = ? AND shop_id = ?`,
            [JSON.stringify(updatedColorStock), item.productId || item.product_id, req.shop.shop_id]
          );
        }
      } else if (productId) {
        // Fallback to regular stock update if no color split
        await conn.query(
          `UPDATE products SET ${stockCol} = ${stockCol} - ? WHERE id = ? AND shop_id = ?`,
          [
            qty,
            productId,
            req.shop.shop_id,
          ]
        );
      }
    }

    const profitAmount = Number(grandTotal || 0) - saleCostTotal;
    await conn.query(
      `UPDATE sales
       SET customer_id = ?, total_amount = ?, paid_amount = ?, balance_amount = ?,
           payment_mode = ?, bank_id = ?, status = ?, through_agent = ?, notes = ?, 
           cost_total = ?, profit_amount = ?, updated_at = NOW()
       WHERE id = ? AND shop_id = ?`,
      [
        resolvedCustomerId,
        grandTotal,
        resolvedPaid,
        balance,
        resolvedPaymentMode,
        resolvedBankId,
        status,
        through_agent || through,
        notes,
        saleCostTotal,
        profitAmount,
        id,
        req.shop.shop_id,
      ]
    );

    await conn.commit();
    res.json({ message: "Sale updated successfully" });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message || "Failed to update sale" });
  } finally {
    conn.release();
  }
});

// ─── PUT /sales/:id/tax-details ───────────────────────────────────────────────
router.put("/:id/tax-details", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { customerPincode = "", gstRate = DEFAULT_GST_RATE } = req.body;

    const [saleRows]: any = await conn.query(
      `SELECT s.*, a.gstin AS customer_gstin
       FROM sales s
       LEFT JOIN accounts a ON a.id = s.customer_id
       WHERE s.id = ? AND s.shop_id = ?`,
      [id, req.shop.shop_id]
    );
    if (!saleRows.length) return res.status(404).json({ error: "Sale not found" });
    const sale = saleRows[0];

    const shop = await safeFetchShop(conn, req.shop.shop_id);

    const resolvedPincode =
      normalizePincode(customerPincode) ||
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

    await conn.query(
      `UPDATE sales
       SET customer_pincode = ?, gst_rate = ?, taxable_amount = ?, cgst_amount = ?,
           sgst_amount = ?, igst_amount = ?, total_after_tax = ?, updated_at = NOW()
       WHERE id = ? AND shop_id = ?`,
      [
        resolvedPincode || null,
        tax.gstRate,
        tax.taxableAmount,
        tax.cgstAmount,
        tax.sgstAmount,
        tax.igstAmount,
        tax.totalAfterTax,
        id,
        req.shop.shop_id,
      ]
    );

    const [updatedRows]: any = await safeSelectWithPincode(
      `SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin,
              COALESCE(s.customer_pincode, a.pincode) AS customer_pincode,
              b.bank_name AS bank_name
       FROM sales s
       LEFT JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN banks b ON b.id = s.bank_id
       WHERE s.id = ? AND s.shop_id = ?`,
      [id, req.shop.shop_id]
    );

    res.json({ message: "Tax details updated", sale: updatedRows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update tax details" });
  } finally {
    conn.release();
  }
});

// ─── DELETE /sales/:id ────────────────────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const { id } = req.params;

    const [saleRows]: any = await conn.query(
      `SELECT location FROM sales WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    const saleLocation = saleRows?.[0]?.location;
    const stockCol = stockColumnForLocation(saleLocation);

    const [items]: any = await conn.query(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`,
      [id]
    );
    for (const item of items) {
      if (item.product_id) {
        await conn.query(
          `UPDATE products SET ${stockCol} = ${stockCol} + ? WHERE id = ? AND shop_id = ?`,
          [item.quantity, item.product_id, req.shop.shop_id]
        );
      }
    }

    await conn.query(`DELETE FROM sale_payments WHERE sale_id = ?`, [id]);
    await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);
    await conn.query(
      `DELETE FROM sales WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );

    await conn.commit();
    res.json({ message: "Sale deleted successfully" });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// ─── GET /sales/:id/download ──────────────────────────────────────────────────
router.get("/:id/download", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const rows = await safeSelectWithPincode(
      `SELECT s.*, a.name AS customer_name, a.address AS customer_address,
              a.phone AS customer_phone, a.gstin AS customer_gstin,
              COALESCE(s.customer_pincode, a.pincode) AS customer_pincode,
              b.bank_name AS bank_name,
              b.account_number AS bank_account_number,
              b.ifsc_code AS bank_ifsc_code
       FROM sales s
       LEFT JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN banks b ON b.id = s.bank_id
       WHERE s.id = ? AND s.shop_id = ?`,
      [id, req.shop.shop_id]
    );

    if (!(rows as any[]).length) return res.status(404).json({ error: "Sale not found" });
    const sale = (rows as any[])[0];

    let shop: any = {};
    try {
      const [shopRows]: any = await pool.query(
        `SELECT * FROM shops WHERE id = ?`,
        [req.shop.shop_id]
      );
      if (shopRows.length) shop = shopRows[0];
    } catch (_) {}

    const [items]: any = await pool.query(
      `SELECT * FROM sale_items WHERE sale_id = ?`,
      [id]
    );
    const [payments]: any = await pool.query(
      `SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY paid_at ASC`,
      [id]
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sale.invoice_no}.pdf`
    );
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
      .text(
        shop.address ||
          "34, No-1 PandariNadhar Street, Ammapet, Salem - 636003",
        { align: "center" }
      );
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
      .text("SALES INVOICE", { align: "center" });
    doc.moveDown(1.5);

    // Customer + Invoice info box
    const startY = doc.y;
    doc
      .rect(40, startY, 515, 130)
      .stroke()
      .fontSize(10)
      .font("Helvetica");
    doc.text(`Customer: ${sale.customer_name}`, 50, startY + 10);
    doc.text(`Address: ${sale.customer_address || "-"}`, 50, startY + 25);
    doc.text(`Phone: ${sale.customer_phone || "-"}`, 50, startY + 40);
    doc.text(`GST No: ${sale.customer_gstin || "-"}`, 50, startY + 55);
    doc.text(`Pincode: ${sale.customer_pincode || "-"}`, 50, startY + 70);

    doc.text(`Invoice No: ${sale.invoice_no}`, 350, startY + 10);
    doc.text(
      `Date: ${new Date(sale.created_at).toLocaleDateString()}`,
      350,
      startY + 25
    );
    doc.text(`Payment Mode: ${sale.payment_mode || "-"}`, 350, startY + 40);
    // Show bank details if paid via bank transfer
    if (sale.bank_name) {
      doc.text(`Bank: ${sale.bank_name}`, 350, startY + 55);
      if (sale.bank_account_number)
        doc.text(`A/C: ${sale.bank_account_number}`, 350, startY + 70);
      if (sale.bank_ifsc_code)
        doc.text(`IFSC: ${sale.bank_ifsc_code}`, 350, startY + 85);
    }
    doc.text(
      `Status: ${(sale.status || "NOT_PAID").replace("_", " ")}`,
      350,
      startY + (sale.bank_name ? 100 : 55)
    );

    doc.moveDown(8);

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
    items.forEach((item: any, i: number) => {
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

    // Totals
    const grandTotal = items.reduce(
      (s: number, i: any) => s + Number(i.total),
      0
    );
    y += 10;
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Grand Total: ₹${grandTotal.toLocaleString()}`, 0, y, {
        align: "right",
      });
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Paid: ₹${Number(sale.paid_amount).toLocaleString()}`, 0, y + 18, {
        align: "right",
      });
    doc.text(
      `Balance Due: ₹${(grandTotal - Number(sale.paid_amount || 0)).toLocaleString()}`,
      0,
      y + 34,
      { align: "right" }
    );

    // GST breakdown if available
    if (sale.gst_rate && Number(sale.taxable_amount) > 0) {
      y += 60;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("GST Breakdown", 40, y);
      y += 15;
      doc.font("Helvetica");
      doc.text(`Taxable Amount: ₹${Number(sale.taxable_amount).toLocaleString()}`, 40, y);
      if (Number(sale.cgst_amount) > 0) {
        doc.text(`CGST (${sale.gst_rate / 2}%): ₹${Number(sale.cgst_amount).toLocaleString()}`, 40, y + 14);
        doc.text(`SGST (${sale.gst_rate / 2}%): ₹${Number(sale.sgst_amount).toLocaleString()}`, 40, y + 28);
      }
      if (Number(sale.igst_amount) > 0) {
        doc.text(`IGST (${sale.gst_rate}%): ₹${Number(sale.igst_amount).toLocaleString()}`, 40, y + 14);
      }
      doc
        .font("Helvetica-Bold")
        .text(`Total After Tax: ₹${Number(sale.total_after_tax).toLocaleString()}`, 40, y + 42);
    }

    // Payment history
    if (payments && payments.length > 0) {
      y += 90;
      doc.fontSize(10).font("Helvetica-Bold").text("Payment History", 40, y);
      y += 14;
      doc.font("Helvetica");
      payments.forEach((p: any) => {
        doc.text(
          `${new Date(p.paid_at).toLocaleDateString()} — ₹${Number(p.amount).toLocaleString()} (${p.payment_mode})${p.note ? ` — ${p.note}` : ""}`,
          40,
          y
        );
        y += 14;
      });
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

// ─── GET /sales/:id/reminder-pdf ─────────────────────────────────────────────
router.get("/:accountId/reminder-pdf", async (req: AuthRequest, res) => {
  try {
    const { accountId } = req.params;
    const module = req.query.module as string;

    const [accountRows]: any = await pool.query(
      `SELECT * FROM accounts WHERE id = ? AND shop_id = ?`,
      [accountId, req.shop.shop_id]
    );
    if (!accountRows.length)
      return res.status(404).json({ error: "Account not found" });
    const account = accountRows[0];

    const [salesRows]: any = await pool.query(
      `SELECT s.*, b.bank_name FROM sales s
       LEFT JOIN banks b ON b.id = s.bank_id
       WHERE s.customer_id = ? AND s.shop_id = ?
       ORDER BY s.created_at DESC`,
      [accountId, req.shop.shop_id]
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${account.name}-payment-reminder.pdf`
    );
    doc.pipe(res);

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PAYMENT REMINDER", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(`To: ${account.name}`, 40);
    if (account.phone) doc.text(`Phone: ${account.phone}`, 40);
    doc.moveDown(1);

    const totalDue = salesRows.reduce(
      (s: number, r: any) =>
        s + Math.max(0, Number(r.total_amount) - Number(r.paid_amount || 0)),
      0
    );
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`Total Outstanding: ₹${totalDue.toLocaleString()}`, { align: "center" });
    doc.moveDown(1);

    salesRows.forEach((sale: any, i: number) => {
      const bal = Number(sale.total_amount) - Number(sale.paid_amount || 0);
      if (bal > 0) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(
            `${i + 1}. ${sale.invoice_no} — ₹${Number(sale.total_amount).toLocaleString()} — Due: ₹${bal.toLocaleString()} — ${new Date(sale.created_at).toLocaleDateString()}`
          );
      }
    });

    doc.end();
  } catch (err) {
    console.error("Reminder PDF error:", err);
    res.status(500).json({ error: "Failed to generate reminder PDF" });
  }
});

// ─── POST /sales/return ─────────────────────────────────────────────────────
router.post("/return", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  
  try {
    const {
      sale_id,
      items, // Array of returned items with product_id and quantity
      return_reason = 'Items returned'
    } = req.body;

    // Validate sale exists
    const [saleCheck] = await conn.query(
      'SELECT id, invoice_no, location FROM sales WHERE id = ? AND shop_id = ?',
      [sale_id, req.shop.shop_id]
    ) as any[];

    if (!saleCheck.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Sale not found' });
    }

    const stockCol = stockColumnForLocation((saleCheck as any[])[0]?.location);

    // Process each returned item
    for (const item of items) {
      // Add quantity back to stock
      await conn.query(
        `UPDATE products 
         SET ${stockCol} = ${stockCol} + ? 
         WHERE id = ? AND shop_id = ?`,
        [item.quantity, item.product_id, req.shop.shop_id]
      );

      console.log(`Returned ${item.quantity} units of product ${item.product_id} to stock`);
    }

    await conn.commit();

    res.status(201).json({
      message: 'Items returned successfully',
      sale_id,
      items_processed: items.length,
      stock_updated: true
    });

  } catch (error: any) {
    await conn.rollback();
    console.error('Sales return error:', error);
    res.status(500).json({ 
      error: 'Failed to process return', 
      details: error.message 
    });
  } finally {
    conn.release();
  }
});

export default router;
