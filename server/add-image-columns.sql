-- Add image_path columns to sales and purchases tables
-- Run this script to add image support to existing tables

ALTER TABLE sales ADD COLUMN image_path VARCHAR(255) NULL;
ALTER TABLE purchases ADD COLUMN image_path VARCHAR(255) NULL;

-- Add indexes for better performance
CREATE INDEX idx_sales_image_path ON sales(image_path);
CREATE INDEX idx_purchases_image_path ON purchases(image_path);
