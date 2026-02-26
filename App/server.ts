import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import pool from "./server/db";
import categoryRoutes from "./server/routes/categories";
import subCategoryRoutes from "./server/routes/subCategories";
import productRoutes from "./server/routes/products";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/sub-categories", subCategoryRoutes);
app.use("/api/products", productRoutes);

// Initialize database tables
async function initDb() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image LONGTEXT,
        isActive BOOLEAN DEFAULT TRUE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sub_categories (
        id VARCHAR(255) PRIMARY KEY,
        categoryId VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image LONGTEXT,
        isActive BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        categoryId VARCHAR(255) NOT NULL,
        subCategoryId VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) DEFAULT 0,
        stock DECIMAL(10, 2) DEFAULT 0,
        images LONGTEXT,
        isActive BOOLEAN DEFAULT TRUE,
        designNo VARCHAR(255),
        color VARCHAR(255),
        quality VARCHAR(255),
        location VARCHAR(255),
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (subCategoryId) REFERENCES sub_categories(id) ON DELETE CASCADE
      )
    `);
    connection.release();
    console.log("Database initialized");

    // Simple migration to add missing columns if table already existed
    const [columns] = await pool.query("SHOW COLUMNS FROM products");
    const columnNames = (columns as any[]).map(c => c.Field);
    
    if (!columnNames.includes('designNo')) {
      await pool.query("ALTER TABLE products ADD COLUMN designNo VARCHAR(255)");
    }
    if (!columnNames.includes('color')) {
      await pool.query("ALTER TABLE products ADD COLUMN color VARCHAR(255)");
    }
    if (!columnNames.includes('quality')) {
      await pool.query("ALTER TABLE products ADD COLUMN quality VARCHAR(255)");
    }
    if (!columnNames.includes('location')) {
      await pool.query("ALTER TABLE products ADD COLUMN location VARCHAR(255)");
    }

    // Ensure images is LONGTEXT
    await pool.query("ALTER TABLE products MODIFY COLUMN images LONGTEXT");
    await pool.query("ALTER TABLE categories MODIFY COLUMN image LONGTEXT");
    await pool.query("ALTER TABLE sub_categories MODIFY COLUMN image LONGTEXT");

  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

async function startServer() {
  await initDb();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
