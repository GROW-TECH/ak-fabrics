-- Create sales returns table
CREATE TABLE IF NOT EXISTS sales_returns (
    id VARCHAR(36) PRIMARY KEY,
    original_sale_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    shop_id VARCHAR(50) NOT NULL,
    return_reason TEXT,
    return_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED') DEFAULT 'PENDING',
    total_amount DECIMAL(12,2),
    refund_method ENUM('CASH', 'BANK', 'CREDIT') DEFAULT 'CREDIT',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    FOREIGN KEY (original_sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_original_sale (original_sale_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (return_status),
    INDEX idx_shop (shop_id)
);

-- Create sales return items table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    return_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    batch_number VARCHAR(50),
    return_reason VARCHAR(255),
    
    FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_return_id (return_id),
    INDEX idx_product_id (product_id)
);
