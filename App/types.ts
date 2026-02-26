
export enum TransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  RECEIPT = 'RECEIPT',
  PAYMENT = 'PAYMENT',
  SALES_RETURN = 'SALES_RETURN',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  STOCK_IN = 'STOCK_IN', // Internal production/adjustment
  STOCK_OUT = 'STOCK_OUT' // Internal wastage/consumption
}

export enum AccountType {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  BANK = 'BANK',
  CASH = 'CASH',
  INVENTORY = 'INVENTORY',
  EXPENSE = 'EXPENSE',
  REVENUE = 'REVENUE',
  INTERNAL = 'INTERNAL'
}

export interface Product {
  id: string;
  categoryId: string;
  subCategoryId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  // Textile Specific
  designNo?: string;
  color?: string;
  quality?: string;
  location?: string;
}

export interface Category {
  id: string;
  name: string;
  shop_id: string;   // ✅ NEW
  description?: string;
  image?: string;
  isActive: boolean;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  state?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  accountId: string;
  amount: number;
  taxableAmount: number;
  taxAmount: number;
  gstRate?: number;
  description: string;
  items?: TransactionItem[];
  reference?: string;
  invoiceNo?: string;
}

export interface TransactionItem {
  productId: string;
  quantity: number;
  rate: number;
  total: number;
  taxAmount?: number;
  rollNo?: string; // Specific to textile rolls
}
