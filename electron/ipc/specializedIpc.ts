import { ipcMain } from 'electron';
import type { InValue } from '@libsql/client';
import { getClient, logAudit } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';

export function registerSpecializedIpc(): void {
  // ==========================================
  // 1. DEDICATED DATA RECOVERY SUBSYSTEM
  // ==========================================

  ipcMain.handle('datarecovery:list', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`
        SELECT dr.*, 
               sj.job_number, sj.current_status as job_status, sj.priority as job_priority,
               c.full_name as customer_name, c.primary_phone as customer_phone, c.customer_code,
               d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial,
               u.full_name as technician_name
        FROM data_recovery_jobs dr
        JOIN service_jobs sj ON dr.service_job_id = sj.id
        JOIN customers c ON sj.customer_id = c.id
        LEFT JOIN devices d ON sj.device_id = d.id
        LEFT JOIN users u ON sj.assigned_technician_id = u.id
        ORDER BY dr.created_at DESC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('datarecovery:intake', async (_event, payload: {
    serviceJobId: string;
    storageType: 'HDD_2_5' | 'HDD_3_5' | 'SATA_SSD' | 'NVME_SSD' | 'PEN_DRIVE' | 'SD_CARD' | 'OTHER';
    capacityGb: number;
    fileSystem?: string;
    detectionStatus: 'DETECTED_NORMAL' | 'DETECTED_WRONG_SIZE' | 'NOT_DETECTED' | 'BUSY_HANG' | 'CLICKING_NOISE';
    damageType: 'LOGICAL_DELETION' | 'FORMATTED_RAW' | 'FIRMWARE_CORRUPTION' | 'BAD_SECTORS' | 'PCB_FAILURE' | 'HEAD_MOTOR_CRASH';
    recoveryComplexity: 'LEVEL_1_LOGICAL' | 'LEVEL_2_FIRMWARE_PCB' | 'LEVEL_3_CLEANROOM_HEAD_SWAP';
    targetDataDescription?: string;
    destinationMediaType: 'CUSTOMER_PROVIDED_DRIVE' | 'PURCHASED_NEW_DRIVE' | 'CLOUD_TRANSFER';
    destinationMediaDetails?: string;
    disclaimerAcknowledged: boolean;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const drId = `DR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      await client.execute({
        sql: `INSERT INTO data_recovery_jobs (
                id, service_job_id, storage_type, capacity_gb, file_system,
                detection_status, damage_type, recovery_complexity,
                target_data_description, destination_media_type, destination_media_details,
                recovered_size_gb, recovery_outcome, disclaimer_acknowledged
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 'ASSESSMENT', ?)`,
        args: [
          drId,
          payload.serviceJobId,
          payload.storageType,
          payload.capacityGb,
          payload.fileSystem?.trim() || null,
          payload.detectionStatus,
          payload.damageType,
          payload.recoveryComplexity,
          payload.targetDataDescription?.trim() || null,
          payload.destinationMediaType,
          payload.destinationMediaDetails?.trim() || null,
          payload.disclaimerAcknowledged ? 1 : 0,
        ],
      });

      await logAudit(session.id, 'DATA_RECOVERY_INTAKE', 'data_recovery_jobs', drId, null, {
        storageType: payload.storageType,
        complexity: payload.recoveryComplexity,
      });

      return { success: true, data: { dataRecoveryId: drId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('datarecovery:updateAssessment', async (_event, payload: {
    dataRecoveryId: string;
    recoveredSizeGb: number;
    recoveryOutcome: 'ASSESSMENT' | 'FULL_RECOVERY' | 'PARTIAL_RECOVERY' | 'UNSUCCESSFUL';
    notes?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      await client.execute({
        sql: `UPDATE data_recovery_jobs 
              SET recovered_size_gb = ?, recovery_outcome = ? 
              WHERE id = ?`,
        args: [payload.recoveredSizeGb, payload.recoveryOutcome, payload.dataRecoveryId],
      });

      return { success: true, data: { status: payload.recoveryOutcome } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ==========================================
  // 2. REFURBISHED PRODUCT MANAGEMENT
  // ==========================================

  ipcMain.handle('refurb:list', async (_event, params?: { status?: string }) => {
    try {
      const client = getClient();
      const condition = params?.status ? `WHERE p.status = '${params.status}'` : '';
      const res = await client.execute(`
        SELECT p.*, c.full_name as sold_to_customer_name, c.primary_phone as sold_to_customer_phone
        FROM products p
        LEFT JOIN customers c ON p.sold_to_customer_id = c.id
        ${condition}
        ORDER BY p.status ASC, p.created_at DESC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('refurb:create', async (_event, payload: {
    productType: string;
    brand: string;
    modelName: string;
    serialNumber?: string;
    specs: string;
    cosmeticGrade: 'GRADE_A' | 'GRADE_B' | 'GRADE_C';
    acquisitionCost: number;
    refurbCostSpent: number;
    sellingPrice: number;
    warrantyMonths?: number;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM products`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const productCode = `REF-${currentYear}-${String(count).padStart(4, '0')}`;
      const prodId = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      await client.execute({
        sql: `INSERT INTO products (
                id, product_code, product_type, brand, model_name, serial_number,
                specs, cosmetic_grade, acquisition_cost, refurb_cost_spent, selling_price,
                status, warranty_months
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_STOCK', ?)`,
        args: [
          prodId,
          productCode,
          payload.productType,
          payload.brand.trim(),
          payload.modelName.trim(),
          payload.serialNumber?.trim() || null,
          payload.specs.trim(),
          payload.cosmeticGrade,
          payload.acquisitionCost,
          payload.refurbCostSpent || 0,
          payload.sellingPrice,
          payload.warrantyMonths ?? 3,
        ],
      });

      await logAudit(session.id, 'REFURB_PRODUCT_CREATE', 'products', prodId, null, { productCode, model: payload.modelName });

      return { success: true, data: { productId: prodId, productCode } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('refurb:sell', async (_event, payload: {
    productId: string;
    customerId: string;
    sellingPrice: number;
    paymentMode: 'CASH' | 'UPI_QR' | 'CARD' | 'NET_BANKING';
    warrantyMonths?: number;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const prodRes = await client.execute({ sql: `SELECT * FROM products WHERE id = ?`, args: [payload.productId] });
      if (prodRes.rows.length === 0) return { success: false, error: 'Product not found' };

      const product = prodRes.rows[0] as Record<string, unknown>;
      if (product.status === 'SOLD') return { success: false, error: 'Product is already sold' };

      const currentYear = new Date().getFullYear();
      const saleCountRes = await client.execute(`SELECT COUNT(*) as cnt FROM product_sales`);
      const saleCount = Number((saleCountRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const saleNumber = `SALE-${currentYear}-${String(saleCount).padStart(5, '0')}`;
      const saleId = `PS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const tx = await client.transaction('write');
      try {
        // Record sale
        await tx.execute({
          sql: `INSERT INTO product_sales (id, sale_number, customer_id, total_amount) VALUES (?, ?, ?, ?)`,
          args: [saleId, saleNumber, payload.customerId, payload.sellingPrice],
        });

        const saleItemId = `PSI-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await tx.execute({
          sql: `INSERT INTO product_sale_items (id, sale_id, product_id, unit_price, quantity, tax_rate, total_amount)
                VALUES (?, ?, ?, ?, 1, 18.0, ?)`,
          args: [saleItemId, saleId, payload.productId, payload.sellingPrice, payload.sellingPrice],
        });

        // Update product to SOLD
        await tx.execute({
          sql: `UPDATE products SET status = 'SOLD', sold_to_customer_id = ? WHERE id = ?`,
          args: [payload.customerId, payload.productId],
        });

        // Create Warranty Record automatically
        const wCountRes = await tx.execute(`SELECT COUNT(*) as cnt FROM warranties`);
        const wCount = Number((wCountRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
        const warrantyCode = `WAR-${currentYear}-${String(wCount).padStart(5, '0')}`;
        const warrantyId = `WAR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const durationDays = (payload.warrantyMonths ?? Number(product.warranty_months || 3)) * 30;

        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(startDate.getDate() + durationDays);

        await tx.execute({
          sql: `INSERT INTO warranties (
                  id, warranty_code, customer_id, product_id, warranty_type,
                  start_date, expiry_date, duration_days, covered_scope, terms_and_exclusions, status
                ) VALUES (?, ?, ?, ?, 'REFURBISHED_PRODUCT', ?, ?, ?, ?, 'Covers hardware failure under normal use; excludes physical damage and liquid spill.', 'ACTIVE')`,
          args: [
            warrantyId,
            warrantyCode,
            payload.customerId,
            payload.productId,
            startDate.toISOString().split('T')[0],
            expiryDate.toISOString().split('T')[0],
            durationDays,
            `Hardware Warranty for ${product.brand} ${product.model_name}`,
          ],
        });

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'REFURB_PRODUCT_SALE', 'products', payload.productId, null, { saleNumber, price: payload.sellingPrice });

      return { success: true, data: { saleNumber, productId: payload.productId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ==========================================
  // 3. CUSTOM PC BUILDER QUOTATION MODULE
  // ==========================================

  ipcMain.handle('pcbuilder:list', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`
        SELECT pb.*, c.full_name as customer_name, c.primary_phone as customer_phone, u.full_name as created_by_name
        FROM pc_builds pb
        LEFT JOIN customers c ON pb.customer_id = c.id
        LEFT JOIN users u ON pb.created_by = u.id
        ORDER BY pb.created_at DESC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('pcbuilder:create', async (_event, payload: {
    customerId: string;
    buildName: string;
    targetBudget?: number;
    assemblyLaborFee: number;
    discountAmount?: number;
    slots: Array<{
      componentSlot: string; // e.g. 'CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Cabinet', 'Cooler'
      inventoryItemId?: string;
      itemName: string;
      specs?: string;
      quantity: number;
      unitCost: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM pc_builds`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const buildNumber = `PC-${currentYear}-${String(count).padStart(4, '0')}`;
      const buildId = `PCB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let totalPartsCost = 0;
      let totalPartsPrice = 0;
      let totalTax = 0;

      for (const slot of payload.slots) {
        const cost = slot.quantity * slot.unitCost;
        const price = slot.quantity * slot.unitPrice;
        const tax = (price * (slot.taxRate ?? 18.0)) / 100;
        totalPartsCost += cost;
        totalPartsPrice += price;
        totalTax += tax;
      }

      const labor = payload.assemblyLaborFee || 0;
      const laborTax = (labor * 18.0) / 100;
      totalTax += laborTax;
      const discount = payload.discountAmount || 0;
      const finalPrice = totalPartsPrice + labor + totalTax - discount;

      const tx = await client.transaction('write');
      try {
        await tx.execute({
          sql: `INSERT INTO pc_builds (
                  id, build_number, customer_id, build_name, target_budget,
                  parts_cost, parts_price, assembly_labor_fee, discount_amount,
                  tax_amount, final_quoted_price, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUOTED', ?)`,
          args: [
            buildId,
            buildNumber,
            payload.customerId,
            payload.buildName.trim(),
            payload.targetBudget || 0,
            totalPartsCost,
            totalPartsPrice,
            labor,
            discount,
            totalTax,
            finalPrice,
            session.id,
          ],
        });

        for (const slot of payload.slots) {
          const slotId = `PCBI-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await tx.execute({
            sql: `INSERT INTO pc_build_items (
                    id, pc_build_id, component_slot, inventory_item_id, item_name,
                    specs, quantity, unit_cost, unit_price, tax_rate
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              slotId,
              buildId,
              slot.componentSlot,
              slot.inventoryItemId || null,
              slot.itemName.trim(),
              slot.specs?.trim() || null,
              slot.quantity,
              slot.unitCost,
              slot.unitPrice,
              slot.taxRate ?? 18.0,
            ],
          });
        }

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'PC_BUILD_CREATE', 'pc_builds', buildId, null, { buildNumber, finalPrice });

      return { success: true, data: { buildId, buildNumber, finalQuotedPrice: finalPrice } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ==========================================
  // 4. PROPER WARRANTY MANAGEMENT & CLAIMS
  // ==========================================

  ipcMain.handle('warranty:list', async (_event, params?: { search?: string; customerId?: string }) => {
    try {
      const client = getClient();
      const conditions: string[] = [];
      const args: InValue[] = [];

      if (params?.customerId) {
        conditions.push(`w.customer_id = ?`);
        args.push(params.customerId);
      }

      if (params?.search?.trim()) {
        const q = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(LOWER(w.warranty_code) LIKE ? OR LOWER(c.full_name) LIKE ? OR LOWER(COALESCE(d.model_name, '')) LIKE ?)`);
        args.push(q, q, q);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await client.execute({
        sql: `SELECT w.*, 
                c.full_name as customer_name, c.primary_phone as customer_phone, c.customer_code,
                d.equipment_type, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial,
                sj.job_number as original_job_number,
                inv.invoice_number as original_invoice_number,
                p.product_code, p.model_name as product_model,
                COUNT(wj.id) as claims_count
              FROM warranties w
              LEFT JOIN customers c ON w.customer_id = c.id
              LEFT JOIN devices d ON w.device_id = d.id
              LEFT JOIN service_jobs sj ON w.original_job_id = sj.id
              LEFT JOIN invoices inv ON w.original_invoice_id = inv.id
              LEFT JOIN products p ON w.product_id = p.id
              LEFT JOIN warranty_jobs wj ON w.id = wj.warranty_id
              ${whereClause}
              GROUP BY w.id
              ORDER BY w.expiry_date DESC`,
        args,
      });

      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 1-Click File Warranty Claim Job
  ipcMain.handle('warranty:createClaimJob', async (_event, payload: {
    warrantyId: string;
    reportedIssue: string;
    priority?: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
    notes?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const wRes = await client.execute({ sql: `SELECT * FROM warranties WHERE id = ?`, args: [payload.warrantyId] });
      if (wRes.rows.length === 0) return { success: false, error: 'Warranty record not found' };

      const warranty = wRes.rows[0] as Record<string, unknown>;

      // Check if warranty is still valid
      const today = new Date().toISOString().split('T')[0];
      if ((warranty.expiry_date as string) < today) {
        return { success: false, error: `Warranty expired on ${warranty.expiry_date}` };
      }

      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM service_jobs`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const jobNumber = `JOB-${currentYear}-${String(count).padStart(5, '0')}`;
      const newJobId = `JOB-WARR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const wjId = `WJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const tx = await client.transaction('write');
      try {
        // Create warranty service job
        await tx.execute({
          sql: `INSERT INTO service_jobs (
                  id, job_number, customer_id, device_id, service_category,
                  current_status, priority, reported_issue, is_warranty_job,
                  parent_warranty_id, created_by
                ) VALUES (?, ?, ?, ?, 'WARRANTY_RE_REPAIR', 'RECEIVED', ?, ?, 1, ?, ?)`,
          args: [
            newJobId,
            jobNumber,
            String(warranty.customer_id),
            warranty.device_id ? String(warranty.device_id) : null,
            payload.priority || 'URGENT',
            `[WARRANTY CLAIM on ${String(warranty.warranty_code)}] ${payload.reportedIssue.trim()}`,
            String(warranty.id),
            session.id,
          ],
        });

        // Insert warranty_jobs linkage
        await tx.execute({
          sql: `INSERT INTO warranty_jobs (
                  id, warranty_id, warranty_claim_job_id, claim_issue_reported,
                  resolution_type, notes
                ) VALUES (?, ?, ?, ?, 'FREE_RE_REPAIR', ?)`,
          args: [
            wjId,
            String(warranty.id),
            newJobId,
            payload.reportedIssue.trim(),
            payload.notes?.trim() || null,
          ],
        });

        // Log status history
        await tx.execute({
          sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                VALUES (?, ?, NULL, 'RECEIVED', ?, ?)`,
          args: [
            `JSH-${Date.now()}`,
            newJobId,
            session.id,
            `Warranty claim initiated under warranty ${warranty.warranty_code}. Free re-repair authorized.`,
          ],
        });

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'WARRANTY_CLAIM_JOB', 'warranty_jobs', wjId, null, {
        warrantyCode: warranty.warranty_code,
        claimJobNumber: jobNumber,
      });

      return { success: true, data: { claimJobId: newJobId, claimJobNumber: jobNumber } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
