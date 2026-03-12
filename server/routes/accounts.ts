import { Router } from "express";
import pool from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";
import PDFDocument from "pdfkit";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(authenticate);

const safeFilePart = (value: string) =>
  String(value || "file").replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 80);

const parseYmd = (value: any): string | null => {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const ymdToDateStart = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const ymdToDateEndExclusive = (ymd: string) => {
  const d = ymdToDateStart(ymd);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
};

const ensureTransfersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id VARCHAR(64) PRIMARY KEY,
      shop_id VARCHAR(64) NOT NULL,
      module VARCHAR(20) NOT NULL DEFAULT 'general',
      paid_account_id VARCHAR(64) NOT NULL,
      received_account_id VARCHAR(64) NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      transfer_date DATE NOT NULL,
      transfer_time VARCHAR(8) NULL,
      note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_transfers_shop_created (shop_id, created_at),
      INDEX idx_transfers_shop_module (shop_id, module)
    )
  `);
};


// ─── Create Account ───────────────────────────────────────────────────────────
router.post("/", async (req: AuthRequest, res) => {
  const {
    name,
    type,
    phone,
    address,
    gstin,
    pincode,
    through,
    throughGstin,
    balance,
  } = req.body;

  // ✅ Input validation
  if (!name || !type) {
    return res.status(400).json({ error: "name and type are required" });
  }

  // ✅ Server-generated ID (never trust client)
  const id = uuidv4();

  // ✅ Parse balance safely
  const parsedBalance = parseFloat(balance) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO accounts 
         (id, shop_id, name, type, phone, address, gstin, pincode, through, through_gstin, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.shop.shop_id,
        name,
        type,
        phone   || null,
        address || null,
        gstin   || null,
        pincode || null,
        through || null,
        throughGstin || null,
        parsedBalance,
      ]
    );

    await conn.commit();
    res.status(201).json({ message: "Account created", id });
  } catch (err) {
    await conn.rollback();
    console.error("Create account error:", err);
    res.status(500).json({ error: "Failed to create account" });
  } finally {
    conn.release();
  }
});


// ─── Get All Accounts ─────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM accounts WHERE shop_id = ? ORDER BY name ASC",
      [req.shop.shop_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch accounts error:", err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});


// ─── Update Account ───────────────────────────────────────────────────────────
router.put("/:id", async (req: AuthRequest, res) => {
  const {
    name,
    type,
    phone,
    address,
    gstin,
    pincode,
    through,
    throughGstin,
    balance,
  } = req.body;

  // ✅ Input validation
  if (!name || !type) {
    return res.status(400).json({ error: "name and type are required" });
  }

  // ✅ Parse balance safely
  const parsedBalance = parseFloat(balance) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ✅ Verify account belongs to this shop before updating
    const [existing]: any = await conn.query(
      "SELECT id FROM accounts WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Account not found" });
    }

    await conn.query(
      `UPDATE accounts SET
         name        = ?,
         type        = ?,
         phone       = ?,
         address     = ?,
         gstin       = ?,
         pincode     = ?,
         through     = ?,
         through_gstin = ?,
         balance     = ?
       WHERE id = ? AND shop_id = ?`,
      [
        name,
        type,
        phone   || null,
        address || null,
        gstin   || null,
        pincode || null,
        through || null,
        throughGstin || null,
        parsedBalance,
        req.params.id,
        req.shop.shop_id,
      ]
    );

    await conn.commit();
    res.json({ message: "Account updated" });
  } catch (err) {
    await conn.rollback();
    console.error("Update account error:", err);
    res.status(500).json({ error: "Failed to update account" });
  } finally {
    conn.release();
  }
});


// ─── Delete Account ───────────────────────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ✅ Verify account belongs to this shop
    const [existing]: any = await conn.query(
      "SELECT id FROM accounts WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Account not found" });
    }

    // ✅ Block delete if linked to sales
    const [linkedSales]: any = await conn.query(
      "SELECT COUNT(*) as cnt FROM sales WHERE customer_id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );
    if (linkedSales[0].cnt > 0) {
      await conn.rollback();
      return res.status(400).json({
        error: "Cannot delete account with existing sales transactions",
      });
    }

    // ✅ Block delete if linked to purchases
    const [linkedPurchases]: any = await conn.query(
      "SELECT COUNT(*) as cnt FROM purchases WHERE vendor_id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );
    if (linkedPurchases[0].cnt > 0) {
      await conn.rollback();
      return res.status(400).json({
        error: "Cannot delete account with existing purchase transactions",
      });
    }

    await conn.query(
      "DELETE FROM accounts WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shop.shop_id]
    );

    await conn.commit();
    res.json({ message: "Account deleted" });
  } catch (err) {
    await conn.rollback();
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  } finally {
    conn.release();
  }
});


// ─── Payment Reminder PDF ─────────────────────────────────────────────────────
// ─── Ledger Statement PDF ─────────────────────────────────────────────────────
router.get("/:id/ledger-pdf", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const from = parseYmd(req.query.from);
    const to = parseYmd(req.query.to);
    const date = parseYmd(req.query.date);

    const [accRows]: any = await pool.query(
      "SELECT id, name, phone, type FROM accounts WHERE id = ? AND shop_id = ?",
      [id, req.shop.shop_id]
    );
    if (!accRows.length) return res.status(404).json({ error: "Account not found" });
    const acc = accRows[0];

    const type = String(acc.type || "").toUpperCase();
    const isCustomer = type === "CUSTOMER";
    const isVendor = type === "VENDOR";
    if (!isCustomer && !isVendor) {
      return res.status(400).json({ error: "Ledger is only available for customers/vendors" });
    }

    const table = isCustomer ? "sales" : "purchases";
    const partyCol = isCustomer ? "customer_id" : "vendor_id";
    const module = isCustomer ? "sales" : "purchases";

    const where: string[] = [`shop_id = ?`, `${partyCol} = ?`];
    const params: any[] = [req.shop.shop_id, id];

    if (date) {
      where.push("created_at >= ? AND created_at < ?");
      params.push(ymdToDateStart(date), ymdToDateEndExclusive(date));
    } else {
      if (from) {
        where.push("created_at >= ?");
        params.push(ymdToDateStart(from));
      }
      if (to) {
        where.push("created_at < ?");
        params.push(ymdToDateEndExclusive(to));
      }
    }

    const [partyRows]: any = await pool.query(
      `SELECT id, invoice_no, created_at, total_amount, paid_amount, payment_mode, notes
       FROM ${table}
       WHERE ${where.join(" AND ")}
       ORDER BY created_at ASC`,
      params
    );

    let transferRows: any[] = [];
    try {
      await ensureTransfersTable();
      const tWhere: string[] = [
        "shop_id = ?",
        "module = ?",
        "(paid_account_id = ? OR received_account_id = ?)",
      ];
      const tParams: any[] = [req.shop.shop_id, module, id, id];

      if (date) {
        tWhere.push("transfer_date = ?");
        tParams.push(date);
      } else {
        if (from) { tWhere.push("transfer_date >= ?"); tParams.push(from); }
        if (to) { tWhere.push("transfer_date <= ?"); tParams.push(to); }
      }

      const [tRows]: any = await pool.query(
        `SELECT id, paid_account_id, received_account_id, amount, transfer_date, note, created_at
         FROM transfers
         WHERE ${tWhere.join(" AND ")}
         ORDER BY created_at ASC`,
        tParams
      );
      transferRows = tRows as any[];
    } catch (err: any) {
      console.error("Ledger PDF transfers query failed:", err?.message || err);
      transferRows = [];
    }

    const allRows: any[] = [
      ...(partyRows || []),
      ...(transferRows || []).map((t: any) => ({ ...t, __kind: "TRANSFER", created_at: t.transfer_date || t.created_at })),
    ];
    allRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let running = 0;
    const lines = allRows.map((r: any) => {
      const isTransfer = r.__kind === "TRANSFER";
      const total = Number(r.total_amount || 0);
      const paid = Number(r.paid_amount || 0);
      const transferAmount = Number(r.amount || 0);

      const transferReceived = String(r.paid_account_id) === String(id) ? transferAmount : 0;
      const transferPaid = String(r.received_account_id) === String(id) ? transferAmount : 0;

      const received = isTransfer ? transferReceived : (isCustomer ? paid : Math.max(total - paid, 0));
      const paidOut = isTransfer ? transferPaid : (isCustomer ? Math.max(total - paid, 0) : paid);
      const rowBalance = isTransfer ? (received - paidOut) : (paid - total);
      running += rowBalance;

      const dt = new Date(r.created_at);
      const billNo = isTransfer ? `TRF-${String(r.id || "").slice(0, 6)}` : (r.invoice_no || "-");

      return {
        date: dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        billNo,
        received,
        paid: paidOut,
        balance: running,
      };
    });

    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const safeName = safeFilePart(acc.name || "ledger");
    const fileName = `${safeName}-ledger.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    doc.pipe(res);

    doc.fontSize(16).text("LEDGER STATEMENT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Name: ${acc.name || "-"}`);
    doc.text(`Phone: ${acc.phone || "-"}`);
    doc.text(`Type: ${isCustomer ? "Customer" : "Vendor"}`);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`);
    doc.moveDown(0.8);

    const x = doc.x;
    const colW = { date: 90, bill: 120, recv: 95, paid: 95, bal: 95 };
    const rowH = 18;

    const headerY = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Date", x, headerY, { width: colW.date });
    doc.text("Bill No", x + colW.date, headerY, { width: colW.bill });
    doc.text("Received", x + colW.date + colW.bill, headerY, { width: colW.recv, align: "right" });
    doc.text("Paid", x + colW.date + colW.bill + colW.recv, headerY, { width: colW.paid, align: "right" });
    doc.text("Balance", x + colW.date + colW.bill + colW.recv + colW.paid, headerY, { width: colW.bal, align: "right" });
    doc.moveDown(0.6);
    doc.moveTo(x, doc.y).lineTo(x + colW.date + colW.bill + colW.recv + colW.paid + colW.bal, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(10);
    for (const line of lines) {
      if (doc.y > 760) doc.addPage();
      const y = doc.y;
      doc.text(line.date, x, y, { width: colW.date });
      doc.text(line.billNo, x + colW.date, y, { width: colW.bill });
      doc.text(Number(line.received || 0).toLocaleString("en-IN"), x + colW.date + colW.bill, y, { width: colW.recv, align: "right" });
      doc.text(Number(line.paid || 0).toLocaleString("en-IN"), x + colW.date + colW.bill + colW.recv, y, { width: colW.paid, align: "right" });
      doc.text(Number(line.balance || 0).toLocaleString("en-IN"), x + colW.date + colW.bill + colW.recv + colW.paid, y, { width: colW.bal, align: "right" });
      doc.y = y + rowH;
    }

    doc.moveDown(0.8);
    const totalReceived = lines.reduce((s: number, r: any) => s + Number(r.received || 0), 0);
    const totalPaid = lines.reduce((s: number, r: any) => s + Number(r.paid || 0), 0);
    const finalBalance = lines.length ? lines[lines.length - 1].balance : 0;
    doc.font("Helvetica-Bold").text(`Total Received: ${totalReceived.toLocaleString("en-IN")}`);
    doc.text(`Total Paid: ${totalPaid.toLocaleString("en-IN")}`);
    doc.text(`Final Balance: ${Number(finalBalance || 0).toLocaleString("en-IN")}`);

    doc.end();
  } catch (err: any) {
    console.error("Ledger PDF error:", err);
    res.status(500).json({ error: "Failed to generate ledger PDF", details: err.message });
  }
});

router.get("/:id/reminder-pdf", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // ✅ Whitelist module values
    const moduleQ = String(req.query.module || "sales").toLowerCase();
    const isPurchase = moduleQ === "purchases";
    const table    = isPurchase ? "purchases" : "sales";
    const partyCol = isPurchase ? "vendor_id"  : "customer_id";
    const moduleLabel = isPurchase ? "Purchase" : "Sales";

    // ✅ Verify account exists and belongs to shop
    const [accRows]: any = await pool.query(
      "SELECT id, name, phone, balance FROM accounts WHERE id = ? AND shop_id = ?",
      [id, req.shop.shop_id]
    );
    if (!accRows.length) {
      return res.status(404).json({ error: "Account not found" });
    }
    const acc = accRows[0];

    const [rows]: any = await pool.query(
      `SELECT created_at, total_amount, paid_amount, balance_amount
       FROM ${table}
       WHERE ${partyCol} = ? AND shop_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [id, req.shop.shop_id]
    );

    const totalReceived = rows.reduce(
      (s: number, r: any) => s + Number(r.paid_amount || 0), 0
    );
    const totalPaid = rows.reduce(
      (s: number, r: any) => s + Number(r.total_amount || 0), 0
    );
    const balance = Number(acc.balance || 0);
    const balanceText =
      balance < 0
        ? `${Math.abs(balance).toLocaleString("en-IN")} Due`
        : balance > 0
        ? `${Math.abs(balance).toLocaleString("en-IN")} Advance`
        : "0";

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const safeName = String(acc.name || "party").replace(/[^a-zA-Z0-9-_]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}-payment-reminder.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(8).text(new Date().toLocaleDateString("en-GB"), { align: "right" });
    doc.moveDown(0.5);
    doc.fontSize(9).text("Ledger", { align: "center" });
    doc.font("Helvetica-Bold").fontSize(14).text(acc.name || "Party", { align: "center" });
    doc.font("Helvetica").fontSize(9).text(new Date().toLocaleDateString("en-GB"), { align: "center" });
    doc.moveDown(1);

    // Table
    const startX  = 45;
    const rowH    = 22;
    const headers = ["#", "Date", "Notes", "Received", "Paid", "Balance"];
    const widths  = [22, 80, 145, 75, 65, 70];
    let y = doc.y;

    // Table header row
    let x = startX;
    headers.forEach((h: string, idx: number) => {
      doc.rect(x, y, widths[idx], rowH).stroke("#999999");
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(h, x + 4, y + 7, { width: widths[idx] - 8, align: "center" });
      x += widths[idx];
    });
    y += rowH;

    // ✅ Guard: no transactions
    if (!rows.length) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .text("No transactions found.", startX, y + 8);
      y += 30;
    } else {
      rows.forEach((r: any, i: number) => {
        const rowVals = [
          String(i + 1),
          new Date(r.created_at).toLocaleDateString("en-GB"),
          moduleLabel,
          Number(r.paid_amount  || 0).toLocaleString("en-IN"),
          Number(r.total_amount || 0).toLocaleString("en-IN"),
          Math.abs(
            Number(
              r.balance_amount ??
                Number(r.total_amount || 0) - Number(r.paid_amount || 0)
            )
          ).toLocaleString("en-IN"),
        ];
        let rx = startX;
        rowVals.forEach((val: string, idx: number) => {
          doc.rect(rx, y, widths[idx], rowH).stroke("#bbbbbb");
          doc
            .font("Helvetica")
            .fontSize(8)
            .text(val, rx + 4, y + 7, {
              width: widths[idx] - 8,
              align: idx === 2 ? "left" : "center",
            });
          rx += widths[idx];
        });
        y += rowH;
      });
    }

    // Totals
    y += 8;
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(`Total Received: ${totalReceived.toLocaleString("en-IN")}`, startX + 180, y);
    y += 14;
    doc.text(`Total Paid: ${totalPaid.toLocaleString("en-IN")}`, startX + 180, y);
    y += 14;
    doc.text(`Balance: ${balanceText}`, startX + 180, y);

    // Footer note
    y += 26;
    doc.font("Helvetica").fontSize(9).text(
      `${new Date().toLocaleDateString("en-GB")}\nBalance: ${balanceText}\nI will pay as soon as possible.\nThank You.`,
      startX,
      y
    );

    doc.end();
  } catch (err: any) {
    console.error("Reminder PDF error:", err);
    res.status(500).json({ error: "Failed to generate reminder PDF", details: err.message });
  }
});


export default router;
