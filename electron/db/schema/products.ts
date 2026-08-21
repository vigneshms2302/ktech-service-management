import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { inventoryItems } from './inventory.ts';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  productCode: text('product_code').notNull().unique(), // e.g. 'REFURB-LAP-0012'
  productType: text('product_type').notNull(), // 'REFURBISHED_LAPTOP' | 'REFURBISHED_DESKTOP' | 'REFURBISHED_MONITOR' | 'REFURBISHED_CONSOLE' | 'RETAIL_COMPONENT'
  brand: text('brand').notNull(),
  modelName: text('model_name').notNull(),
  serialNumber: text('serial_number'),
  specs: text('specs').notNull(),
  cosmeticGrade: text('cosmetic_grade').notNull().default('GRADE_A'), // 'GRADE_A' | 'GRADE_B' | 'GRADE_C'
  acquisitionCost: real('acquisition_cost').notNull().default(0.0),
  refurbCostSpent: real('refurb_cost_spent').notNull().default(0.0),
  sellingPrice: real('selling_price').notNull().default(0.0),
  status: text('status').notNull().default('IN_STOCK'), // 'IN_STOCK' | 'UNDER_REFURBISHMENT' | 'READY_FOR_SALE' | 'RESERVED' | 'SOLD' | 'RETURNED'
  warrantyMonths: integer('warranty_months').notNull().default(3),
  soldToCustomerId: text('sold_to_customer_id').references(() => customers.id),
  salesInvoiceId: text('sales_invoice_id'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const productSales = sqliteTable('product_sales', {
  id: text('id').primaryKey(),
  saleNumber: text('sale_number').notNull().unique(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  invoiceId: text('invoice_id'),
  totalAmount: real('total_amount').notNull().default(0.0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const productSaleItems = sqliteTable('product_sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull().references(() => productSales.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),
  inventoryItemId: text('inventory_item_id').references(() => inventoryItems.id),
  unitPrice: real('unit_price').notNull().default(0.0),
  quantity: integer('quantity').notNull().default(1),
  taxRate: real('tax_rate').notNull().default(18.0),
  totalAmount: real('total_amount').notNull().default(0.0),
});
