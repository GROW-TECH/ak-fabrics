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
/* ==============================
   Ensure Upload Folder Exists
================================= */
const uploadDir = path_1.default.join(__dirname, "../uploads/subcategories");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
/* ==============================
   Multer Storage Config
================================= */
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = "subcat_" +
            Date.now() +
            "_" +
            Math.floor(Math.random() * 10000) +
            path_1.default.extname(file.originalname);
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({ storage });
/* ==============================
   GET Sub Categories
================================= */
router.get("/", async (req, res) => {
    try {
        const [rows] = await db_1.default.query("SELECT * FROM sub_categories WHERE shop_id = ?", [req.shop.shop_id]);
        const subCategories = rows.map(row => ({
            ...row,
            isActive: !!row.isActive
        }));
        res.json(subCategories);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch sub-categories" });
    }
});
/* ==============================
   CREATE Sub Category (WITH IMAGE)
================================= */
router.post("/", upload.single("image"), async (req, res) => {
    const { id, categoryId, name, description, isActive } = req.body;
    const imageFileName = req.file ? req.file.filename : null;
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    try {
        await db_1.default.query(`INSERT INTO sub_categories 
       (id, shop_id, categoryId, name, description, image, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            id,
            req.shop.shop_id,
            categoryId,
            name,
            description,
            imageFileName,
            isActive === "true" ? 1 : 0
        ]);
        res.status(201).json({
            id,
            categoryId,
            name,
            description,
            image: imageFileName,
            isActive
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create sub-category" });
    }
});
/* ==============================
   UPDATE Sub Category (WITH IMAGE)
================================= */
router.put("/:id", upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { categoryId, name, description, isActive } = req.body;
    try {
        // Get old image
        const [rows] = await db_1.default.query("SELECT image FROM sub_categories WHERE id = ? AND shop_id = ?", [id, req.shop.shop_id]);
        const oldImage = rows[0]?.image;
        let imageFileName = oldImage;
        if (req.file) {
            imageFileName = req.file.filename;
            // Delete old image file
            if (oldImage) {
                const oldPath = path_1.default.join(uploadDir, oldImage);
                if (fs_1.default.existsSync(oldPath)) {
                    fs_1.default.unlinkSync(oldPath);
                }
            }
        }
        await db_1.default.query(`UPDATE sub_categories 
       SET categoryId = ?, name = ?, description = ?, image = ?, isActive = ?
       WHERE id = ? AND shop_id = ?`, [
            categoryId,
            name,
            description,
            imageFileName,
            isActive === "true" ? 1 : 0,
            id,
            req.shop.shop_id
        ]);
        res.json({
            id,
            categoryId,
            name,
            description,
            image: imageFileName,
            isActive
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update sub-category" });
    }
});
/* ==============================
   DELETE Sub Category (AND IMAGE)
================================= */
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        // Get image first
        const [rows] = await db_1.default.query("SELECT image FROM sub_categories WHERE id = ? AND shop_id = ?", [id, req.shop.shop_id]);
        const imageFile = rows[0]?.image;
        if (imageFile) {
            const imagePath = path_1.default.join(uploadDir, imageFile);
            if (fs_1.default.existsSync(imagePath)) {
                fs_1.default.unlinkSync(imagePath);
            }
        }
        await db_1.default.query("DELETE FROM sub_categories WHERE id = ? AND shop_id = ?", [id, req.shop.shop_id]);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete sub-category" });
    }
});
exports.default = router;
