import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { authenticate, AuthRequest } from "../middleware/auth";
import pool from "../db";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(authenticate);

const salesUploadDir = path.join(__dirname, "../uploads/sales-invoices");
const purchaseUploadDir = path.join(__dirname, "../uploads/purchase-invoices");

[salesUploadDir, purchaseUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ensureImageTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS uploaded_invoice_images (
      id VARCHAR(36) PRIMARY KEY,
      shop_id VARCHAR(36) NOT NULL,
      doc_type ENUM('SALE','PURCHASE') NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
};

void ensureImageTable().catch((err) => {
  console.error("Failed to ensure uploaded_invoice_images table:", err);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isSales = req.path.includes("/sales/");
    cb(null, isSales ? salesUploadDir : purchaseUploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `inv_${Date.now()}_${Math.floor(Math.random() * 10000)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const imageUrl = (
  req: AuthRequest,
  filename: string | null,
  type: "sales" | "purchase"
): string | null => {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:5000";
  const folder = type === "sales" ? "sales-invoices" : "purchase-invoices";
  return `${proto}://${host}/uploads/${folder}/${filename}`;
};

router.post("/sales/scan-image", upload.single("image"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file provided" });

    const shopId = req.shop.shop_id;
    const imageFilename = req.file.filename;
    const salesId = uuidv4();
    const invoiceNo = `SAL${(Date.now() % 10000000).toString().padStart(7, "0")}`;

    // Create a new sales record with the uploaded image - simplified without customer
    await pool.query(
      `INSERT INTO sales 
        (id, shop_id, invoice_no, total_qty, total_amount, paid_amount, status, payment_mode, notes, through_agent, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        salesId,
        shopId,
        invoiceNo,
        0, // total_qty
        0, // total_amount
        0, // paid_amount
        "NOT_PAID",
        "CREDIT",
        "Created from uploaded image",
        null,
        imageFilename
      ]
    );

    res.json({
      success: true,
      salesId: salesId,
      invoiceNo: invoiceNo,
      imageUrl: imageUrl(req, imageFilename, 'sales'),
      message: "Sales invoice created from uploaded image. Please complete the invoice details."
    });

  } catch (error: any) {
    console.error("Sales image upload error:", error);
    res.status(500).json({ error: "Failed to create sales invoice", details: error.message });
  }
});

router.post("/purchases/scan-image", upload.single("image"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file provided" });

    const shopId = req.shop.shop_id;
    const imageFilename = req.file.filename;
    const purchaseId = uuidv4();
    const invoiceNo = `PUR${(Date.now() % 10000000).toString().padStart(7, "0")}`;

    // Create a new purchase record with the uploaded image - simplified without vendor
    await pool.query(
      `INSERT INTO purchases
        (id, shop_id, invoice_no, total_amount, payment_mode, paid_amount, balance_amount, payment_status, through_agent, notes, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        shopId,
        invoiceNo,
        0, // total_amount
        "CREDIT",
        0, // paid_amount
        0, // balance_amount
        "NOT_PAID",
        null,
        "Created from uploaded image",
        imageFilename
      ]
    );

    res.json({
      success: true,
      purchaseId: purchaseId,
      invoiceNo: invoiceNo,
      imageUrl: imageUrl(req, imageFilename, 'purchase'),
      message: "Purchase invoice created from uploaded image. Please complete the invoice details."
    });

  } catch (error: any) {
    console.error("Purchase image upload error:", error);
    res.status(500).json({ error: "Failed to create purchase invoice", details: error.message });
  }
});

router.get("/sales/with-images", async (req: AuthRequest, res) => {
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

    console.log('Found', rows.length, 'sales records with images');

    const data = (rows as any[]).map((row) => ({
      id: row.id,
      type: "SALE",
      created_at: row.created_at,
      imageUrl: imageUrl(req, row.image_path, "sales"),
      invoice_no: row.invoice_no,
      customer_name: row.customer_name || "No Customer",
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

router.get("/purchases/with-images", async (req: AuthRequest, res) => {
  try {
    console.log('Fetching purchases with images for shop_id:', req.shop?.shop_id || 'NO_SHOP_ID');
    
    // Temporarily remove shop_id filter to show all uploaded invoices
    const [rows] = await pool.query(
      `SELECT p.*, a.name as vendor_name, a.phone as vendor_phone, a.address as vendor_address, a.gstin as vendor_gstin
       FROM purchases p
       LEFT JOIN accounts a ON p.vendor_id = a.id
       WHERE p.image_path IS NOT NULL
       ORDER BY p.created_at DESC`
    );

    console.log('Found', (rows as any[]).length, 'purchase records with images');

    const data = (rows as any[]).map((row) => ({
      id: row.id,
      type: "PURCHASE",
      created_at: row.created_at,
      imageUrl: imageUrl(req, row.image_path, "purchase"),
      invoice_no: row.invoice_no,
      vendor_name: row.vendor_name || "No Vendor",
      total_amount: row.total_amount,
      payment_status: row.payment_status,
      payment_mode: row.payment_mode,
    }));

    console.log('Returning purchase data:', data.length, 'items');
    res.json(data);
  } catch (error: any) {
    console.error("Get purchases with images error:", error);
    res.status(500).json({ error: "Failed to fetch purchase images", details: error.message });
  }
});

router.get("/sales/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    console.log('Fetching sales invoice:', id, 'for shop_id:', req.shop?.shop_id || 'NO_SHOP_ID');

    // Temporarily remove shop_id filter to allow access to uploaded invoices
    const [sales] = await pool.query(
      `SELECT s.*, a.name as customer_name, a.phone as customer_phone, a.address as customer_address, a.gstin as customer_gstin
       FROM sales s
       LEFT JOIN accounts a ON s.customer_id = a.id
       WHERE s.id = ?`,
      [id]
    );

    if (!sales || (sales as any[]).length === 0) {
      console.log('Sales invoice not found:', id);
      return res.status(404).json({ error: "Sales invoice not found" });
    }

    const sale = (sales as any[])[0];
    console.log('Found sales invoice:', sale.invoice_no, 'shop_id:', sale.shop_id);
    
    const [items] = await pool.query(`SELECT * FROM sale_items WHERE sales_id = ?`, [id]);
    if (sale.image_path) sale.imageUrl = imageUrl(req, sale.image_path, "sales");

    res.json({ ...sale, items });
  } catch (error: any) {
    console.error("Get sales invoice error:", error);
    res.status(500).json({ error: "Failed to fetch sales invoice", details: error.message });
  }
});

router.get("/purchases/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    console.log('Fetching purchase invoice:', id, 'for shop_id:', req.shop?.shop_id || 'NO_SHOP_ID');

    // Temporarily remove shop_id filter to allow access to uploaded invoices
    const [purchases] = await pool.query(
      `SELECT p.*, a.name as vendor_name, a.phone as vendor_phone, a.address as vendor_address, a.gstin as vendor_gstin
       FROM purchases p
       LEFT JOIN accounts a ON p.vendor_id = a.id
       WHERE p.id = ?`,
      [id]
    );

    if (!purchases || (purchases as any[]).length === 0) {
      console.log('Purchase invoice not found:', id);
      return res.status(404).json({ error: "Purchase invoice not found" });
    }

    const purchase = (purchases as any[])[0];
    console.log('Found purchase invoice:', purchase.invoice_no, 'shop_id:', purchase.shop_id);
    
    const [items] = await pool.query(`SELECT * FROM purchase_items WHERE purchase_id = ?`, [id]);
    if (purchase.image_path) purchase.imageUrl = imageUrl(req, purchase.image_path, "purchase");

    res.json({ ...purchase, items });
  } catch (error: any) {
    console.error("Get purchase invoice error:", error);
    res.status(500).json({ error: "Failed to fetch purchase invoice", details: error.message });
  }
});

export default router;
