import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

router.use(authenticate);

/* ==============================
   Ensure Upload Folder Exists
================================= */

const uploadDir = path.join(__dirname, "../uploads/subcategories");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ==============================
   Multer Storage Config
================================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      "subcat_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/* ==============================
   GET Sub Categories
================================= */

router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM sub_categories WHERE shop_id = ?",
      [req.shop.shop_id]
    );

    const subCategories = (rows as any[]).map(row => ({
      ...row,
      isActive: !!row.isActive
    }));

    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sub-categories" });
  }
});

/* ==============================
   CREATE Sub Category (WITH IMAGE)
================================= */

router.post("/", upload.single("image"), async (req: AuthRequest, res) => {

  const { id, categoryId, name, description, isActive } = req.body;
  const imageFileName = req.file ? req.file.filename : null;
console.log("BODY:", req.body);
console.log("FILE:", req.file);

  try {
    await pool.query(
      `INSERT INTO sub_categories 
       (id, shop_id, categoryId, name, description, image, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        categoryId,
        name,
        description,
        imageFileName,
        isActive === "true" ? 1 : 0
      ]
    );

    res.status(201).json({
      id,
      categoryId,
      name,
      description,
      image: imageFileName,
      isActive
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to create sub-category" });
  }
});

/* ==============================
   UPDATE Sub Category (WITH IMAGE)
================================= */

router.put("/:id", upload.single("image"), async (req: AuthRequest, res) => {

  const { id } = req.params;
  const { categoryId, name, description, isActive } = req.body;

  try {

    // Get old image
    const [rows] = await pool.query(
      "SELECT image FROM sub_categories WHERE id = ? AND shop_id = ?",
      [id, req.shop.shop_id]
    );

    const oldImage = (rows as any[])[0]?.image;

    let imageFileName = oldImage;

    if (req.file) {
      imageFileName = req.file.filename;

      // Delete old image file
      if (oldImage) {
        const oldPath = path.join(uploadDir, oldImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await pool.query(
      `UPDATE sub_categories 
       SET categoryId = ?, name = ?, description = ?, image = ?, isActive = ?
       WHERE id = ? AND shop_id = ?`,
      [
        categoryId,
        name,
        description,
        imageFileName,
        isActive === "true" ? 1 : 0,
        id,
        req.shop.shop_id
      ]
    );

    res.json({
      id,
      categoryId,
      name,
      description,
      image: imageFileName,
      isActive
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to update sub-category" });
  }
});

/* ==============================
   DELETE Sub Category (AND IMAGE)
================================= */

router.delete("/:id", async (req: AuthRequest, res) => {

  const { id } = req.params;

  try {

    // Get image first
    const [rows] = await pool.query(
      "SELECT image FROM sub_categories WHERE id = ? AND shop_id = ?",
      [id, req.shop.shop_id]
    );

    const imageFile = (rows as any[])[0]?.image;

    if (imageFile) {
      const imagePath = path.join(uploadDir, imageFile);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await pool.query(
      "DELETE FROM sub_categories WHERE id = ? AND shop_id = ?",
      [id, req.shop.shop_id]
    );

    res.status(204).send();

  } catch (error) {
    res.status(500).json({ error: "Failed to delete sub-category" });
  }
});

export default router;  