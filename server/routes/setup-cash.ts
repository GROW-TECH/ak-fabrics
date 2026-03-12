import { Router } from "express";
import pool from "../db";

const router = Router();

// Create cash_in_hand table if it doesn't exist
router.post("/setup-cash-table", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cash_in_hand (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id VARCHAR(36) NOT NULL,
        transaction_type ENUM('IN', 'OUT') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        reference_type ENUM('SALE', 'PURCHASE', 'MANUAL', 'EXPENSE') NULL,
        reference_id VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_shop_id (shop_id),
        INDEX idx_reference (reference_type, reference_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    res.json({ message: "Cash in hand table created successfully" });
  } catch (error) {
    console.error("Error creating cash_in_hand table:", error);
    res.status(500).json({ error: "Failed to create cash_in_hand table" });
  }
});

export default router;
