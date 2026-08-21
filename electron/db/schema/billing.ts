import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { serviceJobs } from './jobs.ts';
import { users } from './identity.ts';

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(), // e.g. 'INV-2026-00145'
  invoiceType: text('invoice_type').notNull().default('SERVICE_REPAIR'), // 'SERVICE_REPAIR' | 'RETAIL_SALE' | 'PC_BUILD' | 'DATA_RECOVERY'
  customerId: text('customer_id').notNull().references(() => customers.id),
  serviceJobId: text('service_job_id').references(() => serviceJobs.id),
  isGstInvoice: integer('is_gst_invoice').notNull().default(1),
  customerGstin: text('customer_gstin'),
  subtotalParts: real('subtotal_parts').notNull().default(0.0),
  subtotalLabor: real('subtotal_labor').notNull().default(0.0),
  discountAmount: real('discount_amount').notNull().default(0.0),
  cgstAmount: real('cgst_amount').notNull().default(0.0),
  sgstAmount: real('sgst_amount').notNull().default(0.0),
  igstAmount: real('igst_amount').notNull().default(0.0),
  totalAmount: real('total_amount').notNull().default(0.0),
  advanceAdjusted: real('advance_adjusted').notNull().default(0.0),
  amountPaid: real('amount_paid').notNull().default(0.0),
  balanceDue: real('balance_due').notNull().default(0.0),
  paymentStatus: text('payment_status').notNull().default('UNPAID'), // 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED'
  isVoid: integer('is_void').notNull().default(0),
  voidReason: text('void_reason'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(), // 'SERVICE_LABOR' | 'SPARE_PART' | 'REFURBISHED_PRODUCT' | 'PC_COMPONENT'
  itemRefId: text('item_ref_id'),
  description: text('description').notNull(),
  hsnSacCode: text('hsn_sac_code'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0.0),
  discount: real('discount').notNull().default(0.0),
  taxRate: real('tax_rate').notNull().default(18.0),
  taxAmount: real('tax_amount').notNull().default(0.0),
  totalAmount: real('total_amount').notNull().default(0.0),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(), // e.g. 'RCP-2026-00084'
  invoiceId: text('invoice_id').references(() => invoices.id),
  serviceJobId: text('service_job_id').references(() => serviceJobs.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  paymentType: text('payment_type').notNull(), // 'ADVANCE_DEPOSIT' | 'INVOICE_SETTLEMENT' | 'PARTIAL_PAYMENT' | 'REFUND'
  paymentMode: text('payment_mode').notNull(), // 'CASH' | 'UPI_QR' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER'
  transactionReference: text('transaction_reference'),
  amount: real('amount').notNull(),
  receivedBy: text('received_by').notNull().references(() => users.id),
  paymentDate: text('payment_date').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
