import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import pool from "../db";

const router = Router();
router.use(authenticate);

// ── GET Dashboard Statistics ───────────────────────────────────────
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const shopId = req.shop.shop_id;

    // Get basic counts
    const [customers] = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE shop_id = ? AND type = 'CUSTOMER'",
      [shopId]
    );

    const [vendors] = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE shop_id = ? AND type = 'VENDOR'",
      [shopId]
    );

    const [products] = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(stock), 0) as total_stock FROM products WHERE shop_id = ? AND isActive = 1",
      [shopId]
    );

    const [categories] = await pool.query(
      "SELECT COUNT(*) as count FROM categories WHERE shop_id = ? AND isActive = 1",
      [shopId]
    );

    // Get financial data - handle empty tables
    let totalSalesAmount = 0;
    let totalSalesCount = 0;
    let last30DaysSales = 0;

    try {
      const [salesData] = await pool.query(
        `SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(total_amount), 0) as total_sales_amount,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_amount ELSE 0 END), 0) as last_30_days_sales
         FROM sales WHERE shop_id = ?`,
        [shopId]
      );
      
      if (salesData && (salesData as any[]).length > 0) {
        const sales = (salesData as any[])[0];
        totalSalesAmount = sales.total_sales_amount || 0;
        totalSalesCount = sales.total_sales || 0;
        last30DaysSales = sales.last_30_days_sales || 0;
      }
    } catch (error) {
      console.log("Sales table might not exist yet:", error);
    }

    let totalPurchaseAmount = 0;
    let totalPurchaseCount = 0;
    let last30DaysPurchases = 0;

    try {
      const [purchaseData] = await pool.query(
        `SELECT 
          COUNT(*) as total_purchases,
          COALESCE(SUM(total_amount), 0) as total_purchase_amount,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_amount ELSE 0 END), 0) as last_30_days_purchases
         FROM purchases WHERE shop_id = ?`,
        [shopId]
      );
      
      if (purchaseData && (purchaseData as any[]).length > 0) {
        const purchases = (purchaseData as any[])[0];
        totalPurchaseAmount = purchases.total_purchase_amount || 0;
        totalPurchaseCount = purchases.total_purchases || 0;
        last30DaysPurchases = purchases.last_30_days_purchases || 0;
      }
    } catch (error) {
      console.log("Purchases table might not exist yet:", error);
    }

    // Get bank and cash balances
    const [bankCash] = await pool.query(
      "SELECT COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE shop_id = ? AND type IN ('BANK', 'CASH')",
      [shopId]
    );

    // Get receivables and payables
    const [receivables] = await pool.query(
      "SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE shop_id = ? AND type = 'CUSTOMER' AND balance > 0",
      [shopId]
    );

    const [payables] = await pool.query(
      "SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE shop_id = ? AND type = 'VENDOR' AND balance > 0",
      [shopId]
    );

    // Calculate proper gross profit (sales revenue - cost of goods sold)
    let grossProfit = 0;
    try {
      // For now, use a simpler approach: calculate profit based on average margins
      // This is more accurate when we don't have exact cost tracking// Get total sales revenue
      const [salesRevenueResult] = await pool.query(
        `SELECT COALESCE(SUM(si.total), 0) as total_sales_revenue
         FROM sales s
         JOIN sale_items si ON s.id = si.sale_id
         WHERE s.shop_id = ?`,
        [shopId]
      );

      const totalSalesRevenue = (salesRevenueResult as any[])[0]?.total_sales_revenue || 0;
      
      // Assume a standard 30% gross margin for fabrics business
      // This can be made more sophisticated later with actual cost tracking
      const estimatedCostOfGoods = totalSalesRevenue * 0.70; // 70% of revenue is estimated cost
      grossProfit = totalSalesRevenue - estimatedCostOfGoods;
      
      // Alternative: if there are actual purchases, use those as cost basis
      if (totalPurchaseAmount > 0) {
        // Use the lesser of estimated cost or actual purchases
        grossProfit = totalSalesRevenue - Math.min(estimatedCostOfGoods, totalPurchaseAmount);
      }
    } catch (error) {
      console.log("Gross profit calculation error:", error);
      // Conservative fallback: assume 20% profit margin
      grossProfit = totalSalesAmount * 0.20;
    }

    const stats = {
      customers: {
        count: (customers as any)[0]?.count || 0,
        total_balance: (customers as any)[0]?.total_balance || 0,
      },
      vendors: {
        count: (vendors as any)[0]?.count || 0,
        total_balance: (vendors as any)[0]?.total_balance || 0,
      },
      products: {
        count: (products as any)[0]?.count || 0,
        total_stock: (products as any)[0]?.total_stock || 0,
      },
      categories: {
        count: (categories as any)[0]?.count || 0,
      },
      sales: {
        count: totalSalesCount,
        total_amount: totalSalesAmount,
        last_30_days: last30DaysSales,
      },
      purchases: {
        count: totalPurchaseCount,
        total_amount: totalPurchaseAmount,
        last_30_days: last30DaysPurchases,
      },
      financial: {
        bank_cash_balance: (bankCash as any)[0]?.total_balance || 0,
        receivables: (receivables as any)[0]?.total || 0,
        payables: (payables as any)[0]?.total || 0,
        gross_profit: grossProfit,
      },
    };

    res.json(stats);
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard statistics", details: error.message });
  }
});

// ── GET Monthly Sales/Purchase Trends ───────────────────────────────────
const asDate = (value: any): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const rangeToDates = (range?: string): { start?: string | null; end?: string | null } => {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);

  const cloneDaysAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  switch (String(range || "").toLowerCase()) {
    case "today":
      return { start: end, end };
    case "week":
      // last 7 days including today
      return { start: cloneDaysAgo(6), end };
    case "month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      return { start: first, end };
    }
    default:
      return { start: null, end: null };
  }
};

router.get("/profit-loss", async (req: AuthRequest, res) => {
  try {
    const shopId = req.shop.shop_id;
    const { range, start_date, end_date } = req.query as any;

    const quickRange = rangeToDates(range);
    const start = asDate(start_date) || quickRange.start;
    const end = asDate(end_date) || quickRange.end;

    const dateClauseSales = start && end ? "AND s.created_at BETWEEN ? AND ?" : "";
    const dateParamsSales = start && end ? [start, `${end} 23:59:59`] : [];
    const dateClausePurch = start && end ? "AND p.created_at BETWEEN ? AND ?" : "";
    const dateParamsPurch = start && end ? [start, `${end} 23:59:59`] : [];

    const [salesAgg]: any = await pool.query(
      `SELECT COALESCE(SUM(s.total_amount),0)  AS total_sales,
              COALESCE(SUM(s.cost_total),0)   AS total_cogs,
              COALESCE(SUM(s.profit_amount),0) AS total_profit
       FROM sales s
       WHERE s.shop_id = ?
       ${dateClauseSales}`,
      [shopId, ...dateParamsSales]
    );

    const [purchaseAgg]: any = await pool.query(
      `SELECT COALESCE(SUM(p.total_amount),0) AS total_purchase_cost,
              COALESCE(SUM(p.poe),0)          AS total_poe
       FROM purchases p
       WHERE p.shop_id = ?
       ${dateClausePurch}`,
      [shopId, ...dateParamsPurch]
    );

    const totalSales = Number(salesAgg?.[0]?.total_sales || 0);
    // purchase total already includes POE; keep POE broken out for the report
    const totalPurchaseCost = Number(purchaseAgg?.[0]?.total_purchase_cost || 0);
    const otherExpenses = Number(purchaseAgg?.[0]?.total_poe || 0);
    const totalCogs = Number(salesAgg?.[0]?.total_cogs || 0);
    const profitFromSales = Number(salesAgg?.[0]?.total_profit || 0);

    // Gross Profit = Revenue - COGS
    const grossProfit = totalSales - (totalCogs || totalPurchaseCost);

    // Net Profit = Revenue - COGS - Other Expenses (POE)
    const netProfit =
      Number.isFinite(profitFromSales) && profitFromSales !== 0
        ? profitFromSales - otherExpenses
        : totalSales - (totalCogs || totalPurchaseCost) - otherExpenses;

    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    res.json({
      total_sales: totalSales,
      total_purchase_cost: totalPurchaseCost,
      other_expenses: otherExpenses,
      total_cogs: totalCogs,
      gross_profit: grossProfit,
      profit_margin: profitMargin,
      net_profit: netProfit,
    });
  } catch (error: any) {
    console.error("Profit & Loss fetch error:", error);
    res.status(500).json({ error: "Failed to compute Profit & Loss", details: error.message });
  }
});

router.get("/trends", async (req: AuthRequest, res) => {
  try {
    const shopId = req.shop.shop_id;
    const months = 6; // Last 6 months

    // Get monthly sales data
    let salesTrends: any[] = [];
    try {
      const [salesResult] = await pool.query(
        `SELECT 
          DATE_FORMAT(created_at, '%b %Y') as month,
          YEAR(created_at) as year,
          MONTH(created_at) as month_num,
          COUNT(*) as sales_count,
          COALESCE(SUM(total_amount), 0) as sales_amount
         FROM sales 
         WHERE shop_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
         GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b %Y')
         ORDER BY year, month_num
         LIMIT ?`,
        [shopId, months, months]
      );
      salesTrends = salesResult as any[];
    } catch (error) {
      console.log("Sales trends error:", error);
    }

    // Get monthly purchase data
    let purchaseTrends: any[] = [];
    try {
      const [purchaseResult] = await pool.query(
        `SELECT 
          DATE_FORMAT(created_at, '%b %Y') as month,
          YEAR(created_at) as year,
          MONTH(created_at) as month_num,
          COUNT(*) as purchase_count,
          COALESCE(SUM(total_amount), 0) as purchase_amount
         FROM purchases 
         WHERE shop_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
         GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b %Y')
         ORDER BY year, month_num
         LIMIT ?`,
        [shopId, months, months]
      );
      purchaseTrends = purchaseResult as any[];
    } catch (error) {
      console.log("Purchase trends error:", error);
    }

    // Combine data for chart
    const combinedData = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const salesMonth = salesTrends.find(s => s.month === monthName);
      const purchaseMonth = purchaseTrends.find(p => p.month === monthName);
      
      combinedData.push({
        month: monthName,
        sales: salesMonth?.sales_amount || 0,
        purchases: purchaseMonth?.purchase_amount || 0,
        sales_count: salesMonth?.sales_count || 0,
        purchase_count: purchaseMonth?.purchase_count || 0,
      });
    }

    res.json(combinedData);
  } catch (error: any) {
    console.error("Dashboard trends error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard trends", details: error.message });
  }
});

// ── GET Top Products (by sales amount) ───────────────────────────────────
router.get("/top-products", async (req: AuthRequest, res) => {
  try {
    const shopId = req.shop.shop_id;
    const limit = 10;

    let topProducts: any[] = [];
    try {
      const [result] = await pool.query(
        `SELECT 
          p.name,
          p.price,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(si.total), 0) as total_revenue
         FROM products p
         LEFT JOIN sale_items si ON p.id = si.product_id
         LEFT JOIN sales s ON si.sales_id = s.id
         WHERE p.shop_id = ? AND (s.shop_id = ? OR s.shop_id IS NULL)
         GROUP BY p.id, p.name, p.price
         HAVING total_sold > 0
         ORDER BY total_revenue DESC
         LIMIT ?`,
        [shopId, shopId, limit]
      );
      topProducts = result as any[];
    } catch (error) {
      console.log("Top products error:", error);
    }

    res.json(topProducts);
  } catch (error: any) {
    console.error("Top products error:", error);
    res.status(500).json({ error: "Failed to fetch top products", details: error.message });
  }
});

// ── GET Recent Activities ───────────────────────────────────────────────
router.get("/recent-activities", async (req: AuthRequest, res) => {
  try {
    const shopId = req.shop.shop_id;
    const limit = 10;

    let activities: any[] = [];

    try {
      // Get recent sales
      const [salesResult] = await pool.query(
        `SELECT 
          'sale' as type,
          invoice_no as reference,
          total_amount as amount,
          created_at,
          a.name as party_name
         FROM sales s
         JOIN accounts a ON s.customer_id = a.id
         WHERE s.shop_id = ?
         ORDER BY s.created_at DESC
         LIMIT ?`,
        [shopId, Math.floor(limit / 2)]
      );
      activities.push(...(salesResult as any[]));
    } catch (error) {
      console.log("Recent sales error:", error);
    }

    try {
      // Get recent purchases
      const [purchaseResult] = await pool.query(
        `SELECT 
          'purchase' as type,
          invoice_no as reference,
          total_amount as amount,
          created_at,
          a.name as party_name
         FROM purchases p
         JOIN accounts a ON p.vendor_id = a.id
         WHERE p.shop_id = ?
         ORDER BY p.created_at DESC
         LIMIT ?`,
        [shopId, Math.floor(limit / 2)]
      );
      activities.push(...(purchaseResult as any[]));
    } catch (error) {
      console.log("Recent purchases error:", error);
    }

    // Combine and sort by date
    const sortedActivities = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    res.json(sortedActivities);
  } catch (error: any) {
    console.error("Recent activities error:", error);
    res.status(500).json({ error: "Failed to fetch recent activities", details: error.message });
  }
});

export default router;
