"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ── Upload dir ───────────────────────────────────────────────
const uploadDir = path_1.default.join(__dirname, "../uploads/categories");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = `cat_${Date.now()}_${Math.floor(Math.random() * 10000)}${path_1.default.extname(file.originalname)}`;
        cb(null, unique);
    },
});
const upload = (0, multer_1.default)({ storage });
// ── Helper: build full image URL ─────────────────────────────
const imageUrl = (req, filename) => {
    if (!filename)
        return null;
    if (filename.startsWith("http"))
        return filename;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:5000";
    return `${proto}://${host}/uploads/categories/${filename}`;
};
// ── GET all categories ───────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const [rows] = await db_1.default.query("SELECT * FROM categories WHERE shop_id = ? ORDER BY name", [req.shop.shop_id]);
        const categories = rows.map(row => ({
            ...row,
            isActive: !!row.isActive,
            image: imageUrl(req, row.image), // return full URL
        }));
        res.json(categories);
    }
    catch (error) {
        console.error("GET CATEGORIES ERROR:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});
// ── POST create category ─────────────────────────────────────
router.post("/", upload.single("image"), async (req, res) => {
    try {
        const { id, name, description, isActive } = req.body;
        const filename = req.file?.filename || null;
        await db_1.default.query(`INSERT INTO categories (id, shop_id, name, description, image, isActive)
       VALUES (?, ?, ?, ?, ?, ?)`, [id, req.shop.shop_id, name, description || "", filename, isActive === "true" ? 1 : 0]);
        res.status(201).json({
            id, name, description,
            image: imageUrl(req, filename),
            isActive: isActive === "true",
        });
    }
    catch (error) {
        console.error("CREATE CATEGORY ERROR:", error);
        res.status(500).json({ error: "Failed to create category", details: error.message });
    }
});
// ── PUT update category ──────────────────────────────────────
router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        // Fetch existing record
        const [rows] = await db_1.default.query("SELECT * FROM categories WHERE id = ? AND shop_id = ?", [id, req.shop.shop_id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }
        const current = rows[0];
        let filename = current.image; // keep existing image by default
        if (req.file) {
            // New image uploaded — delete old file from disk
            if (current.image && !current.image.startsWith("http")) {
                const oldPath = path_1.default.join(uploadDir, current.image);
                if (fs_1.default.existsSync(oldPath))
                    fs_1.default.unlinkSync(oldPath);
            }
            filename = req.file.filename;
        }
        await db_1.default.query(`UPDATE categories
       SET name = ?, description = ?, image = ?, isActive = ?
       WHERE id = ? AND shop_id = ?`, [name, description || "", filename, isActive === "true" ? 1 : 0, id, req.shop.shop_id]);
        res.json({
            id, name, description,
            image: imageUrl(req, filename),
            isActive: isActive === "true",
        });
    }
    catch (error) {
        console.error("UPDATE CATEGORY ERROR:", error);
        res.status(500).json({ error: "Failed to update category", details: error.message });
    }
});
// ── DELETE category ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    try {
        const [rows] = await db_1.default.query("SELECT image FROM categories WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        if (rows.length && rows[0].image) {
            const img = rows[0].image;
            if (!img.startsWith("http")) {
                const oldPath = path_1.default.join(uploadDir, img);
                if (fs_1.default.existsSync(oldPath))
                    fs_1.default.unlinkSync(oldPath);
            }
        }
        await db_1.default.query("DELETE FROM categories WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        res.status(204).send();
    }
    catch (error) {
        console.error("DELETE CATEGORY ERROR:", error);
        res.status(500).json({ error: "Failed to delete category" });
    }
});
exports.default = router;
