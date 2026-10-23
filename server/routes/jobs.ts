import { Router, Request, Response } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  jobInspectionSchema,
  jobDiagnosisSchema,
} from '../validation/schemas.ts';

export const jobsRouter = Router();

jobsRouter.use(authenticateToken);

/**
 * Validates allowed state transitions according to docs/WORKFLOW_STATE_MACHINE.md.
 */
export function isValidTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true;

  const allowedTransitions: Record<string, string[]> = {
    RECEIVED: ['WAITING_FOR_INSPECTION', 'UNDER_INSPECTION', 'CANCELLED'],
    WAITING_FOR_INSPECTION: ['UNDER_INSPECTION', 'CANCELLED'],
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
 * Generates an atomic sequential Job Number scoped to current shop: JOB-YYYY-XXXXX
 */
async function generateJobNumber(shopId: string): Promise<string> {
  const client = getClient();
  const year = new Date().getFullYear();
  const counterKey = `sequence.job_counter_${year}`;

  await client.execute({
    sql: `INSERT OR IGNORE INTO shop_settings (shop_id, key, value, category) VALUES (?, ?, '0', 'SEQUENCE')`,
    args: [shopId, counterKey],
  });

  const seqRes = await client.execute({
    sql: `UPDATE shop_settings 
          SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = CURRENT_TIMESTAMP
          WHERE shop_id = ? AND key = ?
          RETURNING value;`,
    args: [shopId, counterKey],
  });

  const nextVal = seqRes.rows.length > 0 ? Number((seqRes.rows[0] as Record<string, unknown>).value) : 1;
  return `JOB-${year}-${String(nextVal).padStart(5, '0')}`;
}

// Generate Job Number Preview
jobsRouter.get('/generate-number', async (req, res) => {
  try {
    const jobNumber = await generateJobNumber(req.user!.shopId);
    res.json({ success: true, data: { jobNumber } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// List Jobs (with filtering, pagination, search)
jobsRouter.get('/', async (req, res) => {
  try {
    const client = getClient();
    const shopId = req.user!.shopId;
    const { status, technicianId, search, priority, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        j.*,
        c.full_name as customer_name,
        c.primary_phone as customer_phone,
        d.equipment_type,
        d.brand as device_brand,
        d.model_name as device_model,
        d.serial_number as device_serial,
        u.full_name as technician_name
      FROM service_jobs j
      JOIN customers c ON j.customer_id = c.id
      JOIN devices d ON j.device_id = d.id
      LEFT JOIN users u ON j.assigned_technician_id = u.id
      WHERE j.shop_id = ?
    `;

    const args: (string | number)[] = [shopId];

    if (status && status !== 'ALL') {
      query += ` AND j.current_status = ?`;
      args.push(String(status));
    }

    if (technicianId) {
      query += ` AND j.assigned_technician_id = ?`;
      args.push(String(technicianId));
    }

    if (priority && priority !== 'ALL') {
      query += ` AND j.priority = ?`;
      args.push(String(priority));
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (j.job_number LIKE ? OR c.full_name LIKE ? OR c.primary_phone LIKE ? OR d.serial_number LIKE ? OR d.model_name LIKE ?)`;
      args.push(q, q, q, q, q);
    }

    query += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`;
    args.push(Number(limit), Number(offset));

    const result = await client.execute({ sql: query, args });

    res.json({
      success: true,
      data: result.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id,
          jobNumber: row.job_number,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          deviceId: row.device_id,
          equipmentType: row.equipment_type,
          deviceBrand: row.device_brand,
          deviceModel: row.device_model,
          deviceSerial: row.device_serial,
          serviceCategory: row.service_category,
          currentStatus: row.current_status,
          priority: row.priority,
          assignedTechnicianId: row.assigned_technician_id,
          assignedTechnicianName: row.technician_name || 'Unassigned',
          reportedIssue: row.reported_issue,
          accessoriesReceived: row.accessories_received ? JSON.parse(String(row.accessories_received)) : [],
          physicalConditionNotes: row.physical_condition_notes,
          estimatedCost: Number(row.estimated_cost || 0),
          advanceDeposit: Number(row.advance_deposit || 0),
          promisedDeliveryDate: row.promised_delivery_date,
          actualDeliveryDate: row.actual_delivery_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create New Service Job
jobsRouter.post('/', validateBody(createJobSchema), async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const {
      customerId,
      deviceId,
      serviceCategory,
      priority = 'NORMAL',
      assignedTechnicianId,
      reportedIssue,
      accessoriesReceived = [],
      physicalConditionNotes,
      estimatedCost = 0.0,
      advanceDeposit = 0.0,
      promisedDeliveryDate,
    } = req.body;

    // Verify customer belongs to current tenant shop
    const custRes = await client.execute({
      sql: `SELECT id FROM customers WHERE id = ? AND shop_id = ?`,
      args: [customerId, shopId],
    });
    if (custRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found in current shop organization.' });
      return;
    }

    // Verify device belongs to customer in current tenant shop
    const devRes = await client.execute({
      sql: `SELECT id FROM devices WHERE id = ? AND customer_id = ? AND shop_id = ?`,
      args: [deviceId, customerId, shopId],
    });
    if (devRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Device not found for specified customer in current shop.' });
      return;
    }

    const jobNumber = await generateJobNumber(shopId);
    const jobId = `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await client.execute({
      sql: `INSERT INTO service_jobs (
              id, shop_id, job_number, customer_id, device_id, service_category,
              current_status, priority, assigned_technician_id, reported_issue,
              accessories_received, physical_condition_notes, estimated_cost,
              advance_deposit, promised_delivery_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        jobId,
        shopId,
        jobNumber,
        customerId,
        deviceId,
        serviceCategory || 'GENERAL_SERVICE',
        priority,
        assignedTechnicianId || null,
        reportedIssue.trim(),
        JSON.stringify(accessoriesReceived),
        physicalConditionNotes || null,
        Number(estimatedCost),
        Number(advanceDeposit),
        promisedDeliveryDate || null,
        req.user!.userId,
      ],
    });

    // Initial status history entry
    await client.execute({
      sql: `INSERT INTO job_status_history (id, shop_id, job_id, previous_status, new_status, changed_by, reason_or_notes)
            VALUES (?, ?, ?, NULL, 'RECEIVED', ?, 'Initial service job intake registration')`,
      args: [`JSH-${Date.now()}`, shopId, jobId, req.user!.userId],
    });

    res.json({
      success: true,
      data: {
        id: jobId,
        jobNumber,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get Comprehensive Job Details
jobsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const client = getClient();

    // 1. Job Master Info
    const jobRes = await client.execute({
      sql: `SELECT 
              j.*,
              c.full_name as customer_name,
              c.primary_phone as customer_phone,
              c.secondary_phone as customer_secondary_phone,
              c.email as customer_email,
              c.gstin as customer_gstin,
              d.equipment_type,
              d.brand as device_brand,
              d.model_name as device_model,
              d.serial_number as device_serial,
              d.color_finish as device_color,
              d.specs_summary as device_specs,
              u.full_name as technician_name
            FROM service_jobs j
            JOIN customers c ON j.customer_id = c.id
            JOIN devices d ON j.device_id = d.id
            LEFT JOIN users u ON j.assigned_technician_id = u.id
            WHERE j.shop_id = ? AND (j.id = ? OR j.job_number = ?)`,
      args: [shopId, id, id],
    });

    if (jobRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job record not found.' });
      return;
    }

    const job = jobRes.rows[0] as Record<string, unknown>;
    const targetJobId = String(job.id);

    // 2. Fetch parallel sub-collections
    const [historyRes, inspectionsRes, diagnosisRes, servicesRes, partsRes, activitiesRes, notesRes, checklistsRes, quotationsRes] = await Promise.all([
      client.execute({ sql: `SELECT * FROM job_status_history WHERE shop_id = ? AND job_id = ? ORDER BY created_at DESC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_inspections WHERE shop_id = ? AND job_id = ? ORDER BY created_at DESC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_diagnosis WHERE shop_id = ? AND job_id = ? ORDER BY created_at DESC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_services WHERE shop_id = ? AND job_id = ? ORDER BY created_at ASC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_parts WHERE shop_id = ? AND job_id = ? ORDER BY created_at ASC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_repair_activities WHERE shop_id = ? AND job_id = ? ORDER BY created_at DESC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_notes WHERE shop_id = ? AND job_id = ? ORDER BY created_at DESC`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM job_checklists WHERE shop_id = ? AND job_id = ?`, args: [shopId, targetJobId] }),
      client.execute({ sql: `SELECT * FROM quotations WHERE shop_id = ? AND job_id = ? ORDER BY created_at DESC`, args: [shopId, targetJobId] }),
    ]);

    res.json({
      success: true,
      data: {
        ...job,
        id: job.id,
        jobNumber: job.job_number,
        customerId: job.customer_id,
        deviceId: job.device_id,
        serviceCategory: job.service_category,
        currentStatus: job.current_status,
        priority: job.priority,
        assignedTechnicianId: job.assigned_technician_id,
        reportedIssue: job.reported_issue,
        physicalConditionNotes: job.physical_condition_notes,
        estimatedCost: Number(job.estimated_cost || 0),
        advanceDeposit: Number(job.advance_deposit || 0),
        promisedDeliveryDate: job.promised_delivery_date,
        actualDeliveryDate: job.actual_delivery_date,
        accessoriesReceived: job.accessories_received ? JSON.parse(String(job.accessories_received)) : [],
        history: historyRes.rows,
        inspections: inspectionsRes.rows,
        diagnosis: diagnosisRes.rows[0] || null,
        services: servicesRes.rows,
        parts: partsRes.rows,
        activities: activitiesRes.rows,
        notes: notesRes.rows,
        checklists: checklistsRes.rows,
        quotations: quotationsRes.rows,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Update Job (Missing Endpoint Implemented) ──────────────────────
jobsRouter.put('/:id', validateBody(updateJobSchema), async (req, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId;
    const client = getClient();

    // Verify job exists in current tenant shop
    const existingRes = await client.execute({
      sql: `SELECT * FROM service_jobs WHERE shop_id = ? AND (id = ? OR job_number = ?)`,
      args: [shopId, id, id],
    });

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found in current shop organization.' });
      return;
    }

    const job = existingRes.rows[0] as Record<string, unknown>;
    const actualJobId = String(job.id);

    const {
      serviceCategory,
      priority,
      assignedTechnicianId,
      reportedIssue,
      accessoriesReceived,
      physicalConditionNotes,
      estimatedCost,
      advanceDeposit,
      promisedDeliveryDate,
      actualDeliveryDate,
    } = req.body;

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (serviceCategory !== undefined) {
      updates.push('service_category = ?');
      args.push(serviceCategory);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      args.push(priority);
    }
    if (assignedTechnicianId !== undefined) {
      updates.push('assigned_technician_id = ?');
      args.push(assignedTechnicianId);
    }
    if (reportedIssue !== undefined) {
      updates.push('reported_issue = ?');
      args.push(reportedIssue.trim());
    }
    if (accessoriesReceived !== undefined) {
      updates.push('accessories_received = ?');
      args.push(JSON.stringify(accessoriesReceived));
    }
    if (physicalConditionNotes !== undefined) {
      updates.push('physical_condition_notes = ?');
      args.push(physicalConditionNotes);
    }
    if (estimatedCost !== undefined) {
      updates.push('estimated_cost = ?');
      args.push(Number(estimatedCost));
    }
    if (advanceDeposit !== undefined) {
      updates.push('advance_deposit = ?');
      args.push(Number(advanceDeposit));
    }
    if (promisedDeliveryDate !== undefined) {
      updates.push('promised_delivery_date = ?');
      args.push(promisedDeliveryDate);
    }
    if (actualDeliveryDate !== undefined) {
      updates.push('actual_delivery_date = ?');
      args.push(actualDeliveryDate);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      args.push(shopId, actualJobId);
      await client.execute({
        sql: `UPDATE service_jobs SET ${updates.join(', ')} WHERE shop_id = ? AND id = ?`,
        args,
      });
    }

    // Return the updated job record
    const updatedRes = await client.execute({
      sql: `SELECT * FROM service_jobs WHERE shop_id = ? AND id = ?`,
      args: [shopId, actualJobId],
    });

    res.json({
      success: true,
      data: updatedRes.rows[0],
      message: 'Job updated successfully.',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Update Job Status (with State Machine Validation)
const updateJobStatusHandler = async (req: Request, res: Response) => {

  try {
    const id = String(req.params.id);
    const { newStatus, notes } = req.body;
    const shopId = req.user!.shopId;
    const client = getClient();

    const currRes = await client.execute({
      sql: `SELECT id, current_status FROM service_jobs WHERE shop_id = ? AND (id = ? OR job_number = ?)`,
      args: [shopId, id, id],
    });

    if (currRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found in current shop organization.' });
      return;
    }

    const jobRow = currRes.rows[0] as Record<string, unknown>;
    const actualJobId = String(jobRow.id);
    const currentStatus = String(jobRow.current_status);

    if (!isValidTransition(currentStatus, newStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid status transition from "${currentStatus}" to "${newStatus}".`,
      });
      return;
    }

    await client.execute({
      sql: `UPDATE service_jobs SET current_status = ?, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND id = ?`,
      args: [newStatus, shopId, actualJobId],
    });

    await client.execute({
      sql: `INSERT INTO job_status_history (id, shop_id, job_id, previous_status, new_status, changed_by, reason_or_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [`JSH-${Date.now()}`, shopId, actualJobId, currentStatus, newStatus, req.user!.userId, notes || 'Status updated'],
    });

    res.json({ success: true, message: `Status updated to ${newStatus}`, data: { status: newStatus } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

jobsRouter.put('/:id/status', validateBody(updateJobStatusSchema), updateJobStatusHandler);
jobsRouter.post('/:id/status', validateBody(updateJobStatusSchema), updateJobStatusHandler);


// Add Hardware Inspection (Scoped to current tenant shop)
jobsRouter.post('/:id/inspection', validateBody(jobInspectionSchema), async (req, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId;
    const client = getClient();

    // Verify job belongs to current tenant shop
    const jobRes = await client.execute({
      sql: `SELECT id FROM service_jobs WHERE shop_id = ? AND (id = ? OR job_number = ?)`,
      args: [shopId, id, id],
    });
    if (jobRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found in current shop organization.' });
      return;
    }
    const actualJobId = String(jobRes.rows[0].id);

    const { powerStatus, displayStatus, motherboardStatus, bodyCondition, waterDamage, shortCircuit, notes } = req.body;

    const inspId = `INSP-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_inspections (
              id, shop_id, job_id, inspected_by, power_status, display_status,
              motherboard_status, body_condition, water_damage_detected,
              short_circuit_detected, inspection_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        inspId,
        shopId,
        actualJobId,
        req.user!.userId,
        powerStatus || 'NORMAL_POWER',
        displayStatus || null,
        motherboardStatus || null,
        bodyCondition || null,
        waterDamage ? 1 : 0,
        shortCircuit ? 1 : 0,
        notes || null,
      ],
    });

    res.json({ success: true, data: { id: inspId } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Add / Update Technician Diagnosis & Voltage Checks
jobsRouter.post('/:id/diagnosis', validateBody(jobDiagnosisSchema), async (req, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId;
    const client = getClient();

    // Verify job belongs to current tenant shop
    const jobRes = await client.execute({
      sql: `SELECT id FROM service_jobs WHERE shop_id = ? AND (id = ? OR job_number = ?)`,
      args: [shopId, id, id],
    });
    if (jobRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job not found in current shop organization.' });
      return;
    }
    const actualJobId = String(jobRes.rows[0].id);

    const { rootCause, voltageRails, faultyComponents, recommendedAction } = req.body;

    const diagId = `DIAG-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO job_diagnosis (
              id, shop_id, job_id, technician_id, root_cause_analysis,
              voltage_rails_checked, faulty_components_identified, recommended_action
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        diagId,
        shopId,
        actualJobId,
        req.user!.userId,
        rootCause,
        voltageRails ? JSON.stringify(voltageRails) : null,
        faultyComponents || null,
        recommendedAction || null,
      ],
    });

    res.json({ success: true, data: { id: diagId } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
