import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { devices } from './customers.ts';
import { serviceJobs } from './jobs.ts';
import { invoices } from './billing.ts';
import { products } from './products.ts';

export const warranties = sqliteTable('warranties', {
  id: text('id').primaryKey(),
  warrantyCode: text('warranty_code').notNull().unique(), // e.g. 'WAR-2026-00054'
  customerId: text('customer_id').notNull().references(() => customers.id),
  deviceId: text('device_id').references(() => devices.id),
  originalJobId: text('original_job_id').references(() => serviceJobs.id),
  originalInvoiceId: text('original_invoice_id').references(() => invoices.id),
  productId: text('product_id').references(() => products.id),
  warrantyType: text('warranty_type').notNull(), // 'SERVICE_REPAIR_WARRANTY' | 'SPARE_PART_WARRANTY' | 'REFURBISHED_PRODUCT_WARRANTY'
  startDate: text('start_date').notNull(),
  expiryDate: text('expiry_date').notNull(),
  durationDays: integer('duration_days').notNull(),
  coveredScope: text('covered_scope').notNull(),
  termsAndExclusions: text('terms_and_exclusions'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'EXPIRED' | 'VOIDED_TAMPERED'
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const warrantyJobs = sqliteTable('warranty_jobs', {
  id: text('id').primaryKey(),
  warrantyId: text('warranty_id').notNull().references(() => warranties.id, { onDelete: 'cascade' }),
  warrantyClaimJobId: text('warranty_claim_job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  claimDate: text('claim_date').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  claimIssueReported: text('claim_issue_reported').notNull(),
  resolutionType: text('resolution_type').notNull().default('FREE_RE_REPAIR'), // 'FREE_RE_REPAIR' | 'PART_REPLACEMENT_RMA' | 'REJECTED_OUT_OF_SCOPE'
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const communicationTemplates = sqliteTable('communication_templates', {
  id: text('id').primaryKey(),
  templateKey: text('template_key').notNull().unique(), // 'ADMISSION_SLIP' | 'ESTIMATE_QUOTE' | 'APPROVAL_REQUEST' | 'REPAIR_UPDATE' | 'WAITING_PARTS' | 'READY_FOR_PICKUP' | 'INVOICE_BILL'
  name: text('name').notNull(),
  templateBody: text('template_body').notNull(),
  variablesJson: text('variables_json'),
  isActive: integer('is_active').notNull().default(1),
});

export const communicationMessages = sqliteTable('communication_messages', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  serviceJobId: text('service_job_id').references(() => serviceJobs.id),
  channel: text('channel').notNull().default('WHATSAPP_API'), // 'WHATSAPP_API' | 'WHATSAPP_DEEP_LINK' | 'SMS'
  recipientPhone: text('recipient_phone').notNull(),
  templateKey: text('template_key').notNull(),
  messagePayload: text('message_payload').notNull(),
  dispatchStatus: text('dispatch_status').notNull().default('PENDING'), // 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
