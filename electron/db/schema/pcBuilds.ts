import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { users } from './identity.ts';
import { inventoryItems } from './inventory.ts';

export const pcBuilds = sqliteTable('pc_builds', {
  id: text('id').primaryKey(),
  buildNumber: text('build_number').notNull().unique(), // e.g. 'BUILD-2026-00015'
  customerId: text('customer_id').notNull().references(() => customers.id),
  buildName: text('build_name').notNull(),
  targetBudget: real('target_budget').notNull().default(0.0),
  partsCost: real('parts_cost').notNull().default(0.0),
  partsPrice: real('parts_price').notNull().default(0.0),
  assemblyLaborFee: real('assembly_labor_fee').notNull().default(0.0),
  discountAmount: real('discount_amount').notNull().default(0.0),
  taxAmount: real('tax_amount').notNull().default(0.0),
  finalQuotedPrice: real('final_quoted_price').notNull().default(0.0),
  status: text('status').notNull().default('DRAFT'), // 'DRAFT' | 'QUOTED' | 'APPROVED_ASSEMBLING' | 'TESTING' | 'DELIVERED' | 'CANCELLED'
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const pcBuildItems = sqliteTable('pc_build_items', {
  id: text('id').primaryKey(),
  pcBuildId: text('pc_build_id').notNull().references(() => pcBuilds.id, { onDelete: 'cascade' }),
  componentSlot: text('component_slot').notNull(), // 'CPU' | 'MOTHERBOARD' | 'RAM' | 'GPU' | 'SSD' | 'HDD' | 'PSU' | 'CABINET' | 'COOLER' | 'MONITOR' | 'KEYBOARD' | 'MOUSE' | 'OS' | 'OTHER'
  inventoryItemId: text('inventory_item_id').references(() => inventoryItems.id),
  itemName: text('item_name').notNull(),
  specs: text('specs'),
  quantity: integer('quantity').notNull().default(1),
  unitCost: real('unit_cost').notNull().default(0.0),
  unitPrice: real('unit_price').notNull().default(0.0),
  taxRate: real('tax_rate').notNull().default(18.0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
