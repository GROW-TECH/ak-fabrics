-- Create stock history table
CREATE TABLE IF NOT EXISTS stock_history (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    shop_id VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    reference_id VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at)
);
