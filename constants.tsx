
import { Account, AccountType, Product, Transaction, TransactionType, Category } from './types';

export const BUSINESS_DETAILS = {
  name: 'AK Fabrics',
  address: '123, Textile Market, Ring Road, Surat, Gujarat - 395002',
  gstin: '24AAAAA0000A1Z5',
  phone: '+91 98765 43210',
  email: 'sales@akfabrics.com',
  bankName: 'HDFC Bank',
  accountNo: '50100123456789',
  ifsc: 'HDFC0001234'
};

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'HDFC Current Account', type: AccountType.BANK, balance: 450000, gstin: BUSINESS_DETAILS.gstin },
  { id: 'acc-1-alt', name: 'ICICI Savings Account', type: AccountType.BANK, balance: 85000, gstin: BUSINESS_DETAILS.gstin },
  { id: 'acc-2', name: 'Main Cash Box', type: AccountType.CASH, balance: 12000 },
  { id: 'acc-2-petty', name: 'Petty Cash', type: AccountType.CASH, balance: 1500 },
  { id: 'acc-3', name: 'Royal Textiles Wholesale', type: AccountType.VENDOR, balance: -25000, gstin: '24BBBBB1111B1Z2', address: 'Plot 45, GIDC Pandesara, Surat', state: 'Gujarat' },
  { id: 'acc-4', name: 'Elegant Saree Boutique', type: AccountType.CUSTOMER, balance: 18000, gstin: '27CCCCC2222C1Z3', address: 'Shop 12, Fashion Street, Mumbai', state: 'Maharashtra' },
  { id: 'acc-5', name: 'Zaveri & Sons', type: AccountType.CUSTOMER, balance: 42000, gstin: '24DDDDD3333D1Z4', address: 'Chowk Bazaar, Surat', state: 'Gujarat' },
  { id: 'acc-6', name: 'Thread Works Ltd', type: AccountType.VENDOR, balance: -8000, gstin: '24EEEEE4444E1Z1', address: 'Industrial Area, Ahmedabad', state: 'Gujarat' },
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tr-1',
    date: '2024-05-10',
    type: TransactionType.SALE,
    accountId: 'acc-4',
    amount: 15750,
    taxableAmount: 15000,
    taxAmount: 750,
    gstRate: 5,
    description: 'Bulk Sale of Banarasi Silk',
    invoiceNo: 'AK/24-25/001',
    items: [{ productId: 'p-1', quantity: 30, rate: 500, total: 15000 }]
  }
];
