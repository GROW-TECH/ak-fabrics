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
/* ===========================
   MULTER STORAGE CONFIG
=========================== */
const uploadDir = path_1.default.join(__dirname, "../uploads/products");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalName = path_1.default.parse(file.originalname).name
            .replace(/\s+/g, "_")
            .toLowerCase();
        const extension = path_1.default.extname(file.originalname);
        const uniqueName = originalName +
            "_" +
            Date.now() +
            "_" +
            Math.floor(Math.random() * 10000) +
            extension;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({ storage });
/* ===========================
   GET PRODUCTS
=========================== */
router.get("/", async (req, res) => {
    try {
        const [rows] = await db_1.default.query(`SELECT *
       FROM products
       WHERE shop_id = ?`, [req.shop.shop_id]);
        const products = rows.map(row => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : [],
            isActive: !!row.isActive
        }));
        res.json(products);
    }
    catch (error) {
        console.error("GET PRODUCT ERROR:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});
/* ===========================
   CREATE PRODUCT
=========================== */
router.post("/", upload.array("images"), async (req, res) => {
    try {
        const { id, categoryId, subCategoryId, name, description, price, stock, isActive, designNo, color, quality, location, hsnCode } = req.body;
        const files = req.files;
        const imageNames = files ? files.map(f => f.filename) : [];
        await db_1.default.query(`INSERT INTO products
       (id, shop_id, categoryId, subCategoryId, name, description,
        price, stock, images, isActive,
        designNo, color, quality, location,hsnCode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`, [
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
            location || "",
            hsnCode || ""
        ]);
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
            location,
            hsnCode
        });
    }
    catch (error) {
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
router.post("/", upload.array("images"), async (req, res) => {
    const connection = await db_1.default.getConnection();
    await connection.beginTransaction();
    try {
        const { id, categoryId, subCategoryId, name, description, price, stock, isActive, designNo, color, quality, location, hsnCode } = req.body;
        const qty = Number(stock) || 0;
        const files = req.files;
        const imageNames = files ? files.map(f => f.filename) : [];
        // 1️⃣ Insert Product
        await connection.query(`INSERT INTO products
       (id, shop_id, categoryId, subCategoryId, name, description,
        price, stock, images, isActive,
        designNo, color, quality, location,hsnCode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`, [
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
            location || "",
            hsnCode || " "
        ]);
        // 2️⃣ Insert Initial Stock Transaction (if stock > 0)
        if (qty > 0) {
            await connection.query(`INSERT INTO stock_transactions
         (product_id, shop_id, type, quantity, note)
         VALUES (?, ?, 'PURCHASE', ?, 'Initial Stock')`, [id, req.shop.shop_id, qty]);
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
            location,
            hsnCode
        });
    }
    catch (error) {
        await connection.rollback();
        console.error("CREATE PRODUCT ERROR:", error);
        res.status(500).json({
            error: "Failed to create product",
            details: error.message
        });
    }
    finally {
        connection.release();
    }
});
/* ===========================
   DELETE PRODUCT
=========================== */
router.delete("/:id", async (req, res) => {
    try {
        await db_1.default.query("DELETE FROM products WHERE id = ? AND shop_id = ?", [req.params.id, req.shop.shop_id]);
        res.status(204).send();
    }
    catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        res.status(500).json({ error: "Failed to delete product" });
    }
});
exports.default = router;
