import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
router.use(authenticate);

const uploadDir = path.join(__dirname, "..", "uploads", "business-logos");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_cards (
      id VARCHAR(64) PRIMARY KEY,
      shop_id VARCHAR(64) NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      description VARCHAR(255) NULL,
      address VARCHAR(255) NULL,
      contact_name VARCHAR(255) NULL,
      phone VARCHAR(40) NULL,
      email VARCHAR(255) NULL,
      logo_url MEDIUMTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cards_shop_created (shop_id, created_at)
    )
  `);
  // Expand logo_url if table already existed with smaller column
  await pool.query(`ALTER TABLE business_cards MODIFY COLUMN logo_url MEDIUMTEXT`);
};

router.get("/", async (req: AuthRequest, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT * FROM business_cards WHERE shop_id = ? ORDER BY created_at DESC`,
      [req.shop.shop_id]
    );
    res.json(rows);
  } catch (e: any) {
    console.error("List cards error:", e);
    res.status(500).json({ error: "Failed to fetch business cards" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    await ensureTable();
    const [rows]: any = await pool.query(
      `SELECT * FROM business_cards WHERE id = ? AND shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Business card not found" });
    res.json(rows[0]);
  } catch (e: any) {
    console.error("Get card error:", e);
    res.status(500).json({ error: "Failed to fetch business card" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureTable();
    const {
      business_name,
      description = null,
      address = null,
      contact_name = null,
      phone = null,
      email = null,
      logo_url = null,
    } = req.body || {};

    if (!String(business_name || "").trim()) {
      return res.status(400).json({ error: "business_name is required" });
    }

    const id = uuidv4();
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO business_cards
        (id, shop_id, business_name, description, address, contact_name, phone, email, logo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        String(business_name).trim(),
        description,
        address,
        contact_name,
        phone,
        email,
        logo_url,
      ]
    );
    const [rows]: any = await conn.query(
      `SELECT * FROM business_cards WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.status(201).json(rows[0] || { id });
  } catch (e: any) {
    await conn.rollback();
    console.error("Create card error:", e);
    res.status(500).json({ error: e.message || "Failed to create business card" });
  } finally {
    conn.release();
  }
});

// Upload logo file -> returns public URL
router.post("/upload", upload.single("logo"), (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const fileUrl = `/uploads/business-logos/${req.file.filename}`;
  res.json({ url: fileUrl });
});

router.put("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureTable();
    const { id } = req.params;
    const {
      business_name,
      description = null,
      address = null,
      contact_name = null,
      phone = null,
      email = null,
      logo_url = null,
    } = req.body || {};

    if (!String(business_name || "").trim()) {
      return res.status(400).json({ error: "business_name is required" });
    }

    await conn.beginTransaction();
    const [existing]: any = await conn.query(
      `SELECT id FROM business_cards WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Business card not found" });
    }

    await conn.query(
      `UPDATE business_cards
       SET business_name = ?, description = ?, address = ?, contact_name = ?, phone = ?, email = ?, logo_url = ?
       WHERE id = ? AND shop_id = ?`,
      [
        String(business_name).trim(),
        description,
        address,
        contact_name,
        phone,
        email,
        logo_url,
        id,
        req.shop.shop_id,
      ]
    );

    const [rows]: any = await conn.query(
      `SELECT * FROM business_cards WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.json(rows[0]);
  } catch (e: any) {
    await conn.rollback();
    console.error("Update card error:", e);
    res.status(500).json({ error: e.message || "Failed to update business card" });
  } finally {
    conn.release();
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureTable();
    await conn.beginTransaction();
    const [result]: any = await conn.query(
      `DELETE FROM business_cards WHERE id = ? AND shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    );
    await conn.commit();
    if (result?.affectedRows === 0) return res.status(404).json({ error: "Business card not found" });
    res.json({ message: "Business card deleted" });
  } catch (e: any) {
    await conn.rollback();
    console.error("Delete card error:", e);
    res.status(500).json({ error: e.message || "Failed to delete business card" });
  } finally {
    conn.release();
  }
});

export default router;
