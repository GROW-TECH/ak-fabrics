import express from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../db';

const router = Router();
router.use(authenticate);

// Generate unique E-way bill number
const generateEwayBillNo = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp.slice(-9)}${random}`.slice(0, 12);
};

// Calculate validity based on distance
const calculateValidity = (distance: number): Date => {
  const now = new Date();
  let validityDays = 1;
  
  if (distance > 1000) validityDays = 10;
  else if (distance > 500) validityDays = 5;
  else if (distance > 300) validityDays = 3;
  else if (distance > 100) validityDays = 2;
  
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + validityDays);
  return validUntil;
};

// POST /api/eway-bills - Generate E-way bill for sale
router.post('/', async (req: any, res: any) => {
  const conn = await pool.getConnection();
  
  try {
    const { sale_id, distance_km = 100, transport_mode = 'ROAD', vehicle_number, transporter_name, transporter_id, from_state, to_state, from_pincode, to_pincode } = req.body;
    
    if (!sale_id) {
      return res.status(400).json({ error: 'Sale ID is required' });
    }
    
    // Check if E-way bill already exists for this sale
    const [existing] = await conn.query(
      'SELECT id FROM eway_bills WHERE sale_id = ? AND status = "ACTIVE"',
      [sale_id]
    ) as any[];
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'E-way bill already exists for this sale' });
    }
    
    // Get sale details
    const [saleResult] = await conn.query(
      'SELECT * FROM sales WHERE id = ? AND shop_id = ?',
      [sale_id, req.shop.shop_id]
    ) as any[];
    
    if (saleResult.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = saleResult[0];
    const totalAmount = Number(sale.total_amount || 0);
    
    // Check if amount exceeds ₹50,000
    if (totalAmount <= 50000) {
      return res.status(400).json({ error: 'E-way bill not required for sales ≤ ₹50,000' });
    }
    
    // Generate E-way bill
    const ewayBillNo = generateEwayBillNo();
    const validFrom = new Date();
    const validUntil = calculateValidity(distance_km);
    
    const [result] = await conn.query(
      `INSERT INTO eway_bills 
        (shop_id, sale_id, eway_bill_no, valid_from, valid_until, distance_km, transport_mode, 
         vehicle_number, transporter_name, transporter_id, from_state, to_state, from_pincode, to_pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.shop.shop_id, sale_id, ewayBillNo, validFrom, validUntil, distance_km, transport_mode,
        vehicle_number, transporter_name, transporter_id, from_state, to_state, from_pincode, to_pincode
      ]
    ) as any[];
    
    res.status(201).json({
      message: 'E-way bill generated successfully',
      eway_bill: {
        id: (result as any).insertId,
        sale_id,
        eway_bill_no: ewayBillNo,
        generated_date: validFrom,
        valid_from: validFrom,
        valid_until: validUntil,
        distance_km,
        transport_mode,
        status: 'ACTIVE'
      }
    });
    
  } catch (error: any) {
    console.error('E-way bill generation error:', error);
    res.status(500).json({ error: 'Failed to generate E-way bill' });
  } finally {
    conn.release();
  }
});

// GET /api/eway-bills - Get all E-way bills for shop
router.get('/', async (req: any, res: any) => {
  const conn = await pool.getConnection();
  
  try {
    console.log('Fetching E-way bills for shop:', req.shop.shop_id);
    
    // Check if eway_bills table exists
    const [tableCheck] = await conn.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'eway_bills'`
    ) as any[];
    
    if (tableCheck[0].count === 0) {
      console.log('E-way bills table does not exist');
      return res.json([]); // Return empty array if table doesn't exist
    }
    
    const [rows] = await conn.query(
      `SELECT eb.*, s.invoice_no, a.name as customer_name, s.total_amount, s.created_at as sale_date
       FROM eway_bills eb
       LEFT JOIN sales s ON eb.sale_id = s.id
       LEFT JOIN accounts a ON s.customer_id = a.id
       WHERE eb.shop_id = ?
       ORDER BY eb.generated_date DESC`,
      [req.shop.shop_id]
    ) as any[];
    
    console.log('E-way bills fetched successfully:', rows.length);
    res.json(rows);
    
  } catch (error: any) {
    console.error('Get E-way bills error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    
    // If table doesn't exist, return empty array
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('E-way bills table does not exist, returning empty array');
      return res.json([]);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch E-way bills', 
      details: error.message,
      code: error.code 
    });
  } finally {
    conn.release();
  }
});

// GET /api/eway-bills/:id - Get specific E-way bill
router.get('/:id', async (req: any, res: any) => {
  const conn = await pool.getConnection();
  
  try {
    const [rows] = await conn.query(
      `SELECT eb.*, s.invoice_no, a.name as customer_name, s.total_amount, s.created_at as sale_date,
              a.address as customer_address, a.phone as customer_phone, a.gstin as customer_gstin
       FROM eway_bills eb
       LEFT JOIN sales s ON eb.sale_id = s.id
       LEFT JOIN accounts a ON s.customer_id = a.id
       WHERE eb.id = ? AND eb.shop_id = ?`,
      [req.params.id, req.shop.shop_id]
    ) as any[];
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'E-way bill not found' });
    }
    
    res.json(rows[0]);
    
  } catch (error: any) {
    console.error('Get E-way bill error:', error);
    res.status(500).json({ error: 'Failed to fetch E-way bill' });
  } finally {
    conn.release();
  }
});

// PUT /api/eway-bills/:id/cancel - Cancel E-way bill
router.put('/:id/cancel', async (req: any, res: any) => {
  const conn = await pool.getConnection();
  
  try {
    const [result] = await conn.query(
      'UPDATE eway_bills SET status = "CANCELLED", updated_at = NOW() WHERE id = ? AND shop_id = ?',
      [req.params.id, req.shop.shop_id]
    ) as any[];
    
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'E-way bill not found' });
    }
    
    res.json({ message: 'E-way bill cancelled successfully' });
    
  } catch (error: any) {
    console.error('Cancel E-way bill error:', error);
    res.status(500).json({ error: 'Failed to cancel E-way bill' });
  } finally {
    conn.release();
  }
});

export default router;
