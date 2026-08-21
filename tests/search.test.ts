import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import { normalizePhone } from '../electron/utils/phone.ts';

describe('Phase 2 — Multi-Entity Global Search (Ctrl+K)', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-search-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should find customers by canonical phone number', async () => {
    const client = getClient();
    const query = '98430 11223';
    const canonical = normalizePhone(query);

    const res = await client.execute({
      sql: `SELECT id, full_name, primary_phone FROM customers 
            WHERE primary_phone LIKE ? 
               OR REPLACE(REPLACE(REPLACE(primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?`,
      args: [`%${query}%`, `%${canonical}%`],
    });

    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect((res.rows[0] as Record<string, unknown>).full_name).toBe('Karthik Ramanathan');
  });

  it('should find equipment by serial number or brand', async () => {
    const client = getClient();
    const query = 'PF39AB12';

    const res = await client.execute({
      sql: `SELECT id, brand, model_name, serial_number FROM devices 
            WHERE serial_number LIKE ? OR brand LIKE ? OR model_name LIKE ?`,
      args: [`%${query}%`, `%${query}%`, `%${query}%`],
    });

    expect(res.rows.length).toBe(1);
    const row = res.rows[0] as Record<string, unknown>;
    expect(row.brand).toBe('Lenovo');
    expect(row.model_name).toBe('ThinkPad T14 Gen 2');
  });

  it('should find service jobs by Job Number or issue description', async () => {
    const client = getClient();
    const query = 'JOB-2026';

    const res = await client.execute({
      sql: `SELECT j.id, j.job_number, j.reported_issue, c.full_name as customer_name
            FROM service_jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE j.job_number LIKE ? OR j.reported_issue LIKE ?`,
      args: [`%${query}%`, `%${query}%`],
    });

    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect((res.rows[0] as Record<string, unknown>).job_number).toContain('JOB-2026');
  });
});
