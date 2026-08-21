import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import { generateJobNumber } from '../electron/ipc/jobIpc.ts';

describe('Phase 2 — Service Job Lifecycle, State Machine & Job ID', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-job-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should generate unique, sequential human-readable Job IDs (JOB-YYYY-XXXXX)', async () => {
    const jobNum1 = await generateJobNumber();
    const jobNum2 = await generateJobNumber();
    const year = new Date().getFullYear();

    expect(jobNum1).toMatch(new RegExp(`^JOB-${year}-\\d{5}$`));
    expect(jobNum2).toMatch(new RegExp(`^JOB-${year}-\\d{5}$`));
    expect(jobNum1).not.toBe(jobNum2);
  });

  it('should create a service job atomically with initial inspection and RECEIVED status history', async () => {
    const client = getClient();
    const jobId = `JOB-TEST-${Date.now()}`;
    const jobNumber = await generateJobNumber();
    const inspectionId = `INSP-TEST-${Date.now()}`;
    const statusHistoryId = `JSH-TEST-${Date.now()}`;
    const accessories = JSON.stringify(['Charger / Power Adapter', 'Bag', 'Wireless Mouse']);

    const transaction = await client.transaction('write');

    try {
      // 1. Insert service_jobs
      await transaction.execute({
        sql: `INSERT INTO service_jobs (
                id, job_number, customer_id, device_id, service_category, current_status,
                priority, reported_issue, accessories_received, physical_condition_notes,
                estimated_cost, advance_deposit, created_by
              ) VALUES (?, ?, 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'RECEIVED', 'URGENT', 'No display on HDMI', ?, 'Minor scratches on cover', 4500.0, 1000.0, 'USR_RECEPTION')`,
        args: [jobId, jobNumber, accessories],
      });

      // 2. Insert initial job_inspections
      await transaction.execute({
        sql: `INSERT INTO job_inspections (
                id, job_id, inspected_by, power_status, display_status, motherboard_status, body_condition, water_damage_detected
              ) VALUES (?, ?, 'USR_RECEPTION', 'NORMAL_POWER', 'NO_DISPLAY', 'STANDBY_OK', 'NORMAL_WEAR', 0)`,
        args: [inspectionId, jobId],
      });

      // 3. Insert initial status history
      await transaction.execute({
        sql: `INSERT INTO job_status_history (
                id, job_id, previous_status, new_status, changed_by, reason_or_notes
              ) VALUES (?, ?, NULL, 'RECEIVED', 'USR_RECEPTION', 'Intake completed at counter')`,
        args: [statusHistoryId, jobId],
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    // Verify all 3 records were created together
    const jobRes = await client.execute({ sql: 'SELECT * FROM service_jobs WHERE id = ?', args: [jobId] });
    expect(jobRes.rows.length).toBe(1);
    const jobRow = jobRes.rows[0] as Record<string, unknown>;
    expect(jobRow.current_status).toBe('RECEIVED');
    expect(jobRow.priority).toBe('URGENT');
    expect(JSON.parse(jobRow.accessories_received as string)).toContain('Wireless Mouse');

    const inspRes = await client.execute({ sql: 'SELECT * FROM job_inspections WHERE job_id = ?', args: [jobId] });
    expect(inspRes.rows.length).toBe(1);

    const historyRes = await client.execute({ sql: 'SELECT * FROM job_status_history WHERE job_id = ?', args: [jobId] });
    expect(historyRes.rows.length).toBe(1);
  });

  it('should transition status from RECEIVED -> WAITING_FOR_INSPECTION -> UNDER_INSPECTION and record history', async () => {
    const client = getClient();
    const jobId = `JOB-STATE-${Date.now()}`;
    const jobNumber = await generateJobNumber();

    // Create job in RECEIVED state
    await client.execute({
      sql: `INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, reported_issue, created_by)
            VALUES (?, ?, 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'RECEIVED', 'No power', 'USR_RECEPTION')`,
      args: [jobId, jobNumber],
    });

    // 1. Transition to WAITING_FOR_INSPECTION
    await client.execute({
      sql: `UPDATE service_jobs SET current_status = 'WAITING_FOR_INSPECTION' WHERE id = ?`,
      args: [jobId],
    });
    await client.execute({
      sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
            VALUES ('JSH-TRANS-1', ?, 'RECEIVED', 'WAITING_FOR_INSPECTION', 'USR_RECEPTION', 'Queued in inspection pool')`,
      args: [jobId],
    });

    // 2. Transition to UNDER_INSPECTION (claimed by technician)
    await client.execute({
      sql: `UPDATE service_jobs SET current_status = 'UNDER_INSPECTION', assigned_technician_id = 'USR_TECH1' WHERE id = ?`,
      args: [jobId],
    });
    await client.execute({
      sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
            VALUES ('JSH-TRANS-2', ?, 'WAITING_FOR_INSPECTION', 'UNDER_INSPECTION', 'USR_TECH1', 'Technician claimed ticket')`,
      args: [jobId],
    });

    // Verify current status and timeline length
    const jobRes = await client.execute({ sql: 'SELECT current_status, assigned_technician_id FROM service_jobs WHERE id = ?', args: [jobId] });
    const row = jobRes.rows[0] as Record<string, unknown>;
    expect(row.current_status).toBe('UNDER_INSPECTION');
    expect(row.assigned_technician_id).toBe('USR_TECH1');

    const timelineRes = await client.execute({ sql: 'SELECT * FROM job_status_history WHERE job_id = ? ORDER BY created_at ASC', args: [jobId] });
    expect(timelineRes.rows.length).toBe(2);
    expect((timelineRes.rows[0] as Record<string, unknown>).new_status).toBe('WAITING_FOR_INSPECTION');
    expect((timelineRes.rows[1] as Record<string, unknown>).new_status).toBe('UNDER_INSPECTION');
  });
});
