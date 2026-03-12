import express from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET all stock transfers
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { shop_id } = req.shop!;
    const [transfers] = await pool.execute(
      `SELECT st.*, p.name as product_name
       FROM stock_transfers st
       JOIN products p ON st.product_id = p.id
       WHERE st.shop_id = ?
       ORDER BY st.created_at DESC`,
      [shop_id]
    );
    res.json(transfers);
  } catch (error) {
    console.error('Error fetching stock transfers:', error);
    res.status(500).json({ error: 'Failed to fetch stock transfers' });
  }
});

// POST new stock transfer
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { shop_id } = req.shop!;
    const { product_id, quantity, from_location, to_location, notes, color_transfers } = req.body;

    if (!product_id || !quantity || !from_location || !to_location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check current stock
      const [productCheck] = await connection.execute(
        'SELECT stock, color_stock FROM products WHERE id = ? AND shop_id = ? FOR UPDATE',
        [product_id, shop_id]
      ) as any[];

      if (productCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Product not found' });
      }

      const currentStock = productCheck[0].stock;
      const currentColors = (() => { try { return JSON.parse(productCheck[0].color_stock || "[]"); } catch { return []; } })();
      const transferQuantity = Number(quantity);

      if (transferQuantity > currentStock) {
        await connection.rollback();
        return res.status(400).json({ error: 'Insufficient stock available' });
      }

      // Update main stock and color-wise stock
      let newColors = currentColors;
      if (Array.isArray(color_transfers) && color_transfers.length && currentColors.length) {
        newColors = currentColors.map((c: any) => {
          const match = color_transfers.find((t: any) => t.color === c.color);
          const deduct = match ? Number(match.qty) || 0 : 0;
          return { ...c, qty: (Number(c.qty) || 0) - deduct };
        });
      }
      await connection.execute(
        'UPDATE products SET stock = stock - ?, color_stock = ? WHERE id = ? AND shop_id = ?',
        [transferQuantity, JSON.stringify(newColors), product_id, shop_id]
      );

      // Update or create erode stock
      const [erodeCheck] = await connection.execute(
        'SELECT stock FROM products WHERE id = ? AND shop_id = ?',
        [product_id, shop_id]
      ) as any[];

      if (erodeCheck.length > 0) {
        await connection.execute(
          'UPDATE products SET erode_stock = COALESCE(erode_stock, 0) + ? WHERE id = ? AND shop_id = ?',
          [transferQuantity, product_id, shop_id]
        );
      } else {
        await connection.execute(
          'UPDATE products SET erode_stock = ? WHERE id = ? AND shop_id = ?',
          [transferQuantity, product_id, shop_id]
        );
      }

      // Create transfer record
      const transferId = uuidv4();
      await connection.execute(
        `INSERT INTO stock_transfers 
          (id, product_id, shop_id, quantity, from_location, to_location, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [transferId, product_id, shop_id, transferQuantity, from_location, to_location, notes || null]
      );

      await connection.commit();
      res.status(201).json({
        message: 'Stock transferred successfully',
        transfer_id: transferId,
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Error creating stock transfer:', error);
    res.status(500).json({ error: 'Failed to transfer stock' });
  }
});

export default router;
