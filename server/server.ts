import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import subCategoryRoutes from "./routes/subCategories";
import stockRoutes from "./routes/stocks";
import accountRoutes from "./routes/accounts";
import purchaseRoutes from "./routes/purchase";
import stockHistoryRouter from "./routes/stockHistory";

import path from "path/win32";

const app = express();

// app.use(cors());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/stock-history", stockHistoryRouter);

app.get("/", (req, res) => {
  res.send("AK Fabrics Backend Running 🚀");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});