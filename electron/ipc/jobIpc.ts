import { ipcMain } from 'electron';
import { getClient, logAudit, ensureDirectories } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';
import type { InValue } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Safely parses JSON array with fallback.
 */
function safeParseJsonArray<T = string>(raw: unknown, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed as T];
  } catch {
    // If it's a comma-separated or plain text string
    const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? (parts as unknown as T[]) : [trimmed as unknown as T];
  }
}

/**
 * Validates allowed state transitions according to docs/WORKFLOW_STATE_MACHINE.md.
 */
export function isValidTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true;

  const allowedTransitions: Record<string, string[]> = {
    RECEIVED: ['WAITING_FOR_INSPECTION', 'UNDER_INSPECTION', 'CANCELLED'],
    WAITING_FOR_INSPECTION: ['UNDER_INSPECTION', 'WAITING_FOR_INSPECTION', 'CANCELLED'],
    UNDER_INSPECTION: [
      'DIAGNOSIS_COMPLETED',
      'UNDER_REPAIR',
      'WAITING_FOR_PARTS',
      'UNREPAIRABLE',
      'WAITING_FOR_INSPECTION',
      'CANCELLED',
    ],
    DIAGNOSIS_COMPLETED: [
      'ESTIMATE_PREPARED',
      'WAITING_FOR_CUSTOMER_APPROVAL',
      'APPROVED',
      'UNDER_REPAIR',
      'WAITING_FOR_PARTS',
      'UNREPAIRABLE',
      'UNDER_INSPECTION',
      'CANCELLED',
    ],
    ESTIMATE_PREPARED: [
      'WAITING_FOR_CUSTOMER_APPROVAL',
      'APPROVED',
      'CUSTOMER_DECLINED',
      'ON_HOLD',
      'CANCELLED',
      'UNDER_REPAIR',
    ],
    WAITING_FOR_CUSTOMER_APPROVAL: [
      'APPROVED',
      'CUSTOMER_DECLINED',
      'ON_HOLD',
      'CANCELLED',
      'UNDER_REPAIR',
    ],
    APPROVED: ['UNDER_REPAIR', 'WAITING_FOR_PARTS', 'CANCELLED'],
    ON_HOLD: [
      'WAITING_FOR_CUSTOMER_APPROVAL',
      'UNDER_INSPECTION',
      'UNDER_REPAIR',
      'CANCELLED',
    ],
    CUSTOMER_DECLINED: ['RETURNED_WITHOUT_REPAIR', 'SALVAGED'],
    UNDER_REPAIR: [
      'WAITING_FOR_PARTS',
      'REPAIR_COMPLETED',
      'QUALITY_CHECK',
      'UNREPAIRABLE',
      'CANCELLED',
    ],
    WAITING_FOR_PARTS: ['UNDER_REPAIR', 'UNREPAIRABLE', 'CANCELLED'],
    REPAIR_COMPLETED: [
      'QUALITY_CHECK',
      'READY_FOR_DELIVERY',
      'UNDER_REPAIR',
      'DELIVERED',
    ],
    QUALITY_CHECK: ['READY_FOR_DELIVERY', 'UNDER_REPAIR', 'REPAIR_COMPLETED'],
    READY_FOR_DELIVERY: ['DELIVERED', 'RETURNED_WITHOUT_REPAIR'],
    UNREPAIRABLE: ['RETURNED_WITHOUT_REPAIR', 'SALVAGED'],
    CANCELLED: ['RETURNED_WITHOUT_REPAIR'],
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
    equipmentType?: string;
    serviceCategory?: string;
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
        if (params.technicianId === 'UNASSIGNED') {
          sqlQuery += ` AND j.assigned_technician_id IS NULL`;
        } else {
          sqlQuery += ` AND j.assigned_technician_id = ?`;
          args.push(params.technicianId);
        }
      }

      if (params.equipmentType && params.equipmentType !== 'ALL') {
        sqlQuery += ` AND d.equipment_type = ?`;
        args.push(params.equipmentType);
      }

      if (params.serviceCategory && params.serviceCategory !== 'ALL') {
        sqlQuery += ` AND j.service_category = ?`;
        args.push(params.serviceCategory);
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
      if (params.priority && params.priority !== 'ALL') {
        countQuery += ` AND j.priority = ?`;
        countArgs.push(params.priority);
      }
      if (params.technicianId) {
        if (params.technicianId === 'UNASSIGNED') {
          countQuery += ` AND j.assigned_technician_id IS NULL`;
        } else {
          countQuery += ` AND j.assigned_technician_id = ?`;
          countArgs.push(params.technicianId);
        }
      }
      if (params.equipmentType && params.equipmentType !== 'ALL') {
        countQuery += ` AND d.equipment_type = ?`;
        countArgs.push(params.equipmentType);
      }
      if (params.serviceCategory && params.serviceCategory !== 'ALL') {
        countQuery += ` AND j.service_category = ?`;
        countArgs.push(params.serviceCategory);
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
            creatorName: (row as Record<string, unknown>).creator_name,
            reportedIssue: (row as Record<string, unknown>).reported_issue,
            accessoriesReceived: safeParseJsonArray((row as Record<string, unknown>).accessories_received),
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

  // Get Technician Dashboard Quick Metrics
  ipcMain.handle('job:getTechnicianMetrics', async () => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized' };
      }

      const client = getClient();
      const techId = session.id;

      const res = await client.execute({
        sql: `
          SELECT
            COUNT(CASE WHEN assigned_technician_id = ? AND current_status NOT IN ('DELIVERED', 'RETURNED_WITHOUT_REPAIR', 'SALVAGED', 'CANCELLED') THEN 1 END) as assigned_to_me,
            COUNT(CASE WHEN current_status = 'WAITING_FOR_INSPECTION' THEN 1 END) as waiting_inspection,
            COUNT(CASE WHEN current_status = 'UNDER_INSPECTION' THEN 1 END) as under_inspection,
            COUNT(CASE WHEN current_status = 'DIAGNOSIS_COMPLETED' THEN 1 END) as diagnosis_completed,
            COUNT(CASE WHEN current_status = 'UNDER_REPAIR' THEN 1 END) as under_repair,
            COUNT(CASE WHEN current_status = 'WAITING_FOR_PARTS' THEN 1 END) as waiting_parts,
            COUNT(CASE WHEN current_status = 'REPAIR_COMPLETED' THEN 1 END) as repair_completed,
            COUNT(CASE WHEN current_status = 'UNREPAIRABLE' THEN 1 END) as unrepairable,
            COUNT(CASE WHEN current_status NOT IN ('DELIVERED', 'RETURNED_WITHOUT_REPAIR', 'SALVAGED', 'CANCELLED') THEN 1 END) as total_active,
            COUNT(CASE WHEN priority IN ('URGENT', 'CRITICAL') AND current_status NOT IN ('DELIVERED', 'RETURNED_WITHOUT_REPAIR', 'SALVAGED', 'CANCELLED') THEN 1 END) as urgent_jobs
          FROM service_jobs;
        `,
        args: [techId],
      });

      const row = res.rows[0] as Record<string, unknown>;

      return {
        success: true,
        data: {
          assignedToMe: Number(row.assigned_to_me || 0),
          waitingInspection: Number(row.waiting_inspection || 0),
          underInspection: Number(row.under_inspection || 0),
          diagnosisCompleted: Number(row.diagnosis_completed || 0),
          underRepair: Number(row.under_repair || 0),
          waitingParts: Number(row.waiting_parts || 0),
          repairCompleted: Number(row.repair_completed || 0),
          unrepairable: Number(row.unrepairable || 0),
          totalActive: Number(row.total_active || 0),
          urgentJobs: Number(row.urgent_jobs || 0),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Comprehensive Job Details by ID or Job Number (Universal Lookup)
  ipcMain.handle('job:getById', async (_event, payload: unknown) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission jobs.read required' };
      }

      let identifier: string | undefined;
      if (typeof payload === 'string') {
        identifier = payload.trim();
      } else if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        identifier = (obj.jobId || obj.id || obj.jobNumber || obj.searchTerm) as string;
        if (typeof identifier === 'string') {
          identifier = identifier.trim();
        }
      }

      if (!identifier) {
        return { success: false, error: 'Invalid lookup parameter: Job identifier is required' };
      }

      const client = getClient();

      // 1. Service Job (case-insensitive lookup by internal ID OR human-readable job_number)
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
        args: [identifier, identifier],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: `Service job record "${identifier}" not found in database` };
      }

      const job = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = job.id as string;

      // 2. Initial / Technical Inspection Record
      const inspectionRes = await client.execute({
        sql: `SELECT i.*, u.full_name as inspector_name
              FROM job_inspections i
              LEFT JOIN users u ON i.inspected_by = u.id
              WHERE i.job_id = ?
              ORDER BY i.created_at DESC
              LIMIT 1`,
        args: [actualJobId],
      });
      const inspection = inspectionRes.rows.length > 0 ? (inspectionRes.rows[0] as Record<string, unknown>) : null;

      // 3. Diagnosis History
      const diagnosisRes = await client.execute({
        sql: `SELECT d.*, u.full_name as technician_name
              FROM job_diagnosis d
              LEFT JOIN users u ON d.technician_id = u.id
              WHERE d.job_id = ?
              ORDER BY d.created_at DESC`,
        args: [actualJobId],
      });

      // 4. Planned Services / Repair Actions (job_services)
      const servicesRes = await client.execute({
        sql: `SELECT * FROM job_services WHERE job_id = ? ORDER BY created_at ASC`,
        args: [actualJobId],
      });

      // 5. Required Parts (job_parts)
      const partsRes = await client.execute({
        sql: `SELECT * FROM job_parts WHERE job_id = ? ORDER BY created_at ASC`,
        args: [actualJobId],
      });

      // 6. Repair Activities Log (job_repair_activities)
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

      // 8. Test Records
      const testRes = await client.execute({
        sql: `SELECT t.*, u.full_name as tester_name
              FROM job_tests t
              LEFT JOIN users u ON t.tested_by = u.id
              WHERE t.job_id = ?
              ORDER BY t.created_at DESC`,
        args: [actualJobId],
      });

      // 9. Technical Attachments
      const attachmentsRes = await client.execute({
        sql: `SELECT * FROM job_attachments WHERE job_id = ? ORDER BY created_at DESC`,
        args: [actualJobId],
      });

      // 10. Status History Timeline
      const statusHistoryRes = await client.execute({
        sql: `SELECT h.*, u.full_name as changed_by_name, u.username as changed_by_username
              FROM job_status_history h
              LEFT JOIN users u ON h.changed_by = u.id
              WHERE h.job_id = ?
              ORDER BY h.created_at ASC`,
        args: [actualJobId],
      });

      // 11. Staff Notes
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

      // Build Consolidated Unified Chronological Timeline Stream
      const timelineEvents: Array<{
        id: string;
        eventType: 'STATUS_CHANGE' | 'INSPECTION' | 'DIAGNOSIS' | 'REPAIR_PLAN' | 'PART_REQUIRED' | 'REPAIR_ACTIVITY' | 'NOTE' | 'ATTACHMENT' | 'TEST';
        title: string;
        description?: string | null;
        authorName: string;
        badgeText?: string | null;
        badgeColor?: string | null;
        metadata?: Record<string, unknown>;
        createdAt: string;
      }> = [];

      // Add status changes
      for (const h of statusHistoryRes.rows) {
        const row = h as Record<string, unknown>;
        timelineEvents.push({
          id: `status-${row.id}`,
          eventType: 'STATUS_CHANGE',
          title: row.previous_status ? `Status changed to ${row.new_status}` : `Job admitted as ${row.new_status}`,
          description: (row.reason_or_notes as string) || undefined,
          authorName: (row.changed_by_name as string) || 'System',
          badgeText: (row.new_status as string),
          badgeColor: 'var(--brand-primary)',
          createdAt: (row.created_at as string) || new Date().toISOString(),
        });
      }

      // Add diagnoses
      for (const d of diagnosisRes.rows) {
        const row = d as Record<string, unknown>;
        timelineEvents.push({
          id: `diag-${row.id}`,
          eventType: 'DIAGNOSIS',
          title: `Technical Diagnosis Logged`,
          description: (row.root_cause_analysis as string),
          authorName: (row.technician_name as string) || 'Technician',
          badgeText: 'DIAGNOSIS',
          badgeColor: 'var(--color-warning)',
          metadata: {
            faultyComponents: row.faulty_components_identified,
            recommendedAction: row.recommended_action,
          },
          createdAt: (row.created_at as string) || new Date().toISOString(),
        });
      }

      // Add repair activities
      for (const a of activitiesRes.rows) {
        const row = a as Record<string, unknown>;
        timelineEvents.push({
          id: `act-${row.id}`,
          eventType: 'REPAIR_ACTIVITY',
          title: (row.activity_title as string),
          description: (row.description as string),
          authorName: (row.technician_name as string) || 'Technician',
          badgeText: row.time_spent_minutes ? `${row.time_spent_minutes}m` : 'REPAIR WORK',
          badgeColor: 'var(--color-success)',
          createdAt: (row.created_at as string) || new Date().toISOString(),
        });
      }

      // Add parts required
      for (const p of partsRes.rows) {
        const row = p as Record<string, unknown>;
        timelineEvents.push({
          id: `part-${row.id}`,
          eventType: 'PART_REQUIRED',
          title: `Part Required: ${row.part_name} (Qty: ${row.quantity})`,
          description: row.serial_number ? `SN: ${row.serial_number}` : undefined,
          authorName: 'Technician',
          badgeText: 'PART LOGGED',
          badgeColor: 'var(--color-info)',
          createdAt: (row.created_at as string) || new Date().toISOString(),
        });
      }

      // Add notes
      for (const n of notesRes.rows) {
        const row = n as Record<string, unknown>;
        timelineEvents.push({
          id: `note-${row.id}`,
          eventType: 'NOTE',
          title: `${row.note_type === 'CUSTOMER_FACING' ? 'Customer Communication Note' : 'Internal Staff Note'}`,
          description: (row.content as string),
          authorName: (row.author_name as string) || 'Staff',
          badgeText: (row.note_type as string),
          badgeColor: row.note_type === 'CUSTOMER_FACING' ? 'var(--color-info)' : 'var(--text-dim)',
          createdAt: ((row.created_at || row.createdAt) as string) || new Date().toISOString(),
        });
      }

      // Sort timeline events chronologically (most recent first for stream view)
      timelineEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
            accessoriesReceived: safeParseJsonArray(job.accessories_received),
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
          diagnoses: diagnosisRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            technicianId: (row as Record<string, unknown>).technician_id,
            technicianName: (row as Record<string, unknown>).technician_name,
            rootCauseAnalysis: (row as Record<string, unknown>).root_cause_analysis,
            voltageRailsChecked: (row as Record<string, unknown>).voltage_rails_checked,
            faultyComponentsIdentified: (row as Record<string, unknown>).faulty_components_identified,
            recommendedAction: (row as Record<string, unknown>).recommended_action,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          repairPlans: servicesRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            serviceName: (row as Record<string, unknown>).service_name,
            sacCode: (row as Record<string, unknown>).sac_code,
            laborCharge: Number((row as Record<string, unknown>).labor_charge || 0),
            discount: Number((row as Record<string, unknown>).discount || 0),
            taxRate: Number((row as Record<string, unknown>).tax_rate || 18),
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          requiredParts: partsRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            inventoryItemId: (row as Record<string, unknown>).inventory_item_id,
            partName: (row as Record<string, unknown>).part_name,
            serialNumber: (row as Record<string, unknown>).serial_number,
            quantity: Number((row as Record<string, unknown>).quantity || 1),
            unitCostPrice: Number((row as Record<string, unknown>).unit_cost_price || 0),
            unitSellingPrice: Number((row as Record<string, unknown>).unit_selling_price || 0),
            hsnCode: (row as Record<string, unknown>).hsn_code,
            taxRate: Number((row as Record<string, unknown>).tax_rate || 18),
            warrantyMonths: Number((row as Record<string, unknown>).warranty_months || 0),
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          repairActivities: activitiesRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            technicianId: (row as Record<string, unknown>).technician_id,
            technicianName: (row as Record<string, unknown>).technician_name,
            activityTitle: (row as Record<string, unknown>).activity_title,
            description: (row as Record<string, unknown>).description,
            timeSpentMinutes: Number((row as Record<string, unknown>).time_spent_minutes || 0),
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          attachments: attachmentsRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            fileName: (row as Record<string, unknown>).file_name,
            filePath: (row as Record<string, unknown>).file_path,
            fileType: (row as Record<string, unknown>).file_type,
            fileSizeBytes: Number((row as Record<string, unknown>).file_size_bytes || 0),
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          checklists: checklistRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            checklistItemName: (row as Record<string, unknown>).checklist_item_name,
            isChecked: Boolean((row as Record<string, unknown>).is_checked),
            checkedBy: (row as Record<string, unknown>).checked_by,
            checkedByName: (row as Record<string, unknown>).checked_by_name,
            checkedAt: (row as Record<string, unknown>).checked_at,
          })),
          tests: testRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobId: (row as Record<string, unknown>).job_id,
            testedBy: (row as Record<string, unknown>).tested_by,
            testerName: (row as Record<string, unknown>).tester_name,
            testType: (row as Record<string, unknown>).test_type,
            result: (row as Record<string, unknown>).result,
            notes: (row as Record<string, unknown>).notes,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          timeline: timelineEvents,
          statusHistory: statusHistoryRes.rows.map((row) => ({
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
            createdAt: ((row as Record<string, unknown>).created_at || (row as Record<string, unknown>).createdAt || new Date().toISOString()) as string,
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
    accessoriesReceived?: string[];
    physicalConditionNotes?: string;
    estimatedCost?: number;
    advanceDeposit?: number;
    promisedDeliveryDate?: string;
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
      if (!session || (!session.permissions.includes('jobs.create') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission jobs.create required' };
      }

      if (!payload.customerId || !payload.deviceId || !payload.reportedIssue?.trim()) {
        return { success: false, error: 'Customer, Device, and Reported Issue are required' };
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

        // 3. Insert initial status history
        await transaction.execute({
          sql: `INSERT INTO job_status_history (
                  id, job_id, previous_status, new_status, changed_by, reason_or_notes
                ) VALUES (?, ?, NULL, 'RECEIVED', ?, 'Equipment intake admitted at service desk')`,
          args: [statusHistoryId, jobId, session.id],
        });

        // 4. If initial note provided, insert into job_notes
        if (payload.initialNote && payload.initialNote.trim()) {
          await transaction.execute({
            sql: `INSERT INTO job_notes (id, job_id, user_id, note_type, content)
                  VALUES (?, ?, ?, 'INTERNAL', ?)`,
            args: [
              `JN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              jobId,
              session.id,
              payload.initialNote.trim(),
            ],
          });
        }

        await transaction.commit();
      } catch (txError) {
        await transaction.rollback();
        throw txError;
      }

      // 5. Decoupled Photo Storage (outside DB transaction for disk failure resilience)
      let savedPhotoCount = 0;
      let photoWarning: string | undefined;

      if (payload.photosBase64 && payload.photosBase64.length > 0) {
        try {
          const { photosDir } = ensureDirectories();
          const monthFolder = new Date().toISOString().substring(0, 7); // YYYY-MM
          const targetDir = path.join(photosDir, monthFolder);

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          for (const item of payload.photosBase64) {
            const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            const fileName = `${photoId}.jpg`;
            const filePath = path.join(targetDir, fileName);

            // Clean and write base64 buffer
            const base64Data = item.base64Data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);

            // Insert reference in device_photos
            await client.execute({
              sql: `INSERT INTO device_photos (id, device_id, job_id, photo_type, file_path, caption)
                    VALUES (?, ?, ?, 'INTAKE_CONDITION', ?, ?)`,
              args: [photoId, payload.deviceId, jobId, filePath, item.caption || 'Admission Photo'],
            });

            savedPhotoCount++;
          }
        } catch (photoErr) {
          console.warn('[PhotoStorage] Non-fatal error writing photos to disk:', photoErr);
          photoWarning = 'Job created successfully, but photo files could not be saved to disk.';
        }
      }

      await logAudit(
        session.id,
        'JOB_CREATE',
        'service_jobs',
        jobId,
        null,
        { jobNumber, customerId: payload.customerId, deviceId: payload.deviceId, priority: payload.priority }
      );

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

  // Assign or Reassign Technician
  ipcMain.handle('job:assignTechnician', async (_event, { jobId, technicianId }: { jobId: string; technicianId: string }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Unauthorized: Session required' };
      }

      // Check permissions: Owner, Reception, jobs.assign, or a technician claiming an unassigned job
      const isOwnerOrReception = session.roleId === 'ROLE_OWNER' || session.roleId === 'ROLE_RECEPTION';
      const hasAssignPerm = session.permissions.includes('jobs.assign');
      const isSelfClaim = session.roleId === 'ROLE_TECHNICIAN' && session.id === technicianId;

      if (!isOwnerOrReception && !hasAssignPerm && !isSelfClaim) {
        return { success: false, error: 'Unauthorized: Permission jobs.assign or self-assignment required' };
      }

      const client = getClient();
      const currentRes = await client.execute({
        sql: `SELECT id, job_number, assigned_technician_id, current_status FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [jobId, jobId],
      });

      if (currentRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const currentJob = currentRes.rows[0] as Record<string, unknown>;
      const actualJobId = currentJob.id as string;
      const previousTechId = currentJob.assigned_technician_id as string | null;

      // Update technician
      await client.execute({
        sql: `UPDATE service_jobs SET assigned_technician_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [technicianId || null, actualJobId],
      });

      // Get technician name for history
      let techName = 'Unassigned';
      if (technicianId) {
        const uRes = await client.execute({ sql: `SELECT full_name FROM users WHERE id = ?`, args: [technicianId] });
        if (uRes.rows.length > 0) {
          techName = (uRes.rows[0] as Record<string, unknown>).full_name as string;
        }
      }

      // Record in status history / assignment timeline
      const statusHistoryId = `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          statusHistoryId,
          actualJobId,
          (currentJob.current_status as string),
          (currentJob.current_status as string),
          session.id,
          `Assigned to technician: ${techName}`,
        ],
      });

      await logAudit(
        session.id,
        'JOB_ASSIGN_TECH',
        'service_jobs',
        actualJobId,
        { previousTechnicianId: previousTechId },
        { assignedTechnicianId: technicianId, technicianName: techName }
      );

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Save Technical Inspection & Measurement Findings
  ipcMain.handle('job:saveTechnicalInspection', async (_event, payload: {
    jobId: string;
    powerStatus: string;
    displayStatus?: string;
    motherboardStatus?: string;
    bodyCondition?: string;
    waterDamageDetected?: boolean;
    shortCircuitDetected?: boolean;
    inspectionNotes?: string;
    checklistItems?: Array<{ name: string; isChecked: boolean }>;
    transitionToUnderInspection?: boolean;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.diagnose') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.diagnose or technician role required' };
      }

      const client = getClient();
      const jobRes = await client.execute({
        sql: `SELECT id, current_status, assigned_technician_id FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [payload.jobId, payload.jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const job = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = job.id as string;
      const currentStatus = job.current_status as string;
      const inspectionId = `INSP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const transaction = await client.transaction('write');

      try {
        // 1. Insert new technical inspection record
        await transaction.execute({
          sql: `INSERT INTO job_inspections (
                  id, job_id, inspected_by, power_status, display_status,
                  motherboard_status, body_condition, water_damage_detected,
                  short_circuit_detected, inspection_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            inspectionId,
            actualJobId,
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

        // 2. Insert checklist items if provided
        if (payload.checklistItems && payload.checklistItems.length > 0) {
          for (const item of payload.checklistItems) {
            const chkId = `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await transaction.execute({
              sql: `INSERT INTO job_checklists (id, job_id, checklist_item_name, is_checked, checked_by, checked_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              args: [chkId, actualJobId, item.name, item.isChecked ? 1 : 0, session.id],
            });
          }
        }

        // 3. Optionally transition status to UNDER_INSPECTION
        if (payload.transitionToUnderInspection && (currentStatus === 'RECEIVED' || currentStatus === 'WAITING_FOR_INSPECTION')) {
          await transaction.execute({
            sql: `UPDATE service_jobs SET current_status = 'UNDER_INSPECTION', assigned_technician_id = COALESCE(assigned_technician_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            args: [session.id, actualJobId],
          });

          await transaction.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, ?, 'UNDER_INSPECTION', ?, 'Technician initiated technical diagnostic inspection')`,
            args: [`JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, actualJobId, currentStatus, session.id],
          });
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      await logAudit(
        session.id,
        'JOB_INSPECTION_SAVE',
        'job_inspections',
        inspectionId,
        null,
        { jobId: actualJobId, powerStatus: payload.powerStatus, notes: payload.inspectionNotes }
      );

      return { success: true, data: { inspectionId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Save Technical Diagnosis & Root Cause Analysis
  ipcMain.handle('job:saveDiagnosis', async (_event, payload: {
    jobId: string;
    rootCauseAnalysis: string;
    faultCategory?: string;
    faultyComponentsIdentified?: string;
    voltageRailsChecked?: string;
    recommendedAction?: string;
    diagnosticOutcome?: string; // 'FAULT_IDENTIFIED' | 'NEEDS_FURTHER_INSPECTION' | 'INTERMITTENT_FAULT' | 'NO_FAULT_FOUND' | 'UNREPAIRABLE'
    transitionStatus?: boolean;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.diagnose') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.diagnose or technician role required' };
      }

      if (!payload.rootCauseAnalysis?.trim()) {
        return { success: false, error: 'Root cause analysis is required for diagnosis' };
      }

      const client = getClient();
      const jobRes = await client.execute({
        sql: `SELECT id, current_status, assigned_technician_id FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [payload.jobId, payload.jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const job = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = job.id as string;
      const currentStatus = job.current_status as string;
      const diagnosisId = `DIAG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let targetStatus = currentStatus;
      if (payload.diagnosticOutcome === 'UNREPAIRABLE') {
        targetStatus = 'UNREPAIRABLE';
      } else if (payload.transitionStatus !== false && (currentStatus === 'UNDER_INSPECTION' || currentStatus === 'WAITING_FOR_INSPECTION')) {
        targetStatus = 'DIAGNOSIS_COMPLETED';
      }

      const transaction = await client.transaction('write');

      try {
        // 1. Insert job_diagnosis record
        await transaction.execute({
          sql: `INSERT INTO job_diagnosis (
                  id, job_id, technician_id, root_cause_analysis,
                  voltage_rails_checked, faulty_components_identified, recommended_action
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            diagnosisId,
            actualJobId,
            session.id,
            payload.rootCauseAnalysis.trim(),
            payload.voltageRailsChecked ? payload.voltageRailsChecked.trim() : null,
            payload.faultyComponentsIdentified ? payload.faultyComponentsIdentified.trim() : null,
            payload.recommendedAction ? payload.recommendedAction.trim() : null,
          ],
        });

        // 2. If status is changing, update service_jobs and status history
        if (targetStatus !== currentStatus) {
          await transaction.execute({
            sql: `UPDATE service_jobs 
                  SET current_status = ?, assigned_technician_id = COALESCE(assigned_technician_id, ?), updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [targetStatus, session.id, actualJobId],
          });

          await transaction.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              actualJobId,
              currentStatus,
              targetStatus,
              session.id,
              payload.diagnosticOutcome === 'UNREPAIRABLE'
                ? `Diagnosis concluded device is UNREPAIRABLE: ${payload.rootCauseAnalysis.trim()}`
                : `Technical diagnosis completed: ${payload.rootCauseAnalysis.trim()}`,
            ],
          });
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      await logAudit(
        session.id,
        'JOB_DIAGNOSIS_SAVE',
        'job_diagnosis',
        diagnosisId,
        null,
        { jobId: actualJobId, outcome: payload.diagnosticOutcome, newStatus: targetStatus }
      );

      return { success: true, data: { diagnosisId, newStatus: targetStatus } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Repair Plan Action (job_services)
  ipcMain.handle('job:addRepairPlanAction', async (_event, payload: {
    jobId: string;
    serviceName: string;
    sacCode?: string;
    laborCharge?: number;
    discount?: number;
    taxRate?: number;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.repair or technician role required' };
      }

      if (!payload.serviceName?.trim()) {
        return { success: false, error: 'Service/action description is required' };
      }

      const client = getClient();
      const serviceId = `JSVC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Resolve actual jobId
      const jobRes = await client.execute({ sql: `SELECT id FROM service_jobs WHERE id = ? OR job_number = ?`, args: [payload.jobId, payload.jobId] });
      const actualJobId = jobRes.rows.length > 0 ? (jobRes.rows[0] as Record<string, unknown>).id as string : payload.jobId;

      await client.execute({
        sql: `INSERT INTO job_services (id, job_id, service_name, sac_code, labor_charge, discount, tax_rate)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          serviceId,
          actualJobId,
          payload.serviceName.trim(),
          payload.sacCode || '998713',
          payload.laborCharge || 0.0,
          payload.discount || 0.0,
          payload.taxRate || 18.0,
        ],
      });

      await logAudit(
        session.id,
        'JOB_REPAIR_PLAN_ADD',
        'job_services',
        serviceId,
        null,
        { jobId: actualJobId, action: payload.serviceName }
      );

      return { success: true, data: { serviceId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete Repair Plan Action
  ipcMain.handle('job:deleteRepairPlanAction', async (_event, { serviceId }: { serviceId: string }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized' };
      }

      const client = getClient();
      await client.execute({ sql: `DELETE FROM job_services WHERE id = ?`, args: [serviceId] });
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Required Part / Component (job_parts)
  ipcMain.handle('job:addRequiredPart', async (_event, payload: {
    jobId: string;
    partName: string;
    serialNumber?: string;
    quantity?: number;
    unitCostPrice?: number;
    unitSellingPrice?: number;
    hsnCode?: string;
    taxRate?: number;
    warrantyMonths?: number;
    reasonOrNotes?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.repair or technician role required' };
      }

      if (!payload.partName?.trim()) {
        return { success: false, error: 'Part name is required' };
      }

      const client = getClient();
      const partId = `JPART-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Resolve actual jobId
      const jobRes = await client.execute({ sql: `SELECT id FROM service_jobs WHERE id = ? OR job_number = ?`, args: [payload.jobId, payload.jobId] });
      const actualJobId = jobRes.rows.length > 0 ? (jobRes.rows[0] as Record<string, unknown>).id as string : payload.jobId;

      await client.execute({
        sql: `INSERT INTO job_parts (
                id, job_id, part_name, serial_number, quantity,
                unit_cost_price, unit_selling_price, hsn_code, tax_rate, warranty_months
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          partId,
          actualJobId,
          payload.partName.trim(),
          payload.serialNumber ? payload.serialNumber.trim() : null,
          payload.quantity || 1,
          payload.unitCostPrice || 0.0,
          payload.unitSellingPrice || 0.0,
          payload.hsnCode || '847330',
          payload.taxRate || 18.0,
          payload.warrantyMonths || 0,
        ],
      });

      await logAudit(
        session.id,
        'JOB_REQUIRED_PART_ADD',
        'job_parts',
        partId,
        null,
        { jobId: actualJobId, part: payload.partName, qty: payload.quantity }
      );

      return { success: true, data: { partId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete Required Part
  ipcMain.handle('job:deleteRequiredPart', async (_event, { partId }: { partId: string }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized' };
      }

      const client = getClient();
      await client.execute({ sql: `DELETE FROM job_parts WHERE id = ?`, args: [partId] });
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Repair Activity Log (job_repair_activities)
  ipcMain.handle('job:addRepairActivity', async (_event, payload: {
    jobId: string;
    activityTitle: string;
    description?: string;
    timeSpentMinutes?: number;
    transitionToUnderRepair?: boolean;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.repair or technician role required' };
      }

      if (!payload.activityTitle?.trim()) {
        return { success: false, error: 'Activity title/summary is required' };
      }

      const client = getClient();
      const activityId = `JACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const jobRes = await client.execute({
        sql: `SELECT id, current_status FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [payload.jobId, payload.jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job not found' };
      }

      const jobRow = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = jobRow.id as string;
      const currentStatus = jobRow.current_status as string;

      const transaction = await client.transaction('write');

      try {
        // 1. Insert repair activity
        await transaction.execute({
          sql: `INSERT INTO job_repair_activities (id, job_id, technician_id, activity_title, description, time_spent_minutes)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            activityId,
            actualJobId,
            session.id,
            payload.activityTitle.trim(),
            payload.description ? payload.description.trim() : null,
            payload.timeSpentMinutes || 0,
          ],
        });

        // 2. If transition to UNDER_REPAIR requested and valid
        if (payload.transitionToUnderRepair && (currentStatus === 'DIAGNOSIS_COMPLETED' || currentStatus === 'APPROVED' || currentStatus === 'WAITING_FOR_PARTS')) {
          await transaction.execute({
            sql: `UPDATE service_jobs SET current_status = 'UNDER_REPAIR', assigned_technician_id = COALESCE(assigned_technician_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            args: [session.id, actualJobId],
          });

          await transaction.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, ?, 'UNDER_REPAIR', ?, ?)`,
            args: [
              `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              actualJobId,
              currentStatus,
              session.id,
              `Repair work commenced: ${payload.activityTitle.trim()}`,
            ],
          });
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      await logAudit(
        session.id,
        'JOB_ACTIVITY_ADD',
        'job_repair_activities',
        activityId,
        null,
        { jobId: actualJobId, title: payload.activityTitle }
      );

      return { success: true, data: { activityId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Technical Attachment / Microscope Photo
  ipcMain.handle('job:addTechnicalAttachment', async (_event, payload: {
    jobId: string;
    fileName: string;
    fileType?: string;
    base64Data: string;
    caption?: string;
    isPhoto?: boolean;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && !session.permissions.includes('jobs.diagnose') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Technician role required' };
      }

      const client = getClient();
      const attachmentId = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { attachmentsDir, photosDir } = ensureDirectories();

      // Resolve actual jobId
      const jobRes = await client.execute({ sql: `SELECT id, device_id FROM service_jobs WHERE id = ? OR job_number = ?`, args: [payload.jobId, payload.jobId] });
      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }
      const jobRow = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = jobRow.id as string;
      const deviceId = (jobRow.device_id as string) || 'DEV-UNKNOWN';

      const monthFolder = new Date().toISOString().substring(0, 7);
      const targetDir = payload.isPhoto ? path.join(photosDir, monthFolder) : path.join(attachmentsDir, monthFolder);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const cleanName = payload.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFileName = `${attachmentId}-${cleanName}`;
      const filePath = path.join(targetDir, diskFileName);

      // Write physical file
      const rawData = payload.base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(rawData, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Save metadata in SQLite
      if (payload.isPhoto) {
        await client.execute({
          sql: `INSERT INTO device_photos (id, device_id, job_id, photo_type, file_path, caption)
                VALUES (?, ?, ?, 'DAMAGE_PROOF', ?, ?)`,
          args: [attachmentId, deviceId, actualJobId, filePath, payload.caption || payload.fileName],
        });
      } else {
        await client.execute({
          sql: `INSERT INTO job_attachments (id, job_id, file_name, file_path, file_type, file_size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [attachmentId, actualJobId, payload.fileName, filePath, payload.fileType || 'application/octet-stream', buffer.length],
        });
      }

      await logAudit(
        session.id,
        'JOB_ATTACHMENT_ADD',
        'job_attachments',
        attachmentId,
        null,
        { jobId: actualJobId, fileName: payload.fileName }
      );

      return { success: true, data: { attachmentId, filePath } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Complete Repair Workflow
  ipcMain.handle('job:completeRepair', async (_event, payload: {
    jobId: string;
    summaryNotes: string;
    testingNotes?: string;
    recommendations?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.repair or technician role required' };
      }

      const client = getClient();
      const jobRes = await client.execute({
        sql: `SELECT id, current_status FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [payload.jobId, payload.jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const jobRow = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = jobRow.id as string;
      const currentStatus = jobRow.current_status as string;
      const targetStatus = 'REPAIR_COMPLETED';

      if (!isValidTransition(currentStatus, targetStatus)) {
        return { success: false, error: `Invalid state transition: Cannot move from ${currentStatus} to ${targetStatus}` };
      }

      const transaction = await client.transaction('write');

      try {
        // 1. Update status
        await transaction.execute({
          sql: `UPDATE service_jobs SET current_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [targetStatus, actualJobId],
        });

        // 2. Insert completion activity
        await transaction.execute({
          sql: `INSERT INTO job_repair_activities (id, job_id, technician_id, activity_title, description)
                VALUES (?, ?, ?, 'Repair Completed & Bench Tested', ?)`,
          args: [
            `JACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            actualJobId,
            session.id,
            payload.summaryNotes || 'All planned repairs and hardware replacements completed.',
          ],
        });

        // 3. Insert status history
        await transaction.execute({
          sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            actualJobId,
            currentStatus,
            targetStatus,
            session.id,
            `Repair completed: ${payload.summaryNotes || 'Technical work finished'}`,
          ],
        });

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      await logAudit(
        session.id,
        'JOB_REPAIR_COMPLETE',
        'service_jobs',
        actualJobId,
        { previousStatus: currentStatus },
        { newStatus: targetStatus }
      );

      return { success: true, data: { jobId: actualJobId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Mark Unrepairable
  ipcMain.handle('job:markUnrepairable', async (_event, payload: {
    jobId: string;
    rootCause: string;
    technicalJustification: string;
    note?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('jobs.diagnose') && !session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN')) {
        return { success: false, error: 'Unauthorized: Permission jobs.diagnose required' };
      }

      if (!payload.technicalJustification?.trim()) {
        return { success: false, error: 'Technical justification is required to mark equipment as unrepairable' };
      }

      const client = getClient();
      const jobRes = await client.execute({
        sql: `SELECT id, current_status FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [payload.jobId, payload.jobId],
      });

      if (jobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const jobRow = jobRes.rows[0] as Record<string, unknown>;
      const actualJobId = jobRow.id as string;
      const currentStatus = jobRow.current_status as string;
      const targetStatus = 'UNREPAIRABLE';

      if (!isValidTransition(currentStatus, targetStatus)) {
        return { success: false, error: `Invalid transition from ${currentStatus} to ${targetStatus}` };
      }

      const transaction = await client.transaction('write');

      try {
        // 1. Update status
        await transaction.execute({
          sql: `UPDATE service_jobs SET current_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [targetStatus, actualJobId],
        });

        // 2. Insert diagnosis record
        await transaction.execute({
          sql: `INSERT INTO job_diagnosis (id, job_id, technician_id, root_cause_analysis, recommended_action)
                VALUES (?, ?, ?, ?, 'Device deemed unrepairable due to fatal damage')`,
          args: [
            `DIAG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            actualJobId,
            session.id,
            `UNREPAIRABLE: ${payload.rootCause || ''} - ${payload.technicalJustification.trim()}`,
          ],
        });

        // 3. Insert status history
        await transaction.execute({
          sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            `JSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            actualJobId,
            currentStatus,
            targetStatus,
            session.id,
            `Marked UNREPAIRABLE: ${payload.technicalJustification.trim()}`,
          ],
        });

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }

      await logAudit(
        session.id,
        'JOB_MARK_UNREPAIRABLE',
        'service_jobs',
        actualJobId,
        { previousStatus: currentStatus },
        { justification: payload.technicalJustification }
      );

      return { success: true, data: { jobId: actualJobId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Update Status Transition with Strict State Machine Validation
  ipcMain.handle('job:updateStatus', async (_event, payload: {
    jobId: string;
    newStatus: string;
    reasonOrNotes?: string;
    assignedTechnicianId?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Unauthorized: Active session required' };
      }

      const client = getClient();
      const currentJobRes = await client.execute({
        sql: `SELECT id, current_status, assigned_technician_id FROM service_jobs WHERE id = ? OR job_number = ?`,
        args: [payload.jobId, payload.jobId],
      });

      if (currentJobRes.rows.length === 0) {
        return { success: false, error: 'Service job record not found' };
      }

      const currentJob = currentJobRes.rows[0] as Record<string, unknown>;
      const actualJobId = currentJob.id as string;
      const currentStatus = currentJob.current_status as string;
      const newStatus = payload.newStatus;

      // Validate state machine transition
      if (!isValidTransition(currentStatus, newStatus)) {
        return {
          success: false,
          error: `Invalid State Transition: Cannot transition service job from "${currentStatus}" to "${newStatus}" according to KTech workflow rules.`,
        };
      }

      // Role permission check for technician actions
      if (newStatus === 'UNDER_INSPECTION' || newStatus === 'DIAGNOSIS_COMPLETED' || newStatus === 'UNDER_REPAIR' || newStatus === 'REPAIR_COMPLETED') {
        if (!session.permissions.includes('jobs.diagnose') && !session.permissions.includes('jobs.repair') && session.roleId !== 'ROLE_OWNER' && session.roleId !== 'ROLE_TECHNICIAN') {
          return { success: false, error: 'Unauthorized: Technician role or jobs permission required' };
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
          args: [newStatus, techIdToAssign, actualJobId],
        });

        // Insert status history entry
        await transaction.execute({
          sql: `INSERT INTO job_status_history (
                  id, job_id, previous_status, new_status, changed_by, reason_or_notes
                ) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            statusHistoryId,
            actualJobId,
            currentStatus,
            newStatus,
            session.id,
            payload.reasonOrNotes ? payload.reasonOrNotes.trim() : null,
          ],
        });

        await transaction.commit();
      } catch (txErr) {
        await transaction.rollback();
        throw txErr;
      }

      await logAudit(
        session.id,
        'JOB_STATUS_CHANGE',
        'service_jobs',
        actualJobId,
        { previousStatus: currentStatus },
        { newStatus, reason: payload.reasonOrNotes }
      );

      return {
        success: true,
        data: {
          jobId: actualJobId,
          previousStatus: currentStatus,
          newStatus,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Staff Note
  ipcMain.handle('job:addNote', async (_event, payload: {
    jobId: string;
    content: string;
    noteType?: 'INTERNAL' | 'CUSTOMER_FACING';
  }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Unauthorized: Active session required' };
      }

      if (!payload.content?.trim()) {
        return { success: false, error: 'Note content cannot be empty' };
      }

      const client = getClient();
      const noteId = `JN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Resolve actual jobId
      const jobRes = await client.execute({ sql: `SELECT id FROM service_jobs WHERE id = ? OR job_number = ?`, args: [payload.jobId, payload.jobId] });
      const actualJobId = jobRes.rows.length > 0 ? (jobRes.rows[0] as Record<string, unknown>).id as string : payload.jobId;

      await client.execute({
        sql: `INSERT INTO job_notes (id, job_id, user_id, note_type, content)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          noteId,
          actualJobId,
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
