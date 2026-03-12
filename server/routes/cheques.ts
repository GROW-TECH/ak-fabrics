import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(authenticate);

const ensureChequesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cheques (
      id VARCHAR(64) PRIMARY KEY,
      shop_id VARCHAR(64) NOT NULL,
      payee_name VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) DEFAULT 0,
      amount_words VARCHAR(512) NULL,
      cheque_date DATE NULL,
      bank_name VARCHAR(255) NULL,
      account_no VARCHAR(64) NULL,
      branch VARCHAR(255) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cheques_shop_created (shop_id, created_at)
    )
  `);
};

router.get("/", async (req: AuthRequest, res) => {
  try {
    await ensureChequesTable();
    const [rows] = await pool.query(
      `SELECT * FROM cheques WHERE shop_id = ? ORDER BY created_at DESC`,
      [req.shop.shop_id]
    );
    res.json(rows);
  } catch (error: any) {
    console.error("List cheques error:", error);
    res.status(500).json({ error: "Failed to fetch cheques" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    await ensureChequesTable();
    const [rows]: any = await pool.query(
      `SELECT * FROM cheques WHERE id = ? AND shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Cheque not found" });
    res.json(rows[0]);
  } catch (error: any) {
    console.error("Get cheque error:", error);
    res.status(500).json({ error: "Failed to fetch cheque" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureChequesTable();
    const {
      payee_name,
      amount = 0,
      amount_words = null,
      cheque_date = null,
      bank_name = null,
      account_no = null,
      branch = null,
      notes = null,
    } = req.body || {};

    if (!String(payee_name || "").trim()) {
      return res.status(400).json({ error: "payee_name is required" });
    }

    const id = uuidv4();
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO cheques
        (id, shop_id, payee_name, amount, amount_words, cheque_date, bank_name, account_no, branch, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        String(payee_name).trim(),
        Number(amount) || 0,
        amount_words,
        cheque_date,
        bank_name,
        account_no,
        branch,
        notes,
      ]
    );
    const [rows]: any = await conn.query(
      `SELECT * FROM cheques WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.status(201).json(rows[0] || { id });
  } catch (error: any) {
    await conn.rollback();
    console.error("Create cheque error:", error);
    res.status(500).json({ error: error.message || "Failed to create cheque" });
  } finally {
    conn.release();
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureChequesTable();
    const { id } = req.params;
    const {
      payee_name,
      amount = 0,
      amount_words = null,
      cheque_date = null,
      bank_name = null,
      account_no = null,
      branch = null,
      notes = null,
    } = req.body || {};

    if (!String(payee_name || "").trim()) {
      return res.status(400).json({ error: "payee_name is required" });
    }

    await conn.beginTransaction();
    const [existing]: any = await conn.query(
      `SELECT id FROM cheques WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Cheque not found" });
    }

    await conn.query(
      `UPDATE cheques
       SET payee_name = ?, amount = ?, amount_words = ?, cheque_date = ?, bank_name = ?, account_no = ?, branch = ?, notes = ?
       WHERE id = ? AND shop_id = ?`,
      [
        String(payee_name).trim(),
        Number(amount) || 0,
        amount_words,
        cheque_date,
        bank_name,
        account_no,
        branch,
        notes,
        id,
        req.shop.shop_id,
      ]
    );

    const [rows]: any = await conn.query(
      `SELECT * FROM cheques WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.json(rows[0]);
  } catch (error: any) {
    await conn.rollback();
    console.error("Update cheque error:", error);
    res.status(500).json({ error: error.message || "Failed to update cheque" });
  } finally {
    conn.release();
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureChequesTable();
    await conn.beginTransaction();
    const [result]: any = await conn.query(
      `DELETE FROM cheques WHERE id = ? AND shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    );
    await conn.commit();
    if (result?.affectedRows === 0) return res.status(404).json({ error: "Cheque not found" });
    res.json({ message: "Cheque deleted" });
  } catch (error: any) {
    await conn.rollback();
    console.error("Delete cheque error:", error);
    res.status(500).json({ error: error.message || "Failed to delete cheque" });
  } finally {
    conn.release();
  }
});

export default router;
