-- Add pincode columns to accounts and shops tables
-- Run this script to add pincode support for GST calculations

ALTER TABLE accounts ADD COLUMN pincode VARCHAR(10) NULL;
ALTER TABLE shops ADD COLUMN pincode VARCHAR(10) NULL;

-- Add indexes for better performance
CREATE INDEX idx_accounts_pincode ON accounts(pincode);
CREATE INDEX idx_shops_pincode ON shops(pincode);
