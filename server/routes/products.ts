import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
router.use(authenticate);

/* ===========================
   MULTER STORAGE CONFIG
=========================== */

const uploadDir = path.join(__dirname, "../uploads/products");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name
      .replace(/\s+/g, "_")
      .toLowerCase();

    const extension = path.extname(file.originalname);

    const uniqueName =
      originalName +
      "_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000) +
      extension;

    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

/* ===========================
   GET PRODUCTS
=========================== */

router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, categoryId, subCategoryId, name, description,
              price, stock, images, isActive,
              designNo, color, quality, location, shop_id
       FROM products
       WHERE shop_id = ?`,
      [req.shop.shop_id]
    );

    const products = (rows as any[]).map(row => ({
      ...row,
      images: row.images ? JSON.parse(row.images) : [],
      isActive: !!row.isActive
    }));

    res.json(products);
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* ===========================
   CREATE PRODUCT
=========================== */

router.post("/", upload.array("images"), async (req: AuthRequest, res) => {
  try {
    const {
      id,
      categoryId,
      subCategoryId,
      name,
      description,
      price,
      stock,
      isActive,
      designNo,
      color,
      quality,
      location
    } = req.body;

    const files = req.files as Express.Multer.File[];
    const imageNames = files ? files.map(f => f.filename) : [];

    await pool.query(
      `INSERT INTO products
       (id, shop_id, categoryId, subCategoryId, name, description,
        price, stock, images, isActive,
        designNo, color, quality, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        categoryId,
        subCategoryId,
        name,
        description || "",
        Number(price),
        Number(stock),
        JSON.stringify(imageNames),
        isActive === "true" ? 1 : 0,
        designNo || "",
        color || "",
        quality || "",
        location || ""
      ]
    );

    res.status(201).json({
      id,
      categoryId,
      subCategoryId,
      name,
      description,
      price,
      stock,
      images: imageNames,
      isActive: isActive === "true",
      designNo,
      color,
      quality,
      location
    });

  } catch (error: any) {
    console.error("CREATE PRODUCT ERROR:", error);
    res.status(500).json({
      error: "Failed to create product",
      details: error.message
    });
  }
});

/* ===========================
   UPDATE PRODUCT
=========================== */

router.post("/", upload.array("images"), async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const {
      id,
      categoryId,
      subCategoryId,
      name,
      description,
      price,
      stock,
      isActive,
      designNo,
      color,
      quality,
      location
    } = req.body;

    const qty = Number(stock) || 0;

    const files = req.files as Express.Multer.File[];
    const imageNames = files ? files.map(f => f.filename) : [];

    // 1️⃣ Insert Product
    await connection.query(
      `INSERT INTO products
       (id, shop_id, categoryId, subCategoryId, name, description,
        price, stock, images, isActive,
        designNo, color, quality, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        categoryId,
        subCategoryId,
        name,
        description || "",
        Number(price),
        qty,
        JSON.stringify(imageNames),
        isActive === "true" ? 1 : 0,
        designNo || "",
        color || "",
        quality || "",
        location || ""
      ]
    );

    // 2️⃣ Insert Initial Stock Transaction (if stock > 0)
    if (qty > 0) {
      await connection.query(
        `INSERT INTO stock_transactions
         (product_id, shop_id, type, quantity, note)
         VALUES (?, ?, 'PURCHASE', ?, 'Initial Stock')`,
        [id, req.shop.shop_id, qty]
      );
    }

    await connection.commit();

    res.status(201).json({
      id,
      categoryId,
      subCategoryId,
      name,
      description,
      price,
      stock: qty,
      images: imageNames,
      isActive: isActive === "true",
      designNo,
      color,
      quality,
      location
    });

  } catch (error: any) {
    await connection.rollback();
    console.error("CREATE PRODUCT ERROR:", error);
    res.status(500).json({
      error: "Failed to create product",
      details: error.message
    });
  } finally {
    connection.release();
  }
});

/* ===========================
   DELETE PRODUCT
=========================== */

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await pool.query(
      "DELETE FROM products WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );

    res.status(204).send();
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;