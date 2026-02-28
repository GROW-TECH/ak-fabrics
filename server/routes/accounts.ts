import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);


// 🔹 Create Account
router.post("/", async (req: AuthRequest, res) => {
  const {
    id,
    name,
    type,
    phone,
    address,
    gstin,
    pincode,
    through,
    throughGstin,
    balance
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO accounts 
       (id, shop_id, name, type, phone, address, gstin, pincode, through, through_gstin, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,   // 🔥 MULTI TENANT
        name,
        type,
        phone,
        address,
        gstin,
        pincode,
        through,
        throughGstin,
        balance
      ]
    );

    res.json({ message: "Account created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
});


// 🔹 Get All Accounts
router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM accounts WHERE shop_id = ?",
      [req.shop.shop_id]
    );

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// 🔹 Update Account
router.put("/:id", async (req: AuthRequest, res) => {
  const {
    name,
    type,
    phone,
    address,
    gstin,
    pincode,
    through,
    throughGstin,
    balance
  } = req.body;

  try {
    await pool.query(
      `UPDATE accounts SET
        name = ?,
        type = ?,
        phone = ?,
        address = ?,
        gstin = ?,
        pincode = ?,
        through = ?,
        through_gstin = ?,
        balance = ?
       WHERE id = ? AND shop_id = ?`,
      [
        name,
        type,
        phone,
        address,
        gstin,
        pincode,
        through,
        throughGstin,
        balance,
        req.params.id,
        req.shop.shop_id
      ]
    );

    res.json({ message: "Account updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// 🔹 Delete Account
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await pool.query(
      "DELETE FROM accounts WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );

    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});


export default router;