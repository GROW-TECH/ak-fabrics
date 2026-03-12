/**
 * Seed minimal P&L sample data:
 * - Vendor: Test Vendor
 * - Customer: Test Customer
 * - Product: Cotton Fabric Roll
 * - Purchase with POE: 10 qty @ ₹800, POE ₹1000
 * - Sale: 5 qty @ ₹1500
 *
 * Expected after run (same day):
 *   Revenue: 7500
 *   COGS (with POE in avg cost): ~4500
 *   Other Expenses (POE): 1000
 *   Gross Profit: ~3000
 *   Net Profit: ~2000
 *
 * Run: node server/scripts/seed-pnl-sample.js
 */

const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "xiadot.com",
  user: process.env.DB_USER || "ak_fabrics",
  password: process.env.DB_PASSWORD || "ak_fabrics",
  database: process.env.DB_NAME || "ak_fabrics",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+05:30",
  dateStrings: true,
});

async function getShopId(conn) {
  const [rows] = await conn.query("SELECT id FROM shops LIMIT 1");
  if (!rows.length) throw new Error("No shops found; cannot seed data.");
  return rows[0].id;
}

async function ensureAccount(conn, shopId, name, type, phone) {
  const [existing] = await conn.query(
    "SELECT id FROM accounts WHERE shop_id = ? AND name = ? LIMIT 1",
    [shopId, name]
  );
  if (existing.length) return existing[0].id;

  const id = uuidv4();
  await conn.query(
    "INSERT INTO accounts (id, shop_id, name, type, phone, balance) VALUES (?, ?, ?, ?, ?, 0)",
    [id, shopId, name, type, phone]
  );
  return id;
}

async function ensureProduct(conn, shopId) {
  const [existing] = await conn.query(
    "SELECT id FROM products WHERE shop_id = ? AND name = ? LIMIT 1",
    [shopId, "Cotton Fabric Roll"]
  );
  if (existing.length) return existing[0].id;

  const id = uuidv4();
  await conn.query(
    `INSERT INTO products
      (id, shop_id, name, price, stock, isActive, hsn, designNo, average_cost)
     VALUES (?, ?, ?, ?, 0, 1, ?, ?, 0)`,
    [id, shopId, "Cotton Fabric Roll", 1500, "5208", "TST-001"]
  );
  return id;
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const shopId = await getShopId(conn);
    const vendorId = await ensureAccount(
      conn,
      shopId,
      "Test Vendor",
      "VENDOR",
      "9000000011"
    );
    const customerId = await ensureAccount(
      conn,
      shopId,
      "Test Customer",
      "CUSTOMER",
      "9000000022"
    );
    const productId = await ensureProduct(conn, shopId);

    // Purchase with POE
    const purchaseId = uuidv4();
    const purchaseQty = 10;
    const purchaseRate = 100;
    const purchaseTotal = purchaseQty * purchaseRate; // 1000
    const poeAmount = 1000;
    const grandTotal = purchaseTotal + poeAmount;
    const allocatedPoePerUnit = poeAmount / purchaseQty; // 100 each
    const avgCostPerUnit = purchaseRate + allocatedPoePerUnit; // 200

    // purchase invoice number
    const [countRows] = await conn.query(
      "SELECT COUNT(*) as total FROM purchases WHERE shop_id = ?",
      [shopId]
    );
    const nextNumber = countRows[0].total + 1;
    const purchaseInvoice = `KT-TEST-P${nextNumber}`;

  await conn.query(
    `INSERT INTO purchases
       (id, shop_id, vendor_id, invoice_no, total_amount, poe, payment_mode, paid_amount, balance_amount, payment_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'CREDIT', 0, ?, 'NOT_PAID', ?)`,
    [
      purchaseId,
      shopId,
      vendorId,
      purchaseInvoice,
      grandTotal,
      poeAmount,
      grandTotal,
      "Seed POE test (10 qty @100, POE 1000)",
    ]
  );

    await conn.query(
      `INSERT INTO purchase_items
       (purchase_id, product_id, rate, quantity, total)
       VALUES (?, ?, ?, ?, ?)`,
      [purchaseId, productId, purchaseRate, purchaseQty, purchaseTotal]
    );

    // Update product stock and average_cost
    const [prodRows] = await conn.query(
      "SELECT stock, erode_stock, average_cost FROM products WHERE id = ? AND shop_id = ?",
      [productId, shopId]
    );
    const currentStock =
      Number(prodRows?.[0]?.stock || 0) +
      Number(prodRows?.[0]?.erode_stock || 0);
    const currentAvg = Number(prodRows?.[0]?.average_cost || 0);
    const newAvg =
      (currentStock * currentAvg + grandTotal) /
      Math.max(currentStock + purchaseQty, 1);

    await conn.query(
      "UPDATE products SET stock = stock + ?, average_cost = ? WHERE id = ? AND shop_id = ?",
      [purchaseQty, Number.isFinite(newAvg) ? newAvg : currentAvg, productId, shopId]
    );

    // Sale consuming 5 units
    const saleId = uuidv4();
    const saleQty = 5;
    const saleRate = 420; // break-even + small profit after POE
    const saleTotal = saleQty * saleRate; // 2100
    const costPrice = Number.isFinite(newAvg) ? newAvg : avgCostPerUnit;
    const saleCostTotal = costPrice * saleQty;
    const profitAmount = saleTotal - saleCostTotal;

    const [saleCount] = await conn.query(
      "SELECT COUNT(*) as total FROM sales WHERE shop_id = ?",
      [shopId]
    );
    const nextSaleNo = saleCount[0].total + 1;
    const saleInvoice = `KT-TEST-S${nextSaleNo}`;

    await conn.query(
      `INSERT INTO sales
        (id, shop_id, customer_id, invoice_no, total_qty, total_amount, paid_amount, balance_amount, status,
         payment_mode, bank_id, notes, cost_total, profit_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PAID', 'CASH', NULL, 'Seed POE sale', ?, ?, NOW())`,
      [
        saleId,
        shopId,
        customerId,
        saleInvoice,
        saleQty,
        saleTotal,
        saleTotal,
        saleCostTotal,
        profitAmount,
      ]
    );

    await conn.query(
      `INSERT INTO sale_items
        (sale_id, product_id, rate, quantity, total, cost_price, cost_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [saleId, productId, saleRate, saleQty, saleTotal, costPrice, saleCostTotal]
    );

    await conn.query(
      "UPDATE products SET stock = stock - ? WHERE id = ? AND shop_id = ?",
      [saleQty, productId, shopId]
    );

    await conn.query(
      `INSERT INTO sale_payments (sale_id, shop_id, amount, payment_mode, note, paid_at)
       VALUES (?, ?, ?, 'CASH', 'Initial payment', NOW())`,
      [saleId, shopId, saleTotal]
    );

    await conn.commit();
    console.log("✅ Seeded sample P&L data (10 @100, POE 1000; sold 5 @420).");
    console.log({
      shopId,
      vendorId,
      customerId,
      productId,
      purchaseInvoice,
      saleInvoice,
      revenue: saleTotal,
      cogs: saleCostTotal,
      other_expenses: poeAmount,
      gross_profit: saleTotal - saleCostTotal,
      net_profit: saleTotal - saleCostTotal - poeAmount,
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Seed failed:", err.message);
  } finally {
    conn.release();
    pool.end();
  }
}

seed();
