import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(authenticate);

const ensureEnvelopesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS envelopes (
      id VARCHAR(64) PRIMARY KEY,
      shop_id VARCHAR(64) NOT NULL,
      to_name VARCHAR(255) NOT NULL,
      to_address1 VARCHAR(255) NULL,
      to_address2 VARCHAR(255) NULL,
      to_city VARCHAR(120) NULL,
      to_pincode VARCHAR(12) NULL,
      to_phone VARCHAR(30) NULL,
      tracking_no VARCHAR(60) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_env_shop_created (shop_id, created_at)
    )
  `);
};

router.get("/", async (req: AuthRequest, res) => {
  try {
    await ensureEnvelopesTable();
    const [rows] = await pool.query(
      `SELECT * FROM envelopes WHERE shop_id = ? ORDER BY created_at DESC`,
      [req.shop.shop_id]
    );
    res.json(rows);
  } catch (error: any) {
    console.error("List envelopes error:", error);
    res.status(500).json({ error: "Failed to fetch envelopes" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    await ensureEnvelopesTable();
    const [rows]: any = await pool.query(
      `SELECT * FROM envelopes WHERE id = ? AND shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Envelope not found" });
    res.json(rows[0]);
  } catch (error: any) {
    console.error("Get envelope error:", error);
    res.status(500).json({ error: "Failed to fetch envelope" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureEnvelopesTable();
    const {
      to_name,
      to_address1 = null,
      to_address2 = null,
      to_city = null,
      to_pincode = null,
      to_phone = null,
      tracking_no = null,
      notes = null,
    } = req.body || {};

    if (!String(to_name || "").trim()) {
      return res.status(400).json({ error: "to_name is required" });
    }

    const id = uuidv4();
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO envelopes
        (id, shop_id, to_name, to_address1, to_address2, to_city, to_pincode, to_phone, tracking_no, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        String(to_name).trim(),
        to_address1,
        to_address2,
        to_city,
        to_pincode,
        to_phone,
        tracking_no,
        notes,
      ]
    );
    const [rows]: any = await conn.query(
      `SELECT * FROM envelopes WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.status(201).json(rows[0] || { id });
  } catch (error: any) {
    await conn.rollback();
    console.error("Create envelope error:", error);
    res.status(500).json({ error: error.message || "Failed to create envelope" });
  } finally {
    conn.release();
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureEnvelopesTable();
    const { id } = req.params;
    const {
      to_name,
      to_address1 = null,
      to_address2 = null,
      to_city = null,
      to_pincode = null,
      to_phone = null,
      tracking_no = null,
      notes = null,
    } = req.body || {};

    if (!String(to_name || "").trim()) {
      return res.status(400).json({ error: "to_name is required" });
    }

    await conn.beginTransaction();
    const [existing]: any = await conn.query(
      `SELECT id FROM envelopes WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Envelope not found" });
    }

    await conn.query(
      `UPDATE envelopes
       SET to_name = ?, to_address1 = ?, to_address2 = ?, to_city = ?, to_pincode = ?, to_phone = ?,
           tracking_no = ?, notes = ?
       WHERE id = ? AND shop_id = ?`,
      [
        String(to_name).trim(),
        to_address1,
        to_address2,
        to_city,
        to_pincode,
        to_phone,
        tracking_no,
        notes,
        id,
        req.shop.shop_id,
      ]
    );

    const [rows]: any = await conn.query(
      `SELECT * FROM envelopes WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.json(rows[0]);
  } catch (error: any) {
    await conn.rollback();
    console.error("Update envelope error:", error);
    res.status(500).json({ error: error.message || "Failed to update envelope" });
  } finally {
    conn.release();
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureEnvelopesTable();
    await conn.beginTransaction();
    const [result]: any = await conn.query(
      `DELETE FROM envelopes WHERE id = ? AND shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    );
    await conn.commit();
    if (result?.affectedRows === 0) return res.status(404).json({ error: "Envelope not found" });
    res.json({ message: "Envelope deleted" });
  } catch (error: any) {
    await conn.rollback();
    console.error("Delete envelope error:", error);
    res.status(500).json({ error: error.message || "Failed to delete envelope" });
  } finally {
    conn.release();
  }
});

export default router;

