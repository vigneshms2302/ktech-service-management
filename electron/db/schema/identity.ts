import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  module: text('module').notNull(),
  description: text('description'),
});

export const rolePermissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  pinCode: text('pin_code'),
  fullName: text('full_name').notNull(),
  roleId: text('role_id').notNull().references(() => roles.id),
  phone: text('phone'),
  isActive: integer('is_active').notNull().default(1),
  commissionPct: real('commission_pct').notNull().default(0.0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeState: text('before_state'),
  afterState: text('after_state'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  category: text('category').notNull().default('GENERAL'),
  isEncrypted: integer('is_encrypted').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  backupName: text('backup_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  backupType: text('backup_type').notNull(), // 'AUTO' | 'MANUAL' | 'PRE_RESTORE'
  status: text('status').notNull().default('COMPLETED'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
