import { ipcMain } from 'electron';
import { getClient, logAudit, ensureDirectories } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';
import type { InValue } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Validates Phase 2 allowed state transitions.
 */
function isValidTransition(fromStatus: string, toStatus: string): boolean {
  const allowedTransitions: Record<string, string[]> = {
    RECEIVED: ['WAITING_FOR_INSPECTION', 'UNDER_INSPECTION', 'CANCELLED'],
    WAITING_FOR_INSPECTION: ['UNDER_INSPECTION', 'CANCELLED'],
    UNDER_INSPECTION: ['DIAGNOSIS_COMPLETED', 'UNREPAIRABLE', 'WAITING_FOR_INSPECTION', 'CANCELLED'],
    // Extended states for flexibility
    DIAGNOSIS_COMPLETED: ['ESTIMATE_PREPARED', 'UNDER_INSPECTION'],
  };

  const allowed = allowedTransitions[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}

/**
 * Generates an atomic sequential Job ID: JOB-YYYY-XXXXX
 */
export async function generateJobNumber(): Promise<string> {
  const client = getClient();
  const year = new Date().getFullYear();
  const counterKey = `sequence.job_counter_${year}`;

  // Ensure row exists
  await client.execute({
    sql: `INSERT INTO settings (key, value, category) 
          VALUES (?, '0', 'SEQUENCE') 
          ON CONFLICT(key) DO NOTHING`,
    args: [counterKey],
  });

  // Atomic increment and return
  const seqRes = await client.execute({
    sql: `UPDATE settings 
          SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = CURRENT_TIMESTAMP
          WHERE key = ?
          RETURNING value;`,
    args: [counterKey],
  });

  const nextVal = seqRes.rows.length > 0 ? Number((seqRes.rows[0] as Record<string, unknown>).value) : 1;
  return `JOB-${year}-${String(nextVal).padStart(5, '0')}`;
}

export function registerJobIpc(): void {
  // Generate Job Number Preview
  ipcMain.handle('job:generateJobNumber', async () => {
    try {
      const jobNumber = await generateJobNumber();
      return { success: true, data: { jobNumber } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // List Service Jobs with Filters & Pagination
  ipcMain.handle('job:list', async (_event, params: {
    status?: string;
    priority?: string;
    technicianId?: string;
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission jobs.read required' };
      }

      const client = getClient();
      const page = params.page || 1;
      const limit = params.limit || 50;
      const offset = (page - 1) * limit;

      let sqlQuery = `
        SELECT 
          j.*,
          c.full_name as customer_name,
          c.primary_phone as customer_phone,
          c.customer_code,
          d.equipment_type,
          d.brand as device_brand,
          d.model_name as device_model,
          d.serial_number as device_serial,
          u.full_name as technician_name,
          cb.full_name as creator_name
        FROM service_jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN devices d ON j.device_id = d.id
        LEFT JOIN users u ON j.assigned_technician_id = u.id
        LEFT JOIN users cb ON j.created_by = cb.id
        WHERE 1=1
      `;

      const args: InValue[] = [];

      if (params.status && params.status !== 'ALL') {
        sqlQuery += ` AND j.current_status = ?`;
        args.push(params.status);
      }

      if (params.priority && params.priority !== 'ALL') {
        sqlQuery += ` AND j.priority = ?`;
        args.push(params.priority);
      }

      if (params.technicianId) {
        sqlQuery += ` AND j.assigned_technician_id = ?`;
        args.push(params.technicianId);
      }

      if (params.customerId) {
        sqlQuery += ` AND j.customer_id = ?`;
        args.push(params.customerId);
      }

      if (params.search && params.search.trim()) {
        const wildcard = `%${params.search.trim()}%`;
        sqlQuery += ` AND (j.job_number LIKE ? OR c.full_name LIKE ? OR c.primary_phone LIKE ? OR d.brand LIKE ? OR d.model_name LIKE ? OR d.serial_number LIKE ? OR j.reported_issue LIKE ?)`;
        args.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
      }

      sqlQuery += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`;
      args.push(limit, offset);

      const result = await client.execute({ sql: sqlQuery, args });

      // Total count
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM service_jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN devices d ON j.device_id = d.id
        WHERE 1=1
      `;
      const countArgs: InValue[] = [];
      if (params.status && params.status !== 'ALL') {
        countQuery += ` AND j.current_status = ?`;
        countArgs.push(params.status);
      }
      if (params.search && params.search.trim()) {
        const wildcard = `%${params.search.trim()}%`;
        countQuery += ` AND (j.job_number LIKE ? OR c.full_name LIKE ? OR c.primary_phone LIKE ? OR d.serial_number LIKE ?)`;
        countArgs.push(wildcard, wildcard, wildcard, wildcard);
      }

      const countRes = await client.execute({ sql: countQuery, args: countArgs });
      const total = Number((countRes.rows[0] as unknown as { total: number }).total);

      return {
        success: true,
        data: {
          jobs: result.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobNumber: (row as Record<string, unknown>).job_number,
            customerId: (row as Record<string, unknown>).customer_id,
            customerName: (row as Record<string, unknown>).customer_name,
            customerPhone: (row as Record<string, unknown>).customer_phone,
            customerCode: (row as Record<string, unknown>).customer_code,
            deviceId: (row as Record<string, unknown>).device_id,
            equipmentType: (row as Record<string, unknown>).equipment_type,
            deviceBrand: (row as Record<string, unknown>).device_brand,
            deviceModel: (row as Record<string, unknown>).device_model,
            deviceSerial: (row as Record<string, unknown>).device_serial,
            serviceCategory: (row as Record<string, unknown>).service_category,
            currentStatus: (row as Record<string, unknown>).current_status,
            priority: (row as Record<string, unknown>).priority,
            assignedTechnicianId: (row as Record<string, unknown>).assigned_technician_id,
            technicianName: (row as Record<string, unknown>).technician_name,
            reportedIssue: (row as Record<string, unknown>).reported_issue,
            accessoriesReceived: (row as Record<string, unknown>).accessories_received,
            estimatedCost: Number((row as Record<string, unknown>).estimated_cost || 0),
            advanceDeposit: Number((row as Record<string, unknown>).advance_deposit || 0),
            promisedDeliveryDate: (row as Record<string, unknown>).promised_delivery_date,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Job Details by ID
  ipcMain.handle('job:getById', async (_event, { jobId }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission jobs.read required' };
      }

      const client = getClient();

      // 1. Service Job
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
              WHERE j.id = ? OR j.job_number = ?`,
        args: [jobId, jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const job = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = job.id as string;

      // 2. Initial Inspection Record
      const inspectionRes = await client.execute({
        sql: `SELECT i.*, u.full_name as inspector_name
              FROM job_inspections i
              LEFT JOIN users u ON i.inspected_by = u.id
              WHERE i.job_id = ?
              LIMIT 1`,
        args: [actualJobId],
      });
      const inspection = inspectionRes.rows.length > 0 ? (inspectionRes.rows[0] as Record<string, unknown>) : null;

      // 3. Status History Timeline
      const timelineRes = await client.execute({
        sql: `SELECT h.*, u.full_name as changed_by_name, u.username as changed_by_username
              FROM job_status_history h
              LEFT JOIN users u ON h.changed_by = u.id
              WHERE h.job_id = ?
              ORDER BY h.created_at ASC`,
        args: [actualJobId],
      });

      // 4. Job Notes
      const notesRes = await client.execute({
        sql: `SELECT n.*, u.full_name as author_name
              FROM job_notes n
              LEFT JOIN users u ON n.user_id = u.id
              WHERE n.job_id = ?
              ORDER BY n.created_at DESC`,
        args: [actualJobId],
      });

      // 5. Photos
      const photosRes = await client.execute({
        sql: `SELECT * FROM device_photos WHERE job_id = ? OR device_id = ? ORDER BY created_at DESC`,
        args: [actualJobId, (job.device_id as string) || null],
      });

      return {
        success: true,
        data: {
          job: {
            id: job.id,
            jobNumber: job.job_number,
            customerId: job.customer_id,
            customerName: job.customer_name,
            customerPhone: job.customer_phone,
            customerSecondaryPhone: job.customer_secondary_phone,
            customerEmail: job.customer_email,
            customerCode: job.customer_code,
            deviceId: job.device_id,
            equipmentType: job.equipment_type,
            deviceBrand: job.device_brand,
            deviceModel: job.device_model,
            deviceSerial: job.device_serial,
            deviceSpecs: job.device_specs,
            hasPasscode: Boolean(job.encrypted_security_passcode),
            serviceCategory: job.service_category,
            currentStatus: job.current_status,
            priority: job.priority,
            assignedTechnicianId: job.assigned_technician_id,
            technicianName: job.technician_name,
            creatorName: job.creator_name,
            reportedIssue: job.reported_issue,
            accessoriesReceived: job.accessories_received ? JSON.parse(job.accessories_received as string) : [],
            physicalConditionNotes: job.physical_condition_notes,
            estimatedCost: Number(job.estimated_cost || 0),
            advanceDeposit: Number(job.advance_deposit || 0),
            promisedDeliveryDate: job.promised_delivery_date,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
          },
          inspection: inspection
            ? {
                id: inspection.id,
                powerStatus: inspection.power_status,
                displayStatus: inspection.display_status,
                motherboardStatus: inspection.motherboard_status,
                bodyCondition: inspection.body_condition,
                waterDamageDetected: Boolean(inspection.water_damage_detected),
                shortCircuitDetected: Boolean(inspection.short_circuit_detected),
                inspectionNotes: inspection.inspection_notes,
                inspectorName: inspection.inspector_name,
                createdAt: inspection.created_at,
              }
            : null,
          timeline: timelineRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            previousStatus: (row as Record<string, unknown>).previous_status,
            newStatus: (row as Record<string, unknown>).new_status,
            changedByName: (row as Record<string, unknown>).changed_by_name,
            changedByUsername: (row as Record<string, unknown>).changed_by_username,
            reasonOrNotes: (row as Record<string, unknown>).reason_or_notes,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          notes: notesRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            noteType: (row as Record<string, unknown>).note_type,
            content: (row as Record<string, unknown>).content,
            authorName: (row as Record<string, unknown>).author_name,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          photos: photosRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            photoType: (row as Record<string, unknown>).photo_type,
            filePath: (row as Record<string, unknown>).file_path,
            caption: (row as Record<string, unknown>).caption,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create Service Job with Atomic SQLite Transaction
  ipcMain.handle('job:create', async (_event, payload: {
    customerId: string;
    deviceId: string;
    serviceCategory: string;
    priority?: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
    assignedTechnicianId?: string;
    reportedIssue: string;
    accessoriesReceived?: string[]; // e.g. ["CHARGER", "BAG", "CABLE"]
    physicalConditionNotes?: string;
    estimatedCost?: number;
    advanceDeposit?: number;
    promisedDeliveryDate?: string;
    // Initial Inspection condition
    powerStatus?: string;
    displayStatus?: string;
    motherboardStatus?: string;
    bodyCondition?: string;
    waterDamageDetected?: boolean;
    shortCircuitDetected?: boolean;
    inspectionNotes?: string;
    initialNote?: string;
    photosBase64?: Array<{ base64Data: string; caption?: string }>;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.intake') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission jobs.intake required' };
      }

      if (!payload.customerId) return { success: false, error: 'Customer is required' };
      if (!payload.deviceId) return { success: false, error: 'Equipment device is required' };
      if (!payload.reportedIssue || !payload.reportedIssue.trim()) {
        return { success: false, error: 'Customer reported issue is required' };
      }

      const client = getClient();
      const jobNumber = await generateJobNumber();
      const jobId = `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const inspectionId = `INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const statusHistoryId = `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const accessoriesJson = JSON.stringify(payload.accessoriesReceived || []);

      // Execute DB writes in transactional sequence
      const transaction = await client.transaction('write');

      try {
        // 1. Insert service_jobs
        await transaction.execute({
          sql: `INSERT INTO service_jobs (
                  id, job_number, customer_id, device_id, service_category, current_status,
                  priority, assigned_technician_id, reported_issue, accessories_received,
                  physical_condition_notes, estimated_cost, advance_deposit, promised_delivery_date,
                  created_by
                ) VALUES (?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            jobId,
            jobNumber,
            payload.customerId,
            payload.deviceId,
            payload.serviceCategory || 'GENERAL_SERVICE',
            payload.priority || 'NORMAL',
            payload.assignedTechnicianId || null,
            payload.reportedIssue.trim(),
            accessoriesJson,
            payload.physicalConditionNotes ? payload.physicalConditionNotes.trim() : null,
            payload.estimatedCost || 0.0,
            payload.advanceDeposit || 0.0,
            payload.promisedDeliveryDate || null,
            session.id,
          ],
        });

        // 2. Insert initial job_inspections record
        await transaction.execute({
          sql: `INSERT INTO job_inspections (
                  id, job_id, inspected_by, power_status, display_status,
                  motherboard_status, body_condition, water_damage_detected,
                  short_circuit_detected, inspection_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            inspectionId,
            jobId,
            session.id,
            payload.powerStatus || 'NORMAL_POWER',
            payload.displayStatus || null,
            payload.motherboardStatus || null,
            payload.bodyCondition || null,
            payload.waterDamageDetected ? 1 : 0,
            payload.shortCircuitDetected ? 1 : 0,
            payload.inspectionNotes ? payload.inspectionNotes.trim() : null,
          ],
        });

        // 3. Insert initial status history record (RECEIVED)
        await transaction.execute({
          sql: `INSERT INTO job_status_history (
                  id, job_id, previous_status, new_status, changed_by, reason_or_notes
                ) VALUES (?, ?, NULL, 'RECEIVED', ?, 'Intake completed at reception counter')`,
          args: [statusHistoryId, jobId, session.id],
        });

        // 4. Insert initial note if provided
        if (payload.initialNote && payload.initialNote.trim()) {
          const noteId = `NOTE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await transaction.execute({
            sql: `INSERT INTO job_notes (id, job_id, user_id, note_type, content)
                  VALUES (?, ?, ?, 'INTERNAL', ?)`,
            args: [noteId, jobId, session.id, payload.initialNote.trim()],
          });
        }

        // Commit DB transaction
        await transaction.commit();
      } catch (txError) {
        await transaction.rollback();
        throw txError;
      }

      // 5. Asynchronously Save Photos to Local Application Storage (Decoupled from Transaction)
      let savedPhotoCount = 0;
      let photoWarning: string | undefined;

      if (payload.photosBase64 && payload.photosBase64.length > 0) {
        try {
          const { photosDir } = ensureDirectories();
          const now = new Date();
          const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const targetDir = path.join(photosDir, monthFolder);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          for (const item of payload.photosBase64) {
            try {
              const base64Clean = item.base64Data.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Clean, 'base64');
              const fileName = `intake_${jobId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}.jpg`;
              const fullFilePath = path.join(targetDir, fileName);
              const relativeStoragePath = path.join('storage', 'photos', monthFolder, fileName);

              fs.writeFileSync(fullFilePath, buffer);

              const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
              await client.execute({
                sql: `INSERT INTO device_photos (id, device_id, job_id, photo_type, file_path, caption)
                      VALUES (?, ?, ?, 'INTAKE_CONDITION', ?, ?)`,
                args: [photoId, payload.deviceId, jobId, relativeStoragePath, item.caption || 'Admission intake photo'],
              });
              savedPhotoCount++;
            } catch (singlePhotoErr) {
              console.warn('[KTech Photo Warning] Failed to write individual photo:', singlePhotoErr);
            }
          }
        } catch (photoErr) {
          photoWarning = `Job was created successfully, but photo storage encountered an issue: ${(photoErr as Error).message}`;
        }
      }

      // Log immutable audit entry
      await logAudit(session.id, 'JOB_CREATED', 'service_jobs', jobId, null, {
        jobNumber,
        customerId: payload.customerId,
        deviceId: payload.deviceId,
        serviceCategory: payload.serviceCategory,
        photosAttached: savedPhotoCount,
      });

      return {
        success: true,
        data: {
          id: jobId,
          jobNumber,
          currentStatus: 'RECEIVED',
          savedPhotoCount,
          warning: photoWarning,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // State Machine Status Transition (e.g. RECEIVED -> WAITING_FOR_INSPECTION -> UNDER_INSPECTION)
  ipcMain.handle('job:updateStatus', async (_event, payload: {
    jobId: string;
    newStatus: string;
    reasonOrNotes?: string;
    assignedTechnicianId?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Authentication required' };
      }

      const client = getClient();

      // Fetch current job status
      const jobRes = await client.execute({
        sql: 'SELECT id, job_number, current_status, assigned_technician_id FROM service_jobs WHERE id = ?',
        args: [payload.jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const currentJob = jobRes.rows[0] as Record<string, unknown>;
      const currentStatus = currentJob.current_status as string;
      const newStatus = payload.newStatus;

      // Validate allowed state transition
      if (!isValidTransition(currentStatus, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from "${currentStatus}" to "${newStatus}". Please follow the approved workflow sequence.`,
        };
      }

      // Guard check role permissions
      if (newStatus === 'UNDER_INSPECTION' || newStatus === 'DIAGNOSIS_COMPLETED') {
        if (!session.permissions.includes('jobs.diagnose') && session.roleId !== 'ROLE_OWNER') {
          return { success: false, error: 'Unauthorized: Technician role or jobs.diagnose permission required' };
        }
      }

      const statusHistoryId = `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const techIdToAssign = (payload.assignedTechnicianId || currentJob.assigned_technician_id || (session.roleId === 'ROLE_TECHNICIAN' ? session.id : null)) as string | null;

      const transaction = await client.transaction('write');
      try {
        // Update service_jobs status & assigned tech
        await transaction.execute({
          sql: `UPDATE service_jobs 
                SET current_status = ?, assigned_technician_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [newStatus, techIdToAssign, payload.jobId],
        });

        // Insert status history entry
        await transaction.execute({
          sql: `INSERT INTO job_status_history (
                  id, job_id, previous_status, new_status, changed_by, reason_or_notes
                ) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            statusHistoryId,
            payload.jobId,
            currentStatus,
            newStatus,
            session.id,
            payload.reasonOrNotes ? payload.reasonOrNotes.trim() : null,
          ],
        });

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      await logAudit(session.id, 'JOB_STATUS_CHANGED', 'service_jobs', payload.jobId, { status: currentStatus }, {
        status: newStatus,
        reason: payload.reasonOrNotes,
      });

      return {
        success: true,
        data: {
          jobId: payload.jobId,
          previousStatus: currentStatus,
          newStatus,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Assign Technician
  ipcMain.handle('job:assignTechnician', async (_event, payload: { jobId: string; technicianId: string }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.intake') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission required to assign technicians' };
      }

      const client = getClient();
      await client.execute({
        sql: `UPDATE service_jobs SET assigned_technician_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [payload.technicianId, payload.jobId],
      });

      await logAudit(session.id, 'TECHNICIAN_ASSIGNED', 'service_jobs', payload.jobId, null, { technicianId: payload.technicianId });

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Job Note
  ipcMain.handle('job:addNote', async (_event, payload: { jobId: string; content: string; noteType?: 'INTERNAL' | 'CUSTOMER_FACING' }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Authentication required' };

      if (!payload.content || !payload.content.trim()) {
        return { success: false, error: 'Note content cannot be blank' };
      }

      const client = getClient();
      const noteId = `NOTE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      await client.execute({
        sql: `INSERT INTO job_notes (id, job_id, user_id, note_type, content)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          noteId,
          payload.jobId,
          session.id,
          payload.noteType || 'INTERNAL',
          payload.content.trim(),
        ],
      });

      return { success: true, data: { noteId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
