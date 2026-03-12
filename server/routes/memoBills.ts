import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(authenticate);

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memo_bills (
      id VARCHAR(64) PRIMARY KEY,
      shop_id VARCHAR(64) NOT NULL,
      memo_no VARCHAR(20) NOT NULL,
      bill_date DATE NULL,
      party VARCHAR(255) NULL,
      city VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      mode VARCHAR(20) NULL,
      footer_note VARCHAR(255) NULL,
      total DECIMAL(12,2) DEFAULT 0,
      bill_lines LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_memo_shop_created (shop_id, created_at)
    )
  `);
};

const nextMemoNo = (prev?: string | null) => {
  const n = parseInt(String(prev || "").replace(/\D/g, ""), 10);
  const nextNum = isFinite(n) ? n + 1 : 1;
  return `M-${String(nextNum).padStart(2, "0")}`;
};

router.get("/", async (req: AuthRequest, res) => {
  try {
    await ensureTable();
    const [rows]: any = await pool.query(
      `SELECT * FROM memo_bills WHERE shop_id = ? ORDER BY created_at DESC`,
      [req.shop.shop_id]
    );
    res.json(rows);
  } catch (error: any) {
    console.error("List memo bills error:", error);
    res.status(500).json({ error: "Failed to fetch memo bills" });
  }
});

router.get("/next", async (req: AuthRequest, res) => {
  try {
    await ensureTable();
    const [rows]: any = await pool.query(
      `SELECT memo_no FROM memo_bills WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1`,
      [req.shop.shop_id]
    );
    const prev = rows?.[0]?.memo_no || null;
    res.json({ memo_no: nextMemoNo(prev) });
  } catch (error: any) {
    console.error("Next memo no error:", error);
    res.status(500).json({ error: "Failed to get next memo number" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureTable();
    const { memo_no, bill_date, party, city, phone, mode, footer_note, total = 0, lines = [] } = req.body || {};

    await conn.beginTransaction();
    const [rows]: any = await conn.query(
      `SELECT memo_no FROM memo_bills WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1`,
      [req.shop.shop_id]
    );
    const generatedMemo = nextMemoNo(rows?.[0]?.memo_no || null);
    const finalMemoNo = (String(memo_no || "").trim()) || generatedMemo;

    const id = uuidv4();
    await conn.query(
      `INSERT INTO memo_bills
        (id, shop_id, memo_no, bill_date, party, city, phone, mode, footer_note, total, bill_lines)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        finalMemoNo,
        bill_date || null,
        party || null,
        city || null,
        phone || null,
        mode || null,
        footer_note || null,
        Number(total) || 0,
        JSON.stringify(lines || []),
      ]
    );

    const [created]: any = await conn.query(
      `SELECT * FROM memo_bills WHERE id = ? AND shop_id = ?`,
      [id, req.shop.shop_id]
    );
    await conn.commit();
    res.status(201).json(created?.[0] || { id, memo_no: finalMemoNo });
  } catch (error: any) {
    await conn.rollback();
    console.error("Create memo bill error:", error);
    res.status(500).json({ error: error.message || "Failed to create memo bill" });
  } finally {
    conn.release();
  }
});

export default router;
