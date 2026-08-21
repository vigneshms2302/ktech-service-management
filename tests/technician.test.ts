import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import { generateJobNumber, isValidTransition } from '../electron/ipc/jobIpc.ts';

describe('Phase 3 — Technician Inspection, Diagnosis & Repair Workflow', () => {
  const testDbDir = path.join(process.cwd(), 'data', 'test');
  const testDbPath = path.join(testDbDir, 'ktech-phase3-test.sqlite');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('should validate allowed and reject invalid state transitions according to state machine', () => {
    // Valid transitions
    expect(isValidTransition('RECEIVED', 'WAITING_FOR_INSPECTION')).toBe(true);
    expect(isValidTransition('WAITING_FOR_INSPECTION', 'UNDER_INSPECTION')).toBe(true);
    expect(isValidTransition('UNDER_INSPECTION', 'DIAGNOSIS_COMPLETED')).toBe(true);
    expect(isValidTransition('UNDER_INSPECTION', 'UNREPAIRABLE')).toBe(true);
    expect(isValidTransition('DIAGNOSIS_COMPLETED', 'UNDER_REPAIR')).toBe(true);
    expect(isValidTransition('UNDER_REPAIR', 'WAITING_FOR_PARTS')).toBe(true);
    expect(isValidTransition('WAITING_FOR_PARTS', 'UNDER_REPAIR')).toBe(true);
    expect(isValidTransition('UNDER_REPAIR', 'REPAIR_COMPLETED')).toBe(true);
    expect(isValidTransition('UNDER_REPAIR', 'UNREPAIRABLE')).toBe(true);

    // Invalid transitions
    expect(isValidTransition('RECEIVED', 'REPAIR_COMPLETED')).toBe(false);
    expect(isValidTransition('RECEIVED', 'DELIVERED')).toBe(false);
    expect(isValidTransition('WAITING_FOR_INSPECTION', 'REPAIR_COMPLETED')).toBe(false);
    expect(isValidTransition('UNREPAIRABLE', 'REPAIR_COMPLETED')).toBe(false);
  });

  it('should preserve original customer complaint immutably during diagnosis and repair', async () => {
    const client = getClient();
    const jobId = `JOB-LAPTOP-${Date.now()}`;
    const jobNumber = await generateJobNumber();
    const originalComplaint = 'Laptop powers on but display is completely black and fan spins loudly.';

    // 1. Intake
    await client.execute({
      sql: `INSERT INTO service_jobs (
              id, job_number, customer_id, device_id, service_category, current_status,
              priority, reported_issue, created_by
            ) VALUES (?, ?, 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'RECEIVED', 'NORMAL', ?, 'USR_RECEPTION')`,
      args: [jobId, jobNumber, originalComplaint],
    });

    // 2. Assign Technician
    await client.execute({
      sql: `UPDATE service_jobs SET assigned_technician_id = 'USR_TECH1', current_status = 'UNDER_INSPECTION' WHERE id = ?`,
      args: [jobId],
    });

    // 3. Technician logs technical inspection findings
    const inspId = `INSP-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_inspections (
              id, job_id, inspected_by, power_status, display_status, motherboard_status, inspection_notes
            ) VALUES (?, ?, 'USR_TECH1', 'NORMAL_POWER', 'EXTERNAL_ONLY', 'NORMAL', 'Tested external HDMI - OK. Internal EDP display panel receives no 3.3V LCD_VDD rail.')`,
      args: [inspId, jobId],
    });

    // 4. Technician logs diagnosis
    const diagId = `DIAG-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_diagnosis (
              id, job_id, technician_id, root_cause_analysis, faulty_components_identified, recommended_action
            ) VALUES (?, ?, 'USR_TECH1', 'Display EDP cable fractured near hinge; LCD_VDD switch MOSFET Q2 damaged.', 'Q2 MOSFET, 30-Pin EDP Cable', 'Replace EDP display cable and bypass/replace Q2 MOSFET')`,
      args: [diagId, jobId],
    });

    // 5. Verify the original customer complaint is UNTOUCHED
    const jobRes = await client.execute({ sql: `SELECT reported_issue, current_status FROM service_jobs WHERE id = ?`, args: [jobId] });
    const jobRow = jobRes.rows[0] as Record<string, unknown>;
    expect(jobRow.reported_issue).toBe(originalComplaint);
    expect(jobRow.reported_issue).not.toContain('Q2 MOSFET');

    // Verify diagnosis is stored separately in job_diagnosis
    const diagRes = await client.execute({ sql: `SELECT * FROM job_diagnosis WHERE job_id = ?`, args: [jobId] });
    expect(diagRes.rows.length).toBe(1);
    expect((diagRes.rows[0] as Record<string, unknown>).faulty_components_identified).toBe('Q2 MOSFET, 30-Pin EDP Cable');
  });

  it('should record repair plan actions, required parts, and live repair activities', async () => {
    const client = getClient();
    const jobId = `JOB-REPAIR-${Date.now()}`;
    const jobNumber = await generateJobNumber();

    await client.execute({
      sql: `INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, reported_issue, created_by)
            VALUES (?, ?, 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'UNDER_REPAIR', 'Dead laptop', 'USR_RECEPTION')`,
      args: [jobId, jobNumber],
    });

    // 1. Add Planned Repair Actions (job_services)
    const s1Id = `JSVC-1-${Date.now()}`;
    const s2Id = `JSVC-2-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_services (id, job_id, service_name, labor_charge, tax_rate) VALUES (?, ?, 'Motherboard Chip-Level Rework', 1800.0, 18.0)`,
      args: [s1Id, jobId],
    });
    await client.execute({
      sql: `INSERT INTO job_services (id, job_id, service_name, labor_charge, tax_rate) VALUES (?, ?, 'Thermal System Cleaning & Gelid Paste', 450.0, 18.0)`,
      args: [s2Id, jobId],
    });

    // 2. Add Required Parts (job_parts)
    const p1Id = `JPART-1-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_parts (id, job_id, part_name, serial_number, quantity, unit_cost_price, unit_selling_price, warranty_months)
            VALUES (?, ?, 'FDMS0308AS N-Channel MOSFET', 'SN-M308', 2, 85.0, 350.0, 3)`,
      args: [p1Id, jobId],
    });

    // 3. Log Repair Activity (job_repair_activities)
    const act1Id = `JACT-1-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_repair_activities (id, job_id, technician_id, activity_title, description, time_spent_minutes)
            VALUES (?, ?, 'USR_TECH1', 'Desoldered damaged MOSFET & Cleaned PCB pads', 'Microscope inspection showed thermal crater on high side FET. Cleaned with flux remover.', 45)`,
      args: [act1Id, jobId],
    });

    const act2Id = `JACT-2-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_repair_activities (id, job_id, technician_id, activity_title, description, time_spent_minutes)
            VALUES (?, ?, 'USR_TECH1', 'Soldered new MOSFET & Verified 19V rail', 'Replaced with FDMS0308AS. 19V rail impedance measured 450k ohm (normal). Device booted successfully.', 30)`,
      args: [act2Id, jobId],
    });

    // 4. Verify all records exist and query properly
    const services = await client.execute({ sql: `SELECT * FROM job_services WHERE job_id = ?`, args: [jobId] });
    expect(services.rows.length).toBe(2);

    const parts = await client.execute({ sql: `SELECT * FROM job_parts WHERE job_id = ?`, args: [jobId] });
    expect(parts.rows.length).toBe(1);
    expect((parts.rows[0] as Record<string, unknown>).part_name).toBe('FDMS0308AS N-Channel MOSFET');
    expect((parts.rows[0] as Record<string, unknown>).quantity).toBe(2);

    const activities = await client.execute({ sql: `SELECT * FROM job_repair_activities WHERE job_id = ? ORDER BY created_at ASC`, args: [jobId] });
    expect(activities.rows.length).toBe(2);
    expect((activities.rows[0] as Record<string, unknown>).time_spent_minutes).toBe(45);
    expect((activities.rows[1] as Record<string, unknown>).time_spent_minutes).toBe(30);
  });

  it('should handle PlayStation 5 console scenario with HDMI rework and required port', async () => {
    const client = getClient();
    const jobId = `JOB-PS5-${Date.now()}`;
    const jobNumber = await generateJobNumber();

    // 1. Create PS5 Job
    await client.execute({
      sql: `INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, priority, reported_issue, created_by)
            VALUES (?, ?, 'CUST-001', 'DEV-001', 'CONSOLE_REPAIR', 'UNDER_INSPECTION', 'URGENT', 'PlayStation 5 powers with blue light turning to white, but TV says No Signal', 'USR_RECEPTION')`,
      args: [jobId, jobNumber],
    });

    // 2. Inspection
    await client.execute({
      sql: `INSERT INTO job_inspections (id, job_id, inspected_by, power_status, display_status, inspection_notes)
            VALUES (?, ?, 'USR_TECH1', 'NORMAL_POWER', 'NO_DISPLAY', 'Console boots to white light. HDMI port center pins 4 & 18 bent and shorted. Panasonic HDMI retimer IC hot.')`,
      args: [`INSP-PS5-${Date.now()}`, jobId],
    });

    // 3. Diagnosis
    await client.execute({
      sql: `INSERT INTO job_diagnosis (id, job_id, technician_id, root_cause_analysis, faulty_components_identified, recommended_action)
            VALUES (?, ?, 'USR_TECH1', 'Physical pin breakage inside HDMI port causing pin 18 (5V) to bridge data line, damaging Panasonic MN864739 HDMI encoder IC.', 'PS5 OEM HDMI Port, MN864739 IC', 'Replace HDMI port and MN864739 encoder IC')`,
      args: [`DIAG-PS5-${Date.now()}`, jobId],
    });

    // 4. Parts Required
    await client.execute({
      sql: `INSERT INTO job_parts (id, job_id, part_name, quantity, unit_cost_price, unit_selling_price, warranty_months)
            VALUES (?, ?, 'PlayStation 5 OEM HDMI Port v2.1', 1, 280.0, 1200.0, 3)`,
      args: [`JPART-PS5-1-${Date.now()}`, jobId],
    });
    await client.execute({
      sql: `INSERT INTO job_parts (id, job_id, part_name, quantity, unit_cost_price, unit_selling_price, warranty_months)
            VALUES (?, ?, 'Panasonic MN864739 HDMI Transmitter IC', 1, 650.0, 2200.0, 3)`,
      args: [`JPART-PS5-2-${Date.now()}`, jobId],
    });

    // Verify
    const ps5Parts = await client.execute({ sql: `SELECT * FROM job_parts WHERE job_id = ?`, args: [jobId] });
    expect(ps5Parts.rows.length).toBe(2);
  });

  it('should handle unrepairable scenario with technical justification and state preservation', async () => {
    const client = getClient();
    const jobId = `JOB-UNREP-${Date.now()}`;
    const jobNumber = await generateJobNumber();

    // 1. Create job
    await client.execute({
      sql: `INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, reported_issue, created_by)
            VALUES (?, ?, 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'UNDER_INSPECTION', 'Liquid spilled laptop', 'USR_RECEPTION')`,
      args: [jobId, jobNumber],
    });

    // 2. Mark UNREPAIRABLE
    const reason = 'Multi-layer PCB delamination and charred holes under CPU/PCH SoC with cracked silicon die.';
    await client.execute({
      sql: `UPDATE service_jobs SET current_status = 'UNREPAIRABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [jobId],
    });

    await client.execute({
      sql: `INSERT INTO job_diagnosis (id, job_id, technician_id, root_cause_analysis, recommended_action)
            VALUES (?, ?, 'USR_TECH1', ?, 'Recommend customer transfer unit to Salvage Engine for parts recovery.')`,
      args: [`DIAG-UNREP-${Date.now()}`, jobId, `UNREPAIRABLE: ${reason}`],
    });

    await client.execute({
      sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
            VALUES (?, ?, 'UNDER_INSPECTION', 'UNREPAIRABLE', 'USR_TECH1', ?)`,
      args: [`JSH-UNREP-${Date.now()}`, jobId, reason],
    });

    // Verify job is marked UNREPAIRABLE but record and full diagnosis history are preserved
    const jobRes = await client.execute({ sql: `SELECT current_status FROM service_jobs WHERE id = ?`, args: [jobId] });
    expect((jobRes.rows[0] as Record<string, unknown>).current_status).toBe('UNREPAIRABLE');

    const history = await client.execute({ sql: `SELECT * FROM job_status_history WHERE job_id = ?`, args: [jobId] });
    expect(history.rows.length).toBe(1);
    expect((history.rows[0] as Record<string, unknown>).new_status).toBe('UNREPAIRABLE');
  });
});
