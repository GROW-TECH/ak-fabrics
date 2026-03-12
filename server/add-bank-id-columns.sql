-- Add bank_id column to sales table
ALTER TABLE sales 
ADD COLUMN bank_id INT NULL AFTER payment_mode,
ADD INDEX idx_bank_id (bank_id);

-- Add bank_id column to purchases table  
ALTER TABLE purchases
ADD COLUMN bank_id INT NULL AFTER payment_mode,
ADD INDEX idx_bank_id (bank_id);

-- Add foreign key constraints (optional)
-- ALTER TABLE sales ADD CONSTRAINT fk_sales_bank_id FOREIGN KEY (bank_id) REFERENCES banks(id);
-- ALTER TABLE purchases ADD CONSTRAINT fk_purchases_bank_id FOREIGN KEY (bank_id) REFERENCES banks(id);
