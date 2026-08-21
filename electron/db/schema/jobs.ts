import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { devices } from './customers.ts';
import { users } from './identity.ts';

export const serviceJobs = sqliteTable('service_jobs', {
  id: text('id').primaryKey(),
  jobNumber: text('job_number').notNull().unique(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  deviceId: text('device_id').notNull().references(() => devices.id),
  serviceCategory: text('service_category').notNull(), // 'CHIP_LEVEL' | 'HARDWARE_REPLACEMENT' | 'OS_SOFTWARE' | 'GENERAL_SERVICE' | 'DATA_RECOVERY' | 'POWER_ELECTRONICS' | 'CONSOLE_REPAIR' | 'PRINTER_SERVICE' | 'CUSTOM_BUILD'
  currentStatus: text('current_status').notNull().default('RECEIVED'),
  priority: text('priority').notNull().default('NORMAL'), // 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL'
  assignedTechnicianId: text('assigned_technician_id').references(() => users.id),
  reportedIssue: text('reported_issue').notNull(),
  accessoriesReceived: text('accessories_received'), // JSON array: ["CHARGER", "BAG"]
  physicalConditionNotes: text('physical_condition_notes'),
  estimatedCost: real('estimated_cost').notNull().default(0.0),
  advanceDeposit: real('advance_deposit').notNull().default(0.0),
  promisedDeliveryDate: text('promised_delivery_date'),
  actualDeliveryDate: text('actual_delivery_date'),
  isWarrantyJob: integer('is_warranty_job').notNull().default(0),
  parentWarrantyId: text('parent_warranty_id'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobStatusHistory = sqliteTable('job_status_history', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  changedBy: text('changed_by').notNull().references(() => users.id),
  reasonOrNotes: text('reason_or_notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobInspections = sqliteTable('job_inspections', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  inspectedBy: text('inspected_by').notNull().references(() => users.id),
  powerStatus: text('power_status').notNull().default('NORMAL_POWER'),
  displayStatus: text('display_status'),
  motherboardStatus: text('motherboard_status'),
  bodyCondition: text('body_condition'),
  waterDamageDetected: integer('water_damage_detected').notNull().default(0),
  shortCircuitDetected: integer('short_circuit_detected').notNull().default(0),
  inspectionNotes: text('inspection_notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobDiagnosis = sqliteTable('job_diagnosis', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  technicianId: text('technician_id').notNull().references(() => users.id),
  rootCauseAnalysis: text('root_cause_analysis').notNull(),
  voltageRailsChecked: text('voltage_rails_checked'), // JSON string
  faultyComponentsIdentified: text('faulty_components_identified'),
  recommendedAction: text('recommended_action'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobServices = sqliteTable('job_services', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  serviceName: text('service_name').notNull(),
  sacCode: text('sac_code'),
  laborCharge: real('labor_charge').notNull().default(0.0),
  discount: real('discount').notNull().default(0.0),
  taxRate: real('tax_rate').notNull().default(18.0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobParts = sqliteTable('job_parts', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  inventoryItemId: text('inventory_item_id'),
  partName: text('part_name').notNull(),
  serialNumber: text('serial_number'),
  quantity: integer('quantity').notNull().default(1),
  unitCostPrice: real('unit_cost_price').notNull().default(0.0),
  unitSellingPrice: real('unit_selling_price').notNull().default(0.0),
  hsnCode: text('hsn_code'),
  taxRate: real('tax_rate').notNull().default(18.0),
  warrantyMonths: integer('warranty_months').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobRepairActivities = sqliteTable('job_repair_activities', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  technicianId: text('technician_id').notNull().references(() => users.id),
  activityTitle: text('activity_title').notNull(),
  description: text('description'),
  timeSpentMinutes: integer('time_spent_minutes').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobNotes = sqliteTable('job_notes', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  noteType: text('note_type').notNull().default('INTERNAL'), // 'INTERNAL' | 'CUSTOMER_FACING'
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobAttachments = sqliteTable('job_attachments', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type'),
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobChecklists = sqliteTable('job_checklists', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  checklistItemName: text('checklist_item_name').notNull(),
  isChecked: integer('is_checked').notNull().default(0),
  checkedBy: text('checked_by').references(() => users.id),
  checkedAt: text('checked_at'),
});

export const jobTests = sqliteTable('job_tests', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  testedBy: text('tested_by').notNull().references(() => users.id),
  testType: text('test_type').notNull(), // 'BOOT_TEST' | 'STRESS_TEST' | 'WIFI_TEST' | 'KEYBOARD_TEST' | 'AUDIO_TEST' | 'CHARGING_TEST' | 'PORTS_TEST'
  result: text('result').notNull().default('PASSED'), // 'PASSED' | 'FAILED' | 'NOT_APPLICABLE'
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
