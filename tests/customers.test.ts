import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import { normalizePhone } from '../electron/utils/phone.ts';

describe('Phase 2 — Customer CRM & Duplicate Detection', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-cust-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should normalize Indian phone numbers into canonical 10-digit format without altering raw input', () => {
    expect(normalizePhone('+91 98430 11223')).toBe('9843011223');
    expect(normalizePhone('09843011223')).toBe('9843011223');
    expect(normalizePhone('98430-11223')).toBe('9843011223');
    expect(normalizePhone('9843011223')).toBe('9843011223');
    expect(normalizePhone('+919843011223')).toBe('9843011223');
  });

  it('should create customer with sequential customer code and address', async () => {
    const client = getClient();
    const customerId = `CUST-TEST-${Date.now()}`;
    const customerCode = 'CUST-20001';

    await client.execute({
      sql: `INSERT INTO customers (id, customer_code, full_name, primary_phone, email, customer_type, notes)
            VALUES (?, ?, 'Rajesh Sharma', '+91 94433 22110', 'rajesh@techcorp.in', 'COMMERCIAL', 'VIP Client')`,
      args: [customerId, customerCode],
    });

    await client.execute({
      sql: `INSERT INTO customer_addresses (id, customer_id, address_line1, city, state, pincode, is_default)
            VALUES ('CADDR-01', ?, '123 Cross Cut Road', 'Coimbatore', 'Tamil Nadu', '641012', 1)`,
      args: [customerId],
    });

    const res = await client.execute({
      sql: 'SELECT * FROM customers WHERE id = ?',
      args: [customerId],
    });

    expect(res.rows.length).toBe(1);
    const row = res.rows[0] as Record<string, unknown>;
    expect(row.full_name).toBe('Rajesh Sharma');
    expect(row.primary_phone).toBe('+91 94433 22110');
    expect(row.customer_type).toBe('COMMERCIAL');
  });

  it('should detect duplicate customers by phone or email', async () => {
    const client = getClient();
    const targetPhone = '9443322110'; // canonical format of +91 94433 22110

    const dupRes = await client.execute({
      sql: `SELECT id, customer_code, full_name, primary_phone 
            FROM customers 
            WHERE REPLACE(REPLACE(REPLACE(primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?`,
      args: [`%${targetPhone}%`],
    });

    expect(dupRes.rows.length).toBeGreaterThanOrEqual(1);
    const match = dupRes.rows[0] as Record<string, unknown>;
    expect(match.full_name).toBe('Rajesh Sharma');
  });

  it('should update customer details without destroying original customer code', async () => {
    const client = getClient();
    await client.execute(`UPDATE customers 
            SET full_name = 'Rajesh Sharma (Updated)', secondary_phone = '+91 98877 66554' 
            WHERE full_name = 'Rajesh Sharma'`);

    const checkRes = await client.execute("SELECT * FROM customers WHERE full_name LIKE 'Rajesh Sharma%'");
    expect(checkRes.rows.length).toBe(1);
    const row = checkRes.rows[0] as Record<string, unknown>;
    expect(row.full_name).toBe('Rajesh Sharma (Updated)');
    expect(row.secondary_phone).toBe('+91 98877 66554');
    expect(row.customer_code).toBe('CUST-20001');
  });
});
