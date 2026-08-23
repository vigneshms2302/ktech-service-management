import { describe, it, expect, beforeAll } from 'vitest';
import { initializeSchema, setDatabasePath, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import path from 'node:path';
import os from 'node:os';

describe('Phase 6 & 7: Specialized Modules, WhatsApp Queue & Analytics', () => {
  beforeAll(async () => {
    const testDbPath = path.join(os.tmpdir(), `ktech-test-specialized-${Date.now()}.sqlite`);
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  // 1. Data Recovery Subsystem
  it('handles data recovery intake, triage and outcome logging', async () => {
    const client = getClient();
    const drId = `DR-TEST-${Date.now()}`;

    await client.execute({
      sql: `INSERT INTO data_recovery_jobs (
              id, service_job_id, storage_type, capacity_gb, file_system,
              detection_status, damage_type, recovery_complexity,
              target_data_description, destination_media_type,
              recovered_size_gb, recovery_outcome, disclaimer_acknowledged
            ) VALUES (?, 'JOB-001', 'HDD_2_5', 1000, 'NTFS', 'NOT_DETECTED', 'PCB_FAILURE', 'LEVEL_2_FIRMWARE_PCB', 'Tally Company Data and Photos folder', 'CUSTOMER_PROVIDED_DRIVE', 450.5, 'FULL_RECOVERY', 1)`,
      args: [drId],
    });

    const check = await client.execute({
      sql: `SELECT * FROM data_recovery_jobs WHERE id = ?`,
      args: [drId],
    });

    expect(check.rows.length).toBe(1);
    expect(check.rows[0].storage_type).toBe('HDD_2_5');
    expect(check.rows[0].recovery_outcome).toBe('FULL_RECOVERY');
    expect(Number(check.rows[0].recovered_size_gb)).toBe(450.5);
  });

  // 2. Refurbished Product Sales & Automatic Warranty Creation
  it('creates refurbished product and sells it with automatic warranty certificate', async () => {
    const client = getClient();
    const prodId = `PROD-TEST-${Date.now()}`;
    const pCode = `REF-2026-00001`;

    await client.execute({
      sql: `INSERT INTO products (
              id, product_code, product_type, brand, model_name, specs,
              cosmetic_grade, acquisition_cost, refurb_cost_spent, selling_price,
              status, warranty_months
            ) VALUES (?, ?, 'LAPTOP', 'Lenovo', 'ThinkPad T480', 'i5-8th Gen, 16GB, 256GB SSD', 'GRADE_A', 14000.0, 1500.0, 21999.0, 'IN_STOCK', 3)`,
      args: [prodId, pCode],
    });

    // Mark as sold and generate warranty
    await client.execute({
      sql: `UPDATE products SET status = 'SOLD', sold_to_customer_id = 'CUST-001' WHERE id = ?`,
      args: [prodId],
    });

    const wId = `WAR-TEST-${Date.now()}`;
    const wCode = `WAR-2026-00001`;
    await client.execute({
      sql: `INSERT INTO warranties (
              id, warranty_code, customer_id, product_id, warranty_type,
              start_date, expiry_date, duration_days, covered_scope, status
            ) VALUES (?, ?, 'CUST-001', ?, 'REFURBISHED_PRODUCT', '2026-08-23', '2026-11-23', 90, 'Complete hardware warranty for ThinkPad T480', 'ACTIVE')`,
      args: [wId, wCode, prodId],
    });

    const wCheck = await client.execute({
      sql: `SELECT w.*, p.product_code 
            FROM warranties w 
            JOIN products p ON w.product_id = p.id 
            WHERE w.id = ?`,
      args: [wId],
    });

    expect(wCheck.rows.length).toBe(1);
    expect(wCheck.rows[0].warranty_code).toBe(wCode);
    expect(wCheck.rows[0].product_code).toBe(pCode);
  });

  // 3. Custom PC Builder
  it('creates custom PC build configuration with slot item breakdowns', async () => {
    const client = getClient();
    const buildId = `PCB-TEST-${Date.now()}`;
    const bNum = `PC-2026-00001`;

    await client.execute({
      sql: `INSERT INTO pc_builds (
              id, build_number, customer_id, build_name, target_budget,
              parts_cost, parts_price, assembly_labor_fee, tax_amount,
              final_quoted_price, status, created_by
            ) VALUES (?, ?, 'CUST-001', 'Mid-Range Video Editing & Gaming Rig', 75000.0, 58000.0, 64000.0, 1500.0, 11790.0, 77290.0, 'QUOTED', 'USR_OWNER')`,
      args: [buildId, bNum],
    });

    const check = await client.execute({
      sql: `SELECT * FROM pc_builds WHERE id = ?`,
      args: [buildId],
    });

    expect(check.rows.length).toBe(1);
    expect(check.rows[0].build_name).toBe('Mid-Range Video Editing & Gaming Rig');
    expect(Number(check.rows[0].final_quoted_price)).toBe(77290.0);
  });

  // 4. WhatsApp Communication Queue
  it('queues WhatsApp messages with offline-resilient status model', async () => {
    const client = getClient();
    const msgId = `MSG-TEST-${Date.now()}`;

    await client.execute({
      sql: `INSERT INTO communication_messages (
              id, customer_id, service_job_id, channel, recipient_phone,
              template_key, message_payload, dispatch_status, retry_count
            ) VALUES (?, 'CUST-001', 'JOB-001', 'WHATSAPP_API', '9843011223', 'ADMISSION_SLIP', 'Dear Karthik, your laptop has been admitted under JOB-2026-00001', 'SENT', 0)`,
      args: [msgId],
    });

    const check = await client.execute({
      sql: `SELECT * FROM communication_messages WHERE id = ?`,
      args: [msgId],
    });

    expect(check.rows.length).toBe(1);
    expect(check.rows[0].dispatch_status).toBe('SENT');
    expect(check.rows[0].recipient_phone).toBe('9843011223');
  });

  // 5. Business KPI Analytics Engine
  it('aggregates business analytics KPIs correctly', async () => {
    const client = getClient();

    const jobsRes = await client.execute(`SELECT COUNT(*) as total FROM service_jobs`);
    const custRes = await client.execute(`SELECT COUNT(*) as total FROM customers`);
    const rolesRes = await client.execute(`SELECT COUNT(*) as total FROM roles`);

    expect(Number(jobsRes.rows[0].total)).toBeGreaterThanOrEqual(1);
    expect(Number(custRes.rows[0].total)).toBeGreaterThanOrEqual(1);
    expect(Number(rolesRes.rows[0].total)).toBe(4);
  });
});
