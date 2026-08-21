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

    // Add repair plan action
    const sId = `JSVC-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_services (id, job_id, service_name, labor_charge) VALUES (?, ?, 'BGA Reballing', 1800.0)`,
      args: [sId, jobId],
    });

    // Add required part
    const pId = `JPART-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_parts (id, job_id, part_name, quantity, unit_cost_price, unit_selling_price)
            VALUES (?, ?, 'RT8206B PWM Controller', 1, 150.0, 450.0)`,
      args: [pId, jobId],
    });

    // Add repair activity
    const aId = `JACT-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_repair_activities (id, job_id, technician_id, activity_title, time_spent_minutes)
            VALUES (?, ?, 'USR_TECH1', 'Replaced PWM controller and tested 3.3V/5V rails', 45)`,
      args: [aId, jobId],
    });

    // Verify
    const sRes = await client.execute({ sql: `SELECT * FROM job_services WHERE job_id = ?`, args: [jobId] });
    expect(sRes.rows.length).toBe(1);

    const pRes = await client.execute({ sql: `SELECT * FROM job_parts WHERE job_id = ?`, args: [jobId] });
    expect(pRes.rows.length).toBe(1);

    const aRes = await client.execute({ sql: `SELECT * FROM job_repair_activities WHERE job_id = ?`, args: [jobId] });
    expect(aRes.rows.length).toBe(1);
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

  it('Regression Test: should resolve and load FULL job detail query with all joined entities without SQL errors', async () => {
    const client = getClient();

    // Helper that executes the EXACT queries executed by job:getById
    const fetchFullJobDetail = async (identifier: string) => {
      // 1. Service job
      const jobRes = await client.execute({
        sql: `SELECT j.*, 
                c.full_name as customer_name, c.primary_phone as customer_phone, c.secondary_phone as customer_secondary_phone, c.email as customer_email, c.customer_code,
                d.equipment_type, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial, d.specs_summary as device_specs,
                d.encrypted_security_passcode,
                u.full_name as technician_name,
                cb.full_name as creator_name
              FROM service_jobs j
              LEFT JOIN customers c ON j.customer_id = c.id
              LEFT JOIN devices d ON j.device_id = d.id
              LEFT JOIN users u ON j.assigned_technician_id = u.id
              LEFT JOIN users cb ON j.created_by = cb.id
              WHERE LOWER(j.id) = LOWER(?) OR LOWER(j.job_number) = LOWER(?)
              LIMIT 1`,
        args: [identifier.trim(), identifier.trim()],
      });

      if (jobRes.rows.length === 0) return null;
      const job = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = job.id as string;

      // 2. Inspection
      const inspectionRes = await client.execute({
        sql: `SELECT i.*, u.full_name as inspector_name
              FROM job_inspections i
              LEFT JOIN users u ON i.inspected_by = u.id
              WHERE i.job_id = ?
              ORDER BY i.created_at DESC
              LIMIT 1`,
        args: [actualJobId],
      });

      // 3. Diagnosis
      const diagnosisRes = await client.execute({
        sql: `SELECT d.*, u.full_name as technician_name
              FROM job_diagnosis d
              LEFT JOIN users u ON d.technician_id = u.id
              WHERE d.job_id = ?
              ORDER BY d.created_at DESC`,
        args: [actualJobId],
      });

      // 4. Services
      const servicesRes = await client.execute({
        sql: `SELECT * FROM job_services WHERE job_id = ? ORDER BY created_at ASC`,
        args: [actualJobId],
      });

      // 5. Parts
      const partsRes = await client.execute({
        sql: `SELECT * FROM job_parts WHERE job_id = ? ORDER BY created_at ASC`,
        args: [actualJobId],
      });

      // 6. Activities
      const activitiesRes = await client.execute({
        sql: `SELECT a.*, u.full_name as technician_name
              FROM job_repair_activities a
              LEFT JOIN users u ON a.technician_id = u.id
              WHERE a.job_id = ?
              ORDER BY a.created_at DESC`,
        args: [actualJobId],
      });

      // 7. Checklists
      const checklistRes = await client.execute({
        sql: `SELECT c.*, u.full_name as checked_by_name
              FROM job_checklists c
              LEFT JOIN users u ON c.checked_by = u.id
              WHERE c.job_id = ?
              ORDER BY c.checklist_item_name ASC`,
        args: [actualJobId],
      });

      // 8. Tests
      const testRes = await client.execute({
        sql: `SELECT t.*, u.full_name as tester_name
              FROM job_tests t
              LEFT JOIN users u ON t.tested_by = u.id
              WHERE t.job_id = ?
              ORDER BY t.created_at DESC`,
        args: [actualJobId],
      });

      // 9. Attachments
      const attachmentsRes = await client.execute({
        sql: `SELECT * FROM job_attachments WHERE job_id = ? ORDER BY created_at DESC`,
        args: [actualJobId],
      });

      // 10. Status History
      const statusHistoryRes = await client.execute({
        sql: `SELECT h.*, u.full_name as changed_by_name, u.username as changed_by_username
              FROM job_status_history h
              LEFT JOIN users u ON h.changed_by = u.id
              WHERE h.job_id = ?
              ORDER BY h.created_at ASC`,
        args: [actualJobId],
      });

      // 11. Staff Notes (using canonical created_at ordering)
      const notesRes = await client.execute({
        sql: `SELECT n.*, u.full_name as author_name
              FROM job_notes n
              LEFT JOIN users u ON n.user_id = u.id
              WHERE n.job_id = ?
              ORDER BY n.created_at DESC`,
        args: [actualJobId],
      });

      // 12. Photos
      const photosRes = await client.execute({
        sql: `SELECT * FROM device_photos WHERE job_id = ? OR device_id = ? ORDER BY created_at DESC`,
        args: [actualJobId, (job.device_id as string) || null],
      });

      return {
        job,
        inspection: inspectionRes.rows[0] || null,
        diagnoses: diagnosisRes.rows,
        services: servicesRes.rows,
        parts: partsRes.rows,
        activities: activitiesRes.rows,
        checklists: checklistRes.rows,
        tests: testRes.rows,
        attachments: attachmentsRes.rows,
        statusHistory: statusHistoryRes.rows,
        notes: notesRes.rows,
        photos: photosRes.rows,
      };
    };

    // 1. Verify JOB-001 loads completely
    const detailById = await fetchFullJobDetail('JOB-001');
    expect(detailById).not.toBeNull();
    expect(detailById?.job.id).toBe('JOB-001');
    expect(detailById?.job.job_number).toBe('JOB-2026-00001');
    expect(detailById?.job.customer_name).toBe('Karthik Ramanathan');
    expect(detailById?.job.device_brand).toBe('Lenovo');
    expect(detailById?.job.device_model).toBe('ThinkPad T14 Gen 2');
    expect(detailById?.job.current_status).toBe('UNDER_INSPECTION');

    // 2. Verify JOB-2026-00001 loads identically
    const detailByJobNumber = await fetchFullJobDetail('JOB-2026-00001');
    expect(detailByJobNumber).not.toBeNull();
    expect(detailByJobNumber?.job.id).toBe('JOB-001');
    expect(detailByJobNumber?.job.job_number).toBe('JOB-2026-00001');

    // 3. Verify inserting note and retrieving notes with created_at
    const noteId = `JN-TEST-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_notes (id, job_id, user_id, note_type, content) VALUES (?, 'JOB-001', 'USR_TECH1', 'INTERNAL', 'Tested motherboard thermal dissipation - OK')`,
      args: [noteId],
    });

    const refreshed = await fetchFullJobDetail('JOB-001');
    expect(refreshed?.notes.length).toBeGreaterThanOrEqual(1);

    // 4. Verify non-existent ID gracefully returns null
    const nonExistent = await fetchFullJobDetail('JOB-99999');
    expect(nonExistent).toBeNull();
  });
});
