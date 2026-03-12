-- Create e-way bills table
CREATE TABLE IF NOT EXISTS eway_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    sale_id INT NOT NULL,
    eway_bill_no VARCHAR(12) UNIQUE NOT NULL,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    distance_km DECIMAL(8,2),
    transport_mode ENUM('ROAD', 'RAIL', 'AIR', 'SHIP') DEFAULT 'ROAD',
    vehicle_number VARCHAR(20),
    transporter_name VARCHAR(255),
    transporter_id VARCHAR(15),
    from_state VARCHAR(100),
    to_state VARCHAR(100),
    from_pincode VARCHAR(10),
    to_pincode VARCHAR(10),
    supply_type ENUM('SUPPLY', 'EXPORT', 'SKD/CKD', 'JOB WORK') DEFAULT 'SUPPLY',
    document_type ENUM('TAX INVOICE', 'DELIVERY CHALLAN', 'BILL OF SUPPLY') DEFAULT 'TAX INVOICE',
    status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_shop_id (shop_id),
    INDEX idx_sale_id (sale_id),
    INDEX idx_eway_bill_no (eway_bill_no),
    INDEX idx_generated_date (generated_date),
    INDEX idx_status (status),
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
