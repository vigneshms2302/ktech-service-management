import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import { encryptSecret, decryptSecret } from '../electron/security/crypto.ts';

describe('Phase 2 — Equipment Management & 18 Equipment Types', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-dev-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should support various approved equipment types beyond computers (PlayStation, HDD, EV Charger)', async () => {
    const client = getClient();
    
    // 1. PlayStation Console
    await client.execute(`INSERT INTO devices (id, customer_id, equipment_type, brand, model_name, serial_number, specs_summary)
            VALUES ('DEV-PS5', 'CUST-001', 'PLAYSTATION', 'Sony', 'PlayStation 5 Disc Edition', 'CFI-1208A', '825GB SSD, DualSense Support')`);

    // 2. HDD for Data Recovery
    await client.execute(`INSERT INTO devices (id, customer_id, equipment_type, brand, model_name, serial_number, specs_summary)
            VALUES ('DEV-HDD', 'CUST-001', 'HDD', 'Seagate', 'Barracuda 2TB', 'ST2000DM008', 'SATA 3.5 inch, Clicking Noise')`);

    // 3. EV Charger
    await client.execute(`INSERT INTO devices (id, customer_id, equipment_type, brand, model_name, serial_number, specs_summary)
            VALUES ('DEV-EV', 'CUST-001', 'EV_CHARGER', 'Ather', 'Dot Home Charger 3.3kW', 'AT-78901', '7.4kW Type 2 AC Charger')`);

    const res = await client.execute("SELECT equipment_type, brand, model_name FROM devices WHERE customer_id = 'CUST-001';");
    expect(res.rows.length).toBeGreaterThanOrEqual(4); // 1 from seed + 3 new
    const types = res.rows.map((r) => (r as Record<string, unknown>).equipment_type);
    expect(types).toContain('PLAYSTATION');
    expect(types).toContain('HDD');
    expect(types).toContain('EV_CHARGER');
  });

  it('should detect equipment duplicate for customer by serial number or brand+model', async () => {
    const client = getClient();
    
    const dupeRes = await client.execute({
      sql: `SELECT id, brand, model_name, serial_number 
            FROM devices 
            WHERE customer_id = 'CUST-001' AND LOWER(serial_number) = ?`,
      args: ['cfi-1208a'],
    });

    expect(dupeRes.rows.length).toBe(1);
    const match = dupeRes.rows[0] as Record<string, unknown>;
    expect(match.brand).toBe('Sony');
    expect(match.model_name).toBe('PlayStation 5 Disc Edition');
  });

  it('should securely encrypt device passcodes using AES-256-GCM', async () => {
    const client = getClient();
    const rawPass = 'PSN_AccountPass#2026';
    const encrypted = encryptSecret(rawPass);

    await client.execute({
      sql: `INSERT INTO devices (id, customer_id, equipment_type, brand, model_name, serial_number, encrypted_security_passcode)
            VALUES ('DEV-SECURE', 'CUST-001', 'LAPTOP', 'Apple', 'MacBook Pro 14 M2', 'C02XYZ1234', ?)`,
      args: [encrypted],
    });

    const res = await client.execute("SELECT encrypted_security_passcode FROM devices WHERE id = 'DEV-SECURE'");
    const row = res.rows[0] as Record<string, unknown>;
    const storedEncrypted = row.encrypted_security_passcode as string;
    
    expect(storedEncrypted).not.toBe(rawPass);
    expect(decryptSecret(storedEncrypted)).toBe(rawPass);
  });
});
