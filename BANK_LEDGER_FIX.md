# Bank Ledger Database Migration Instructions

## Problem
The Bank Ledger is not showing transactions because the sales and purchase tables don't have bank_id columns to store which bank was used for payment.

## Solution Steps

### 1. Run Database Migration
Execute the SQL script to add bank_id columns to both tables:

```sql
-- Run this in your MySQL database
SOURCE d:\projects\akfabrics\server\add-bank-id-columns.sql;
```

Or execute manually:
```sql
-- Add bank_id column to sales table
ALTER TABLE sales 
ADD COLUMN bank_id INT NULL AFTER payment_mode,
ADD INDEX idx_bank_id (bank_id);

-- Add bank_id column to purchases table  
ALTER TABLE purchases
ADD COLUMN bank_id INT NULL AFTER payment_mode,
ADD INDEX idx_bank_id (bank_id);
```

### 2. Backend Updates (Already Done)
✅ Updated sales.ts to extract bankId from req.body
✅ Updated purchase.ts to extract bankId from req.body  
✅ Updated INSERT statements to include bank_id column

### 3. Frontend Updates (Already Done)
✅ SalesForm.tsx sends bankId when payment mode is "Bank Transfer"
✅ PurchaseForm.tsx sends bankId when payment mode is "Bank Transfer"
✅ BankLedger.tsx filters transactions by bankId

### 4. How It Works Now

#### Sales Transactions:
- When payment mode = "Bank Transfer" and bank is selected
- SalesForm sends bankId in the request
- Backend stores bankId in sales table
- BankLedger shows it as deposit for that bank

#### Purchase Transactions:
- When payment mode = "Bank Transfer" and bank is selected  
- PurchaseForm sends bankId in the request
- Backend stores bankId in purchases table
- BankLedger shows it as withdrawal for that bank

### 5. Testing Steps

1. **Run Migration**: Execute the SQL script first
2. **Create Test Sales**: 
   - Go to Sales page
   - Select payment mode "Bank Transfer"
   - Select a bank
   - Create sale with bank payment
3. **Create Test Purchases**:
   - Go to Purchases page  
   - Select payment mode "Bank Transfer"
   - Select a bank
   - Create purchase with bank payment
4. **Check Bank Ledger**:
   - Go to Bank Ledger page
   - Select the same bank
   - Should see the transactions

### 6. Expected Results

After migration and testing:
- Bank Ledger shows sales receipts as deposits
- Bank Ledger shows purchase payments as withdrawals
- Transactions are filtered by selected bank
- Running balance is calculated correctly

### 7. Troubleshooting

If transactions still don't show:
1. Check if migration ran successfully
2. Verify new sales/purchases have bank_id values
3. Check browser console for errors
4. Verify bank selection in forms

The Bank Ledger will now properly show all bank-specific transactions!
