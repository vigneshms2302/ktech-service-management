import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './identity.ts';

export const inventoryCategories = sqliteTable('inventory_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(), // 'RAM' | 'SSD' | 'PANEL' | 'IC' | 'KEYBOARD' | 'BATTERY' | 'SMPS_PART' | 'CONSOLES'
  description: text('description'),
});

export const inventoryLocations = sqliteTable('inventory_locations', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // 'Main Rack A1', 'Chip Drawer B3'
  description: text('description'),
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  gstin: text('gstin'),
  address: text('address'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const salvageDevices = sqliteTable('salvage_devices', {
  id: text('id').primaryKey(),
  salvageCode: text('salvage_code').notNull().unique(), // e.g. 'SALV-00042'
  originalServiceJobId: text('original_service_job_id'), // link if derived from unrepairable job
  equipmentType: text('equipment_type').notNull(),
  brand: text('brand').notNull(),
  modelName: text('model_name').notNull(),
  serialNumber: text('serial_number'),
  acquisitionType: text('acquisition_type').notNull().default('CUSTOMER_SCRAP_DONATION'), // 'CUSTOMER_SCRAP_DONATION' | 'PURCHASED_SCRAP' | 'ABANDONED'
  acquisitionCost: real('acquisition_cost').notNull().default(0.0),
  dismantledBy: text('dismantled_by').references(() => users.id),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  categoryId: text('category_id').notNull().references(() => inventoryCategories.id),
  itemType: text('item_type').notNull(), // 'NEW_SPARE_PART' | 'USED_PART' | 'SALVAGED_PART' | 'FINISHED_PRODUCT' | 'CONSUMABLE'
  serialNumber: text('serial_number'),
  costPrice: real('cost_price').notNull().default(0.0),
  sellingPrice: real('selling_price').notNull().default(0.0),
  hsnCode: text('hsn_code'),
  taxRate: real('tax_rate').notNull().default(18.0),
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  minReorderLevel: integer('min_reorder_level').notNull().default(2),
  locationId: text('location_id').references(() => inventoryLocations.id),
  supplierId: text('supplier_id').references(() => suppliers.id),
  salvageSourceId: text('salvage_source_id').references(() => salvageDevices.id),
  warrantyMonths: integer('warranty_months').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const salvageParts = sqliteTable('salvage_parts', {
  id: text('id').primaryKey(),
  salvageDeviceId: text('salvage_device_id').notNull().references(() => salvageDevices.id, { onDelete: 'cascade' }),
  inventoryItemId: text('inventory_item_id').references(() => inventoryItems.id),
  partName: text('part_name').notNull(),
  serialNumber: text('serial_number'),
  testedCondition: text('tested_condition').notNull().default('GRADE_A_WORKING'), // 'GRADE_A_WORKING' | 'GRADE_B_MINOR_DEFECT' | 'UNTESTED'
  estimatedValue: real('estimated_value').notNull().default(0.0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const inventoryTransactions = sqliteTable('inventory_transactions', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull().references(() => inventoryItems.id),
  transactionType: text('transaction_type').notNull(), // 'PURCHASE_IN' | 'JOB_CONSUMPTION' | 'DIRECT_SALE' | 'SALVAGE_IN' | 'RETURN_TO_SUPPLIER' | 'DEFECTIVE_SCRAP' | 'AUDIT_ADJUSTMENT'
  quantityDelta: integer('quantity_delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  referenceType: text('reference_type').notNull(), // 'SERVICE_JOB' | 'INVOICE' | 'SALVAGE_DEVICE' | 'SUPPLIER_PURCHASE' | 'MANUAL'
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
