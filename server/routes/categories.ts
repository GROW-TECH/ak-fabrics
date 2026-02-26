import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

router.use(authenticate);

// Ensure upload folder exists
const uploadDir = path.join(__dirname, "../uploads/categories");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      "cat_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/**
 * GET categories
 */
router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM categories WHERE shop_id = ?",
      [req.shop.shop_id]
    );

    const categories = (rows as any[]).map(row => ({
      ...row,
      isActive: !!row.isActive
    }));

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * CREATE category with image upload
 */
router.post("/", upload.single("image"), async (req: AuthRequest, res) => {
  const { id, name, description, isActive } = req.body;

  const imageFileName = req.file ? req.file.filename : null;

  try {
    await pool.query(
      `INSERT INTO categories 
       (id, shop_id, name, description, image, isActive) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        name,
        description,
        imageFileName,
        isActive === "true" ? 1 : 0
      ]
    );

    res.status(201).json({
      id,
      name,
      description,
      image: imageFileName,
      isActive
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

export default router;