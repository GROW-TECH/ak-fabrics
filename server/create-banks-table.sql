-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    qr_code TEXT, -- Base64 encoded QR code image
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_shop_id (shop_id),
    INDEX idx_bank_name (bank_name),
    INDEX idx_is_active (is_active)
);

-- Insert sample bank data
INSERT INTO banks (shop_id, bank_name, ifsc_code, account_number, qr_code) VALUES 
('shop1', 'State Bank of India', 'SBIN0000001', '1234567890123456', NULL),
('shop1', 'HDFC Bank', 'HDFC0000001', '9876543210987654', NULL),
('shop1', 'ICICI Bank', 'ICIC0000001', '4567890123456789', NULL);
