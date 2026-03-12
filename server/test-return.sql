-- Create a test sales return to verify total amount display
INSERT INTO sales_returns (
    id, 
    original_sale_id, 
    customer_id, 
    shop_id, 
    return_reason, 
    total_amount, 
    refund_method, 
    notes, 
    return_status,
    created_at
) VALUES (
    'test-return-001',
    'test-sale-001', 
    'test-customer-001',
    'shop1',
    'Test return for verification',
    1500.75,
    'CREDIT',
    'This is a test return to verify total amount display',
    'PROCESSED',
    NOW()
);

-- Create a test return item
INSERT INTO sales_return_items (
    id,
    return_id,
    product_id,
    quantity,
    rate,
    total,
    return_reason
) VALUES (
    1,
    'test-return-001',
    'test-product-001',
    3,
    500.25,
    1500.75,
    'Test item return'
);
