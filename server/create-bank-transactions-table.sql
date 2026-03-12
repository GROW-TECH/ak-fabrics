-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
    id VARCHAR(50) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    bank_id INT NOT NULL,
    date DATE NOT NULL,
    deposit DECIMAL(15,2) DEFAULT 0,
    withdrawal DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    reference_no VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_shop_id (shop_id),
    INDEX idx_bank_id (bank_id),
    INDEX idx_date (date),
    INDEX idx_shop_bank (shop_id, bank_id),
    
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE,
    
    CONSTRAINT chk_deposit_withdrawal CHECK (
        (deposit > 0 AND withdrawal = 0) OR 
        (withdrawal > 0 AND deposit = 0) OR 
        (deposit = 0 AND withdrawal = 0)
    )
);
