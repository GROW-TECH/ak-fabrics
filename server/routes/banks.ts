import express from 'express';
import pool from '../db';

const router = express.Router();

// Get all banks for a shop
router.get('/', async (req, res) => {
  try {
    const shopId = req.headers['x-shop-id'] || 'shop1';
    
    const [rows] = await pool.execute(
      'SELECT * FROM banks WHERE shop_id = ? AND is_active = TRUE ORDER BY bank_name',
      [shopId]
    ) as [any[], any];
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

// Get a specific bank
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT * FROM banks WHERE id = ? AND is_active = TRUE',
      [id]
    ) as [any[], any];
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching bank:', error);
    res.status(500).json({ error: 'Failed to fetch bank' });
  }
});

// Create a new bank
router.post('/', async (req, res) => {
  try {
    const shopId = req.headers['x-shop-id'] || 'shop1';
    const { bank_name, ifsc_code, account_number, qr_code } = req.body;
    
    // Validate required fields
    if (!bank_name || !ifsc_code || !account_number) {
      return res.status(400).json({ error: 'Bank name, IFSC code, and account number are required' });
    }
    
    // Check if bank with same details already exists
    const [existing] = await pool.execute(
      'SELECT id FROM banks WHERE shop_id = ? AND bank_name = ? AND ifsc_code = ? AND account_number = ? AND is_active = TRUE',
      [shopId, bank_name, ifsc_code, account_number]
    ) as [any[], any];
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Bank with these details already exists' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO banks (shop_id, bank_name, ifsc_code, account_number, qr_code) VALUES (?, ?, ?, ?, ?)',
      [shopId, bank_name, ifsc_code, account_number, qr_code || null]
    ) as [any, any];
    
    res.status(201).json({ 
      id: result.insertId,
      message: 'Bank created successfully' 
    });
  } catch (error) {
    console.error('Error creating bank:', error);
    res.status(500).json({ error: 'Failed to create bank' });
  }
});

// Update a bank
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bank_name, ifsc_code, account_number, qr_code, is_active } = req.body;
    
    // Check if bank exists
    const [existing] = await pool.execute(
      'SELECT id FROM banks WHERE id = ?',
      [id]
    ) as [any[], any];
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    // Update bank
    await pool.execute(
      'UPDATE banks SET bank_name = ?, ifsc_code = ?, account_number = ?, qr_code = ?, is_active = ? WHERE id = ?',
      [bank_name, ifsc_code, account_number, qr_code || null, is_active !== undefined ? is_active : true, id]
    );
    
    res.json({ message: 'Bank updated successfully' });
  } catch (error) {
    console.error('Error updating bank:', error);
    res.status(500).json({ error: 'Failed to update bank' });
  }
});

// Delete a bank (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if bank exists
    const [existing] = await pool.execute(
      'SELECT id FROM banks WHERE id = ? AND is_active = TRUE',
      [id]
    ) as [any[], any];
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Bank not found' });
    }
    
    // Soft delete bank
    await pool.execute(
      'UPDATE banks SET is_active = FALSE WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank:', error);
    res.status(500).json({ error: 'Failed to delete bank' });
  }
});

export default router;
