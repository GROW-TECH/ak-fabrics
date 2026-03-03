import { Router } from "express";
import pool from "../db";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const JWT_SECRET = "ak_fabrics_secret_key";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM shops WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const shop = rows[0];

    if (password !== shop.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        shop_id: shop.id,
        shop_name: shop.name
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      shop: {
        id: shop.id,
        name: shop.name
      }
    });

  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// Add a simple registration endpoint for testing
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Check if shop already exists
    const [existing]: any = await pool.query(
      "SELECT * FROM shops WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Shop already exists" });
    }

    // Create new shop
    const id = uuidv4();
    await pool.query(
      "INSERT INTO shops (id, name, email, password) VALUES (?, ?, ?, ?)",
      [id, name || email, email, password]
    );

    const token = jwt.sign(
      {
        shop_id: id,
        shop_name: name || email
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      shop: {
        id: id,
        name: name || email
      }
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed", details: error.message });
  }
});

export default router;