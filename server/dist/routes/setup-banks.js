"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const router = express_1.default.Router();
// Create banks table if not exists
router.post('/create-table', async (req, res) => {
    try {
        // Create banks table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS banks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id VARCHAR(50) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        ifsc_code VARCHAR(20) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        qr_code TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_shop_id (shop_id),
        INDEX idx_bank_name (bank_name),
        INDEX idx_is_active (is_active)
      )
    `;
        await db_1.default.execute(createTableSQL);
        // Insert sample data if table is empty
        const [existing] = await db_1.default.execute('SELECT COUNT(*) as count FROM banks');
        const count = existing[0].count;
        if (count === 0) {
            const insertSQL = `
        INSERT INTO banks (shop_id, bank_name, ifsc_code, account_number, qr_code) VALUES 
        ('shop1', 'State Bank of India', 'SBIN0000001', '1234567890123456', NULL),
        ('shop1', 'HDFC Bank', 'HDFC0000001', '9876543210987654', NULL),
        ('shop1', 'ICICI Bank', 'ICIC0000001', '4567890123456789', NULL)
      `;
            await db_1.default.execute(insertSQL);
        }
        res.json({
            message: 'Banks table created successfully',
            sampleDataInserted: count === 0
        });
    }
    catch (error) {
        console.error('Error creating banks table:', error);
        res.status(500).json({ error: 'Failed to create banks table' });
    }
});
// Check if table exists
router.get('/check-table', async (req, res) => {
    try {
        const [result] = await db_1.default.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'banks'
    `);
        const tableExists = result[0].count > 0;
        res.json({
            tableExists,
            message: tableExists ? 'Banks table exists' : 'Banks table does not exist'
        });
    }
    catch (error) {
        console.error('Error checking banks table:', error);
        res.status(500).json({ error: 'Failed to check banks table' });
    }
});
exports.default = router;
