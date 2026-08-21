import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { serviceJobs } from './jobs.ts';
import { users } from './identity.ts';

export const quotations = sqliteTable('quotations', {
  id: text('id').primaryKey(),
  quotationNumber: text('quotation_number').notNull().unique(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  partsSubtotal: real('parts_subtotal').notNull().default(0.0),
  laborSubtotal: real('labor_subtotal').notNull().default(0.0),
  discountAmount: real('discount_amount').notNull().default(0.0),
  taxAmount: real('tax_amount').notNull().default(0.0),
  totalAmount: real('total_amount').notNull().default(0.0),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  validityDays: integer('validity_days').notNull().default(7),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const quotationItems = sqliteTable('quotation_items', {
  id: text('id').primaryKey(),
  quotationId: text('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(), // 'PART' | 'LABOR' | 'OTHER'
  inventoryItemId: text('inventory_item_id'),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0.0),
  taxRate: real('tax_rate').notNull().default(18.0),
  totalPrice: real('total_price').notNull().default(0.0),
});

export const quotationApprovals = sqliteTable('quotation_approvals', {
  id: text('id').primaryKey(),
  quotationId: text('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  approvedAmount: real('approved_amount').notNull(),
  approvalStatus: text('approval_status').notNull(), // 'APPROVED' | 'PARTIAL_APPROVAL' | 'REJECTED'
  approvalMethod: text('approval_method').notNull(), // 'WHATSAPP' | 'PHONE_CALL' | 'IN_PERSON' | 'EMAIL' | 'OTHER'
  customerContactUsed: text('customer_contact_used').notNull(),
  recordedByUserId: text('recorded_by_user_id').notNull().references(() => users.id),
  approvalTimestamp: text('approval_timestamp').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
