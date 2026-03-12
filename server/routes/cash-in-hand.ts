import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// Get cash in hand balance for current shop
router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN amount ELSE -amount END), 0) as balance,
        COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN transaction_type = 'OUT' THEN amount ELSE 0 END), 0) as total_out
       FROM cash_in_hand 
       WHERE shop_id = ? AND deleted_at IS NULL`,
      [req.shop.shop_id]
    ) as any[];
    
    res.json(rows[0] || { balance: 0, total_in: 0, total_out: 0 });
  } catch (error) {
    console.error("Error fetching cash in hand:", error);
    res.status(500).json({ error: "Failed to fetch cash in hand balance" });
  }
});

// Get cash transaction history
router.get("/transactions", async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 50, from_date, to_date } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT id, transaction_type, amount, description, reference_type, reference_id, created_at
      FROM cash_in_hand 
      WHERE shop_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [req.shop.shop_id];
    
    if (from_date) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(from_date);
    }
    
    if (to_date) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(to_date);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);
    
    const [rows] = await pool.query(query, params) as any[];
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cash_in_hand 
      WHERE shop_id = ? AND deleted_at IS NULL
    `;
    const countParams: any[] = [req.shop.shop_id];
    
    if (from_date) {
      countQuery += ` AND DATE(created_at) >= ?`;
      countParams.push(from_date);
    }
    
    if (to_date) {
      countQuery += ` AND DATE(created_at) <= ?`;
      countParams.push(to_date);
    }
    
    const [countRows] = await pool.query(countQuery, countParams) as any[];
    
    res.json({
      transactions: rows,
      total: countRows[0].total,
      page: Number(page),
      totalPages: Math.ceil(countRows[0].total / Number(limit))
    });
  } catch (error) {
    console.error("Error fetching cash transactions:", error);
    res.status(500).json({ error: "Failed to fetch cash transactions" });
  }
});

// Add cash transaction (manual entry)
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { transaction_type, amount, description } = req.body;
    
    if (!transaction_type || !amount) {
      return res.status(400).json({ error: "Transaction type and amount are required" });
    }
    
    if (!['IN', 'OUT'].includes(transaction_type)) {
      return res.status(400).json({ error: "Transaction type must be IN or OUT" });
    }
    
    const [result] = await pool.query(
      `INSERT INTO cash_in_hand 
       (shop_id, transaction_type, amount, description, reference_type, reference_id, created_at) 
       VALUES (?, ?, ?, ?, 'MANUAL', NULL, NOW())`,
      [req.shop.shop_id, transaction_type, Number(amount), description || 'Manual entry']
    ) as any[];
    
    res.json({ 
      id: result.insertId,
      message: "Cash transaction added successfully",
      balance: await getCashBalance(req.shop.shop_id)
    });
  } catch (error) {
    console.error("Error adding cash transaction:", error);
    res.status(500).json({ error: "Failed to add cash transaction" });
  }
});

// Helper function to get cash balance
async function getCashBalance(shopId: string): Promise<number> {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'IN' THEN amount ELSE -amount END), 0) as balance
     FROM cash_in_hand 
     WHERE shop_id = ? AND deleted_at IS NULL`,
    [shopId]
  ) as any[];
  return rows[0]?.balance || 0;
}

export default router;
