import { Router } from "express";
import pool from "../db";
import jwt from "jsonwebtoken";

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

export default router;