import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        pi.id,
        pr.name AS product_name,
        pr.images,
        pi.quantity,
        pi.rate,
        a.name AS vendor_name,
        pu.created_at
      FROM purchase_items pi
      JOIN purchases pu ON pu.id = pi.purchase_id
      JOIN products pr ON pr.id = pi.product_id
      JOIN accounts a ON a.id = pu.vendor_id
      WHERE pu.shop_id = ?
      ORDER BY pu.created_at DESC
      `,
      [req.shop.shop_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Stock history error:", error);
    res.status(500).json({ error: "Failed to fetch stock history" });
  }
});

export default router;