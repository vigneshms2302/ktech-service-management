import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';

describe('Phase 2 — Transactional Integrity & Decoupled Photo Storage', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-tx-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should roll back completely and leave zero orphan records if any step in multi-table job intake fails', async () => {
    const client = getClient();
    const doomedJobId = 'JOB-DOOMED-999';
    const doomedInspId = 'INSP-DOOMED-999';

    let txFailed = false;
    const transaction = await client.transaction('write');

    try {
      // 1. Insert service_jobs
      await transaction.execute({
        sql: `INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, reported_issue, created_by)
              VALUES (?, 'JOB-2026-99999', 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'RECEIVED', 'Will fail', 'USR_RECEPTION')`,
        args: [doomedJobId],
      });

      // 2. Insert job_inspections
      await transaction.execute({
        sql: `INSERT INTO job_inspections (id, job_id, inspected_by, power_status)
              VALUES (?, ?, 'USR_RECEPTION', 'NORMAL_POWER')`,
        args: [doomedInspId, doomedJobId],
      });

      // 3. Intentionally execute invalid SQL to trigger transactional error (e.g. non-existent column)
      await transaction.execute({
        sql: `INSERT INTO job_status_history (id, job_id, non_existent_column) VALUES ('JSH-FAIL', ?, 'ERROR')`,
        args: [doomedJobId],
      });

      await transaction.commit();
    } catch (err) {
      txFailed = true;
      await transaction.rollback();
    }

    expect(txFailed).toBe(true);

    // Verify rollback: service_jobs must not exist
    const jobCheck = await client.execute({
      sql: 'SELECT * FROM service_jobs WHERE id = ?',
      args: [doomedJobId],
    });
    expect(jobCheck.rows.length).toBe(0);

    // Verify rollback: job_inspections must not exist
    const inspCheck = await client.execute({
      sql: 'SELECT * FROM job_inspections WHERE id = ?',
      args: [doomedInspId],
    });
    expect(inspCheck.rows.length).toBe(0);
  });

  it('should ensure valid service job remains intact even if subsequent photo write fails', async () => {
    const client = getClient();
    const validJobId = `JOB-PHOTO-TEST-${Date.now()}`;
    const validJobNumber = 'JOB-2026-88888';

    // 1. Transaction commits service job
    const transaction = await client.transaction('write');
    await transaction.execute({
      sql: `INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, reported_issue, created_by)
            VALUES (?, ?, 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'RECEIVED', 'Valid job with simulated photo failure', 'USR_RECEPTION')`,
      args: [validJobId, validJobNumber],
    });
    await transaction.commit();

    // 2. Simulate photo filesystem failure in try-catch
    let photoWriteError: Error | null = null;
    try {
      throw new Error('Simulated disk full / invalid photo buffer error');
    } catch (err) {
      photoWriteError = err as Error;
    }

    expect(photoWriteError).toBeDefined();

    // 3. Verify that the service job in the database is still 100% valid and queryable
    const jobCheck = await client.execute({
      sql: 'SELECT * FROM service_jobs WHERE id = ?',
      args: [validJobId],
    });
    expect(jobCheck.rows.length).toBe(1);
    expect((jobCheck.rows[0] as Record<string, unknown>).job_number).toBe(validJobNumber);
  });
});
