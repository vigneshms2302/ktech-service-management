import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  customerCode: text('customer_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  primaryPhone: text('primary_phone').notNull(),
  secondaryPhone: text('secondary_phone'),
  email: text('email'),
  gstin: text('gstin'),
  customerType: text('customer_type').notNull().default('INDIVIDUAL'), // 'INDIVIDUAL' | 'COMMERCIAL'
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const customerAddresses = sqliteTable('customer_addresses', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  landmark: text('landmark'),
  city: text('city').notNull().default('Coimbatore'),
  state: text('state').notNull().default('Tamil Nadu'),
  pincode: text('pincode'),
  isDefault: integer('is_default').notNull().default(1),
});

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  equipmentType: text('equipment_type').notNull(), // 'LAPTOP' | 'DESKTOP' | 'CUSTOM_PC' | 'MONITOR' | 'PRINTER' | 'PLAYSTATION' | 'XBOX' | 'GAMING_CONSOLE' | 'HDD' | 'SSD' | 'M_2' | 'PEN_DRIVE' | 'SMPS' | 'POWER_SUPPLY' | 'EV_CHARGER' | 'ADAPTER' | 'MOTHERBOARD' | 'OTHER'
  brand: text('brand').notNull(),
  modelName: text('model_name').notNull(),
  serialNumber: text('serial_number'),
  colorFinish: text('color_finish'),
  encryptedSecurityPasscode: text('encrypted_security_passcode'), // AES-256-GCM encrypted vault payload
  specsSummary: text('specs_summary'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const devicePhotos = sqliteTable('device_photos', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  jobId: text('job_id'), // optional link to service_jobs
  photoType: text('photo_type').notNull().default('INTAKE_CONDITION'), // 'INTAKE_CONDITION' | 'DAMAGE_PROOF' | 'COMPLETED_REPAIR'
  filePath: text('file_path').notNull(),
  caption: text('caption'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
