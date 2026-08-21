import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient, logAudit, createDatabaseBackup } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';

describe('SQLite Relational Database & Migrations', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should create and verify exactly 45 relational tables', async () => {
    const client = getClient();
    const result = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;
    `);

    const tableNames = result.rows.map((r) => (r as unknown as { name: string }).name);
    console.log(`Verified ${tableNames.length} SQLite tables:`, tableNames);

    expect(tableNames.length).toBe(45);

    // Verify key tables across all 10 domain subsystems
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('roles');
    expect(tableNames).toContain('permissions');
    expect(tableNames).toContain('role_permissions');
    expect(tableNames).toContain('audit_logs');
    expect(tableNames).toContain('settings');
    expect(tableNames).toContain('backups');
    expect(tableNames).toContain('customers');
    expect(tableNames).toContain('customer_addresses');
    expect(tableNames).toContain('devices');
    expect(tableNames).toContain('device_photos');
    expect(tableNames).toContain('service_jobs');
    expect(tableNames).toContain('job_status_history');
    expect(tableNames).toContain('job_inspections');
    expect(tableNames).toContain('job_diagnosis');
    expect(tableNames).toContain('job_services');
    expect(tableNames).toContain('job_parts');
    expect(tableNames).toContain('job_repair_activities');
    expect(tableNames).toContain('job_notes');
    expect(tableNames).toContain('job_attachments');
    expect(tableNames).toContain('job_checklists');
    expect(tableNames).toContain('job_tests');
    expect(tableNames).toContain('quotations');
    expect(tableNames).toContain('quotation_items');
    expect(tableNames).toContain('quotation_approvals');
    expect(tableNames).toContain('data_recovery_jobs');
    expect(tableNames).toContain('inventory_categories');
    expect(tableNames).toContain('inventory_locations');
    expect(tableNames).toContain('inventory_items');
    expect(tableNames).toContain('inventory_transactions');
    expect(tableNames).toContain('suppliers');
    expect(tableNames).toContain('salvage_devices');
    expect(tableNames).toContain('salvage_parts');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('product_sales');
    expect(tableNames).toContain('product_sale_items');
    expect(tableNames).toContain('pc_builds');
    expect(tableNames).toContain('pc_build_items');
    expect(tableNames).toContain('invoices');
    expect(tableNames).toContain('invoice_items');
    expect(tableNames).toContain('payments');
    expect(tableNames).toContain('warranties');
    expect(tableNames).toContain('warranty_jobs');
    expect(tableNames).toContain('communication_templates');
    expect(tableNames).toContain('communication_messages');
  });

  it('should seed default roles and staff users', async () => {
    const client = getClient();
    const rolesRes = await client.execute('SELECT * FROM roles;');
    expect(rolesRes.rows.length).toBe(4); // OWNER, RECEPTION, TECHNICIAN, ACCOUNTS

    const usersRes = await client.execute('SELECT * FROM users;');
    expect(usersRes.rows.length).toBeGreaterThanOrEqual(5); // admin, reception, tech1, tech2, accounts
  });

  it('should write and retrieve audit logs', async () => {
    const client = getClient();
    await logAudit('USR_OWNER', 'TEST_ACTION', 'settings', 'shop.name', { name: 'Old' }, { name: 'KTech' });

    const auditRes = await client.execute("SELECT * FROM audit_logs WHERE action = 'TEST_ACTION';");
    expect(auditRes.rows.length).toBe(1);
    const entry = auditRes.rows[0] as Record<string, unknown>;
    expect(entry.user_id).toBe('USR_OWNER');
    expect(entry.entity_type).toBe('settings');
  });

  it('should create standalone database backups', async () => {
    const backupResult = await createDatabaseBackup('AUTO');
    expect(backupResult.backupPath).toBeDefined();
    expect(fs.existsSync(backupResult.backupPath)).toBe(true);
    expect(backupResult.fileSizeBytes).toBeGreaterThan(0);
  });
});
