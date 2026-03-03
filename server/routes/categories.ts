import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
router.use(authenticate);

// ── Upload dir ───────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/categories");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = `cat_${Date.now()}_${Math.floor(Math.random() * 10000)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

// ── Helper: build full image URL ─────────────────────────────
const imageUrl = (req: AuthRequest, filename: string | null): string | null => {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host  = req.headers["x-forwarded-host"]  || req.get("host") || "localhost:5000";
  return `${proto}://${host}/uploads/categories/${filename}`;
};

// ── GET all categories ───────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM categories WHERE shop_id = ? ORDER BY name",
      [req.shop.shop_id]
    );

    const categories = (rows as any[]).map(row => ({
      ...row,
      isActive: !!row.isActive,
      image: imageUrl(req, row.image), // return full URL
    }));

    res.json(categories);
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ── POST create category ─────────────────────────────────────
router.post("/", upload.single("image"), async (req: AuthRequest, res) => {
  try {
    const { id, name, description, isActive } = req.body;
    const filename = req.file?.filename || null;

    await pool.query(
      `INSERT INTO categories (id, shop_id, name, description, image, isActive)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.shop.shop_id, name, description || "", filename, isActive === "true" ? 1 : 0]
    );

    res.status(201).json({
      id, name, description,
      image: imageUrl(req, filename),
      isActive: isActive === "true",
    });
  } catch (error: any) {
    console.error("CREATE CATEGORY ERROR:", error);
    res.status(500).json({ error: "Failed to create category", details: error.message });
  }
});

// ── PUT update category ──────────────────────────────────────
router.put("/:id", upload.single("image"), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    // Fetch existing record
    const [rows]: any = await pool.query(
      "SELECT * FROM categories WHERE id = ? AND shop_id = ?",
      [id, req.shop.shop_id]
    );

    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const current = (rows as any[])[0];
    let filename = current.image; // keep existing image by default

    if (req.file) {
      // New image uploaded — delete old file from disk
      if (current.image && !current.image.startsWith("http")) {
        const oldPath = path.join(uploadDir, current.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      filename = req.file.filename;
    }

    await pool.query(
      `UPDATE categories
       SET name = ?, description = ?, image = ?, isActive = ?
       WHERE id = ? AND shop_id = ?`,
      [name, description || "", filename, isActive === "true" ? 1 : 0, id, req.shop.shop_id]
    );

    res.json({
      id, name, description,
      image: imageUrl(req, filename),
      isActive: isActive === "true",
    });
  } catch (error: any) {
    console.error("UPDATE CATEGORY ERROR:", error);
    res.status(500).json({ error: "Failed to update category", details: error.message });
  }
});

// ── DELETE category ──────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT image FROM categories WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );

    if ((rows as any[]).length && (rows as any[])[0].image) {
      const img = (rows as any[])[0].image;
      if (!img.startsWith("http")) {
        const oldPath = path.join(uploadDir, img);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await pool.query(
      "DELETE FROM categories WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );

    res.status(204).send();
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;