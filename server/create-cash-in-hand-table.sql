-- Create cash_in_hand table for tracking cash transactions separately from bank accounts
CREATE TABLE IF NOT EXISTS cash_in_hand (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id VARCHAR(36) NOT NULL,
  transaction_type ENUM('IN', 'OUT') NOT NULL COMMENT 'IN = cash received, OUT = cash paid',
  amount DECIMAL(12,2) NOT NULL COMMENT 'Transaction amount',
  description TEXT NULL COMMENT 'Description of the transaction',
  reference_type ENUM('SALE', 'PURCHASE', 'MANUAL', 'EXPENSE') NULL COMMENT 'Source of transaction',
  reference_id VARCHAR(36) NULL COMMENT 'Reference to related record (sale_id, purchase_id, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When transaction was created',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
  
  -- Indexes for better performance
  INDEX idx_shop_id (shop_id),
  INDEX idx_reference (reference_type, reference_id),
  INDEX idx_created_at (created_at),
  INDEX idx_transaction_type (transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial cash balance record (optional - can be done via API)
-- This is just a sample query for manual initialization
-- INSERT INTO cash_in_hand (shop_id, transaction_type, amount, description, reference_type, created_at)
-- VALUES ('your-shop-id', 'IN', 5000.00, 'Opening balance', 'MANUAL', NOW());
