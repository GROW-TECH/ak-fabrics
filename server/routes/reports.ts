import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

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
      return { start: cloneDaysAgo(6), end };
    case "month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      return { start: first, end };
    }
    default:
      return { start: null, end: null };
  }
};

const buildDateClause = (alias: string, start?: string | null, end?: string | null) => {
  if (start && end) return { clause: `AND ${alias}.created_at BETWEEN ? AND ?`, params: [start, `${end} 23:59:59`] };
  return { clause: "", params: [] };
};

// Sales report
router.get("/sales", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("s", start, end);

    const [totals]: any = await pool.query(
      `SELECT COALESCE(SUM(s.total_amount),0) as total_amount, COUNT(*) as count
       FROM sales s
       WHERE s.shop_id = ?
       ${clause}`,
      [req.shop.shop_id, ...params]
    );

    const [rows]: any = await pool.query(
      `SELECT s.id, s.invoice_no, s.total_amount, s.paid_amount, s.balance_amount, s.created_at,
              a.name as customer_name
       FROM sales s
       LEFT JOIN accounts a ON a.id = s.customer_id
       WHERE s.shop_id = ?
       ${clause}
       ORDER BY s.created_at DESC
       LIMIT 200`,
      [req.shop.shop_id, ...params]
    );

    res.json({
      total_amount: Number(totals?.[0]?.total_amount || 0),
      count: Number(totals?.[0]?.count || 0),
      rows,
    });
  } catch (err: any) {
    console.error("Sales report error:", err);
    res.status(500).json({ error: "Failed to fetch sales report", details: err.message });
  }
});

// Purchase report
router.get("/purchases", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("p", start, end);

    const [totals]: any = await pool.query(
      `SELECT COALESCE(SUM(p.total_amount),0) as total_amount,
              COALESCE(SUM(p.poe),0) as total_poe,
              COUNT(*) as count
       FROM purchases p
       WHERE p.shop_id = ?
       ${clause}`,
      [req.shop.shop_id, ...params]
    );

    const [rows]: any = await pool.query(
      `SELECT p.id, p.invoice_no, p.total_amount, p.poe, p.paid_amount, p.balance_amount, p.created_at,
              a.name as vendor_name
       FROM purchases p
       LEFT JOIN accounts a ON a.id = p.vendor_id
       WHERE p.shop_id = ?
       ${clause}
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [req.shop.shop_id, ...params]
    );

    res.json({
      total_amount: Number(totals?.[0]?.total_amount || 0),
      total_poe: Number(totals?.[0]?.total_poe || 0),
      count: Number(totals?.[0]?.count || 0),
      rows,
    });
  } catch (err: any) {
    console.error("Purchase report error:", err);
    res.status(500).json({ error: "Failed to fetch purchase report", details: err.message });
  }
});

// Product profit report
router.get("/product-profit", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("s", start, end);

    const [rows]: any = await pool.query(
      `SELECT
          si.product_id,
          p.name AS product_name,
          COALESCE(SUM(si.total),0) AS revenue,
          COALESCE(SUM(si.cost_total),0) AS cost_total,
          COALESCE(SUM(si.total - si.cost_total),0) AS profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE s.shop_id = ?
       ${clause}
       GROUP BY si.product_id, p.name
       ORDER BY profit DESC
       LIMIT 200`,
      [req.shop.shop_id, ...params]
    );

    const totals = rows.reduce(
      (acc: any, r: any) => {
        acc.revenue += Number(r.revenue || 0);
        acc.cost_total += Number(r.cost_total || 0);
        acc.profit += Number(r.profit || 0);
        return acc;
      },
      { revenue: 0, cost_total: 0, profit: 0 }
    );

    res.json({ ...totals, rows });
  } catch (err: any) {
    console.error("Product profit report error:", err);
    res.status(500).json({ error: "Failed to fetch product profit report", details: err.message });
  }
});

// Stock snapshot report (approx opening using closing + sold - purchased)
router.get("/stock", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("p", start, end);
    const { clause: saleClause, params: saleParams } = buildDateClause("s", start, end);

    const [products]: any = await pool.query(
      `SELECT id, name, stock, average_cost FROM products WHERE shop_id = ?`,
      [req.shop.shop_id]
    );

    const [purchases]: any = await pool.query(
      `SELECT pi.product_id, COALESCE(SUM(pi.quantity),0) as qty
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       WHERE p.shop_id = ?
       ${clause}
       GROUP BY pi.product_id`,
      [req.shop.shop_id, ...params]
    );

    const [sales]: any = await pool.query(
      `SELECT si.product_id, COALESCE(SUM(si.quantity),0) as qty
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.shop_id = ?
       ${saleClause}
       GROUP BY si.product_id`,
      [req.shop.shop_id, ...saleParams]
    );

    const purchaseMap = new Map(purchases.map((r: any) => [r.product_id, Number(r.qty || 0)]));
    const saleMap = new Map(sales.map((r: any) => [r.product_id, Number(r.qty || 0)]));

    const rows = products.map((p: any) => {
      const purchased = purchaseMap.get(p.id) || 0;
      const sold = saleMap.get(p.id) || 0;
      const closing = Number(p.stock || 0);
      const opening = closing + sold - purchased; // approximation
      const avg = Number(p.average_cost || 0);
      const stockValue = closing * avg;
      return {
        product_id: p.id,
        product_name: p.name,
        opening_qty: opening,
        purchased_qty: purchased,
        sold_qty: sold,
        closing_qty: closing,
        average_cost: avg,
        stock_value: stockValue,
      };
    });

    const totals = rows.reduce(
      (acc: any, r: any) => {
        acc.closing_qty += r.closing_qty;
        acc.stock_value += r.stock_value;
        return acc;
      },
      { closing_qty: 0, stock_value: 0 }
    );

    res.json({ totals, rows });
  } catch (err: any) {
    console.error("Stock report error:", err);
    res.status(500).json({ error: "Failed to fetch stock report", details: err.message });
  }
});

// Expenses (use purchase POE as proxy + expense accounts if present)
router.get("/expenses", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("p", start, end);

    const [poeTotals]: any = await pool.query(
      `SELECT COALESCE(SUM(p.poe),0) as total_poe
       FROM purchases p
       WHERE p.shop_id = ?
       ${clause}`,
      [req.shop.shop_id, ...params]
    );

    const [poeRows]: any = await pool.query(
      `SELECT p.id, p.invoice_no, p.poe, p.created_at, a.name as vendor_name
       FROM purchases p
       LEFT JOIN accounts a ON a.id = p.vendor_id
       WHERE p.shop_id = ?
       ${clause}
       AND p.poe > 0
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [req.shop.shop_id, ...params]
    );

    res.json({
      total_expenses: Number(poeTotals?.[0]?.total_poe || 0),
      rows: poeRows,
    });
  } catch (err: any) {
    console.error("Expenses report error:", err);
    res.status(500).json({ error: "Failed to fetch expenses report", details: err.message });
  }
});

// Cash in hand
router.get("/cash-in-hand", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("c", start, end);

    const [rows]: any = await pool.query(
      `SELECT transaction_type, COALESCE(SUM(amount),0) as total
       FROM cash_in_hand c
       WHERE c.shop_id = ?
       ${clause}
       GROUP BY transaction_type`,
      [req.shop.shop_id, ...params]
    );
    const totalIn = Number(rows.find((r: any) => r.transaction_type === "IN")?.total || 0);
    const totalOut = Number(rows.find((r: any) => r.transaction_type === "OUT")?.total || 0);
    const closing = totalIn - totalOut;
    res.json({ total_in: totalIn, total_out: totalOut, closing });
  } catch (err: any) {
    console.error("Cash in hand report error:", err);
    res.status(500).json({ error: "Failed to fetch cash in hand report", details: err.message });
  }
});

// Bank ledger summary
router.get("/bank-ledger", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("b", start, end);

    const [rows]: any = await pool.query(
      `SELECT b.bank_id, bk.bank_name,
              COALESCE(SUM(b.deposit),0)   as total_in,
              COALESCE(SUM(b.withdrawal),0) as total_out
       FROM bank_transactions b
       LEFT JOIN banks bk ON bk.id = b.bank_id
       WHERE b.shop_id = ?
       ${clause}
       GROUP BY b.bank_id, bk.bank_name`,
      [req.shop.shop_id, ...params]
    );

    res.json({ rows });
  } catch (err: any) {
    console.error("Bank ledger report error:", err);
    res.status(500).json({ error: "Failed to fetch bank ledger report", details: err.message });
  }
});

// Customer-wise summary
router.get("/customers", async (req: AuthRequest, res) => {
  try {
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("s", start, end);

    const [rows]: any = await pool.query(
      `SELECT
         a.id,
         a.name,
         COALESCE(SUM(s.total_amount),0) AS total_sales,
         COUNT(*) AS invoice_count,
         COALESCE(SUM(s.paid_amount),0) AS paid_amount,
         COALESCE(SUM(s.balance_amount),0) AS balance_amount,
         MAX(s.created_at) AS last_txn
       FROM sales s
       JOIN accounts a ON a.id = s.customer_id
       WHERE s.shop_id = ?
       ${clause}
       GROUP BY a.id, a.name
       ORDER BY total_sales DESC`,
      [req.shop.shop_id, ...params]
    );

    const totals = rows.reduce(
      (acc: any, r: any) => {
        acc.total_sales += Number(r.total_sales || 0);
        acc.total_outstanding += Number(r.balance_amount || 0);
        return acc;
      },
      { total_sales: 0, total_outstanding: 0 }
    );

    res.json({ totals, rows });
  } catch (err: any) {
    console.error("Customer report error:", err);
    res.status(500).json({ error: "Failed to fetch customer report", details: err.message });
  }
});

// Customer detail
router.get("/customers/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { range, start_date, end_date } = req.query as any;
    const dates = rangeToDates(range);
    const start = asDate(start_date) || dates.start;
    const end = asDate(end_date) || dates.end;
    const { clause, params } = buildDateClause("s", start, end);

    const [summaryRows]: any = await pool.query(
      `SELECT a.id, a.name,
              COALESCE(SUM(s.total_amount),0) AS total_sales,
              COUNT(*) AS invoice_count,
              COALESCE(SUM(s.paid_amount),0) AS paid_amount,
              COALESCE(SUM(s.balance_amount),0) AS balance_amount,
              MAX(s.created_at) AS last_txn
       FROM sales s
       JOIN accounts a ON a.id = s.customer_id
       WHERE s.shop_id = ? AND a.id = ?
       ${clause}`,
      [req.shop.shop_id, id, ...params]
    );

    const [txRows]: any = await pool.query(
      `SELECT s.id, s.invoice_no, s.created_at, s.total_amount, s.paid_amount, s.balance_amount
       FROM sales s
       WHERE s.shop_id = ? AND s.customer_id = ?
       ${clause}
       ORDER BY s.created_at DESC
       LIMIT 200`,
      [req.shop.shop_id, id, ...params]
    );

    res.json({
      summary: summaryRows?.[0] || {},
      transactions: txRows,
    });
  } catch (err: any) {
    console.error("Customer detail report error:", err);
    res.status(500).json({ error: "Failed to fetch customer detail report", details: err.message });
  }
});

export default router;
