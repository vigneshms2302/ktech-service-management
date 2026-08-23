import { ipcMain } from 'electron';
import type { InValue } from '@libsql/client';
import { getClient, logAudit } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';

export function registerInventoryIpc(): void {
  // 1. Generate Unique SKU
  ipcMain.handle('inventory:generateSku', async (_event, params?: { categoryCode?: string }) => {
    try {
      const client = getClient();
      const catCode = (params?.categoryCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const countRes = await client.execute({
        sql: `SELECT COUNT(*) as cnt FROM inventory_items WHERE sku LIKE ?`,
        args: [`${catCode}-%`],
      });
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const sku = `${catCode}-${String(count).padStart(5, '0')}`;
      return { success: true, data: { sku } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 2. List Inventory Items
  ipcMain.handle('inventory:list', async (_event, params?: {
    search?: string;
    categoryId?: string;
    itemType?: string;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
  }) => {
    try {
      const client = getClient();
      const page = Math.max(1, params?.page || 1);
      const limit = Math.min(100, Math.max(10, params?.limit || 25));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const args: InValue[] = [];

      if (params?.search?.trim()) {
        const query = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(LOWER(i.name) LIKE ? OR LOWER(i.sku) LIKE ? OR LOWER(COALESCE(i.serial_number, '')) LIKE ?)`);
        args.push(query, query, query);
      }

      if (params?.categoryId) {
        conditions.push(`i.category_id = ?`);
        args.push(params.categoryId);
      }

      if (params?.itemType) {
        conditions.push(`i.item_type = ?`);
        args.push(params.itemType);
      }

      if (params?.lowStockOnly) {
        conditions.push(`i.quantity_on_hand <= i.min_reorder_level`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRes = await client.execute({
        sql: `SELECT COUNT(*) as total FROM inventory_items i ${whereClause}`,
        args,
      });
      const total = Number((countRes.rows[0] as Record<string, unknown>).total || 0);

      const itemsRes = await client.execute({
        sql: `SELECT i.*, 
                c.name as category_name, c.code as category_code,
                l.name as location_name,
                s.company_name as supplier_name,
                sd.salvage_code as salvage_code
              FROM inventory_items i
              LEFT JOIN inventory_categories c ON i.category_id = c.id
              LEFT JOIN inventory_locations l ON i.location_id = l.id
              LEFT JOIN suppliers s ON i.supplier_id = s.id
              LEFT JOIN salvage_devices sd ON i.salvage_source_id = sd.id
              ${whereClause}
              ORDER BY i.quantity_on_hand <= i.min_reorder_level DESC, i.name ASC
              LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      });

      // Quick summary metrics
      const metricsRes = await client.execute(`
        SELECT 
          COUNT(*) as total_items,
          SUM(quantity_on_hand) as total_units,
          SUM(quantity_on_hand * cost_price) as total_valuation,
          SUM(CASE WHEN quantity_on_hand <= min_reorder_level THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN item_type = 'SALVAGED_PART' THEN 1 ELSE 0 END) as salvage_parts_count
        FROM inventory_items
      `);
      const metrics = metricsRes.rows[0] as Record<string, unknown>;

      return {
        success: true,
        data: {
          items: itemsRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            sku: (row as Record<string, unknown>).sku,
            name: (row as Record<string, unknown>).name,
            categoryId: (row as Record<string, unknown>).category_id,
            categoryName: (row as Record<string, unknown>).category_name,
            categoryCode: (row as Record<string, unknown>).category_code,
            itemType: (row as Record<string, unknown>).item_type,
            serialNumber: (row as Record<string, unknown>).serial_number,
            costPrice: Number((row as Record<string, unknown>).cost_price || 0),
            sellingPrice: Number((row as Record<string, unknown>).selling_price || 0),
            hsnCode: (row as Record<string, unknown>).hsn_code,
            taxRate: Number((row as Record<string, unknown>).tax_rate || 18),
            quantityOnHand: Number((row as Record<string, unknown>).quantity_on_hand || 0),
            minReorderLevel: Number((row as Record<string, unknown>).min_reorder_level || 2),
            locationId: (row as Record<string, unknown>).location_id,
            locationName: (row as Record<string, unknown>).location_name,
            supplierId: (row as Record<string, unknown>).supplier_id,
            supplierName: (row as Record<string, unknown>).supplier_name,
            salvageSourceId: (row as Record<string, unknown>).salvage_source_id,
            salvageCode: (row as Record<string, unknown>).salvage_code,
            warrantyMonths: Number((row as Record<string, unknown>).warranty_months || 0),
            isLowStock: Number((row as Record<string, unknown>).quantity_on_hand || 0) <= Number((row as Record<string, unknown>).min_reorder_level || 2),
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          metrics: {
            totalItems: Number(metrics?.total_items || 0),
            totalUnits: Number(metrics?.total_units || 0),
            totalValuation: Number(metrics?.total_valuation || 0),
            lowStockCount: Number(metrics?.low_stock_count || 0),
            salvagePartsCount: Number(metrics?.salvage_parts_count || 0),
          },
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 3. Get Inventory Item By ID
  ipcMain.handle('inventory:getById', async (_event, params: { itemId: string }) => {
    try {
      const client = getClient();
      const res = await client.execute({
        sql: `SELECT i.*, 
                c.name as category_name, c.code as category_code,
                l.name as location_name,
                s.company_name as supplier_name,
                sd.salvage_code as salvage_code
              FROM inventory_items i
              LEFT JOIN inventory_categories c ON i.category_id = c.id
              LEFT JOIN inventory_locations l ON i.location_id = l.id
              LEFT JOIN suppliers s ON i.supplier_id = s.id
              LEFT JOIN salvage_devices sd ON i.salvage_source_id = sd.id
              WHERE i.id = ? OR i.sku = ?
              LIMIT 1`,
        args: [params.itemId, params.itemId],
      });

      if (res.rows.length === 0) {
        return { success: false, error: `Inventory item "${params.itemId}" not found` };
      }

      const item = res.rows[0] as Record<string, unknown>;

      // Get transaction history
      const txRes = await client.execute({
        sql: `SELECT t.*, u.full_name as created_by_name
              FROM inventory_transactions t
              LEFT JOIN users u ON t.created_by = u.id
              WHERE t.item_id = ?
              ORDER BY t.created_at DESC
              LIMIT 50`,
        args: [String(item.id)],
      });

      return {
        success: true,
        data: {
          item: {
            id: item.id,
            sku: item.sku,
            name: item.name,
            categoryId: item.category_id,
            categoryName: item.category_name,
            categoryCode: item.category_code,
            itemType: item.item_type,
            serialNumber: item.serial_number,
            costPrice: Number(item.cost_price || 0),
            sellingPrice: Number(item.selling_price || 0),
            hsnCode: item.hsn_code,
            taxRate: Number(item.tax_rate || 18),
            quantityOnHand: Number(item.quantity_on_hand || 0),
            minReorderLevel: Number(item.min_reorder_level || 2),
            locationId: item.location_id,
            locationName: item.location_name,
            supplierId: item.supplier_id,
            supplierName: item.supplier_name,
            salvageSourceId: item.salvage_source_id,
            salvageCode: item.salvage_code,
            warrantyMonths: Number(item.warranty_months || 0),
            createdAt: item.created_at,
          },
          transactions: txRes.rows.map((r) => ({
            id: (r as Record<string, unknown>).id,
            transactionType: (r as Record<string, unknown>).transaction_type,
            quantityDelta: Number((r as Record<string, unknown>).quantity_delta || 0),
            balanceAfter: Number((r as Record<string, unknown>).balance_after || 0),
            referenceType: (r as Record<string, unknown>).reference_type,
            referenceId: (r as Record<string, unknown>).reference_id,
            notes: (r as Record<string, unknown>).notes,
            createdByName: (r as Record<string, unknown>).created_by_name,
            createdAt: (r as Record<string, unknown>).created_at,
          })),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 4. Create Inventory Item
  ipcMain.handle('inventory:create', async (_event, payload: {
    sku?: string;
    name: string;
    categoryId: string;
    itemType: 'NEW_SPARE_PART' | 'USED_PART' | 'SALVAGED_PART' | 'FINISHED_PRODUCT' | 'CONSUMABLE';
    serialNumber?: string;
    costPrice: number;
    sellingPrice: number;
    hsnCode?: string;
    taxRate?: number;
    initialQuantity?: number;
    minReorderLevel?: number;
    locationId?: string;
    supplierId?: string;
    salvageSourceId?: string;
    warrantyMonths?: number;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Unauthorized: Active session required' };
      }

      if (!payload.name?.trim()) {
        return { success: false, error: 'Item name is required' };
      }

      if (!payload.categoryId) {
        return { success: false, error: 'Category is required' };
      }

      const client = getClient();
      const itemId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const initialQty = Math.max(0, payload.initialQuantity || 0);

      let sku = payload.sku?.trim();
      if (!sku) {
        const catRes = await client.execute({ sql: `SELECT code FROM inventory_categories WHERE id = ?`, args: [payload.categoryId] });
        const catCode = (catRes.rows[0] as Record<string, unknown>)?.code || 'GEN';
        const countRes = await client.execute({ sql: `SELECT COUNT(*) as cnt FROM inventory_items WHERE category_id = ?`, args: [payload.categoryId] });
        const cnt = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
        sku = `${catCode}-${String(cnt).padStart(5, '0')}`;
      }

      const tx = await client.transaction('write');
      try {
        await tx.execute({
          sql: `INSERT INTO inventory_items (
                  id, sku, name, category_id, item_type, serial_number,
                  cost_price, selling_price, hsn_code, tax_rate,
                  quantity_on_hand, min_reorder_level, location_id, supplier_id,
                  salvage_source_id, warranty_months
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            itemId,
            sku,
            payload.name.trim(),
            payload.categoryId,
            payload.itemType,
            payload.serialNumber?.trim() || null,
            payload.costPrice || 0,
            payload.sellingPrice || 0,
            payload.hsnCode?.trim() || null,
            payload.taxRate ?? 18.0,
            initialQty,
            payload.minReorderLevel ?? 2,
            payload.locationId || null,
            payload.supplierId || null,
            payload.salvageSourceId || null,
            payload.warrantyMonths || 0,
          ],
        });

        if (initialQty > 0) {
          const txId = `ITX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await tx.execute({
            sql: `INSERT INTO inventory_transactions (
                    id, item_id, transaction_type, quantity_delta, balance_after,
                    reference_type, reference_id, notes, created_by
                  ) VALUES (?, ?, 'PURCHASE_IN', ?, ?, 'INITIAL_STOCK', NULL, 'Initial stock entry', ?)`,
            args: [txId, itemId, initialQty, initialQty, session.id],
          });
        }

        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw err;
      }

      await logAudit(session.id, 'INVENTORY_CREATE', 'inventory_items', itemId, null, { sku, name: payload.name, initialQty });

      return { success: true, data: { itemId, sku } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 5. Adjust Stock / Record Movement
  ipcMain.handle('inventory:adjustStock', async (_event, payload: {
    itemId: string;
    transactionType: 'PURCHASE_IN' | 'JOB_CONSUMPTION' | 'DIRECT_SALE' | 'DEFECTIVE_SCRAP' | 'INVENTORY_AUDIT_ADJUSTMENT' | 'SALVAGE_HARVEST';
    quantityDelta: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Unauthorized: Active session required' };
      }

      if (payload.quantityDelta === 0) {
        return { success: false, error: 'Quantity delta cannot be zero' };
      }

      const client = getClient();
      const tx = await client.transaction('write');

      try {
        const itemRes = await tx.execute({
          sql: `SELECT id, name, sku, quantity_on_hand FROM inventory_items WHERE id = ? OR sku = ?`,
          args: [payload.itemId, payload.itemId],
        });

        if (itemRes.rows.length === 0) {
          throw new Error(`Inventory item "${payload.itemId}" not found`);
        }

        const currentItem = itemRes.rows[0] as Record<string, unknown>;
        const currentQty = Number(currentItem.quantity_on_hand || 0);
        const newQty = currentQty + payload.quantityDelta;

        if (newQty < 0) {
          throw new Error(`Insufficient stock for "${currentItem.name}". Current available: ${currentQty}, Requested reduction: ${Math.abs(payload.quantityDelta)}`);
        }

        await tx.execute({
          sql: `UPDATE inventory_items SET quantity_on_hand = ? WHERE id = ?`,
          args: [newQty, String(currentItem.id)],
        });

        const txId = `ITX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await tx.execute({
          sql: `INSERT INTO inventory_transactions (
                  id, item_id, transaction_type, quantity_delta, balance_after,
                  reference_type, reference_id, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            txId,
            String(currentItem.id),
            payload.transactionType,
            payload.quantityDelta,
            newQty,
            payload.referenceType || 'MANUAL_ADJUSTMENT',
            payload.referenceId || null,
            payload.notes?.trim() || null,
            session.id,
          ],
        });

        await tx.commit();

        await logAudit(session.id, 'INVENTORY_STOCK_ADJUST', 'inventory_items', currentItem.id as string, { previousQty: currentQty }, { newQty, delta: payload.quantityDelta, type: payload.transactionType });

        return {
          success: true,
          data: {
            itemId: currentItem.id,
            previousQuantity: currentQty,
            newQuantity: newQty,
            delta: payload.quantityDelta,
          },
        };
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 6. List Categories & Locations
  ipcMain.handle('inventory:listCategories', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`SELECT * FROM inventory_categories ORDER BY name ASC`);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('inventory:listLocations', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`SELECT * FROM inventory_locations ORDER BY name ASC`);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 7. Suppliers CRUD
  ipcMain.handle('inventory:listSuppliers', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`
        SELECT s.*, COUNT(i.id) as item_count 
        FROM suppliers s 
        LEFT JOIN inventory_items i ON s.id = i.supplier_id 
        GROUP BY s.id 
        ORDER BY s.company_name ASC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('inventory:createSupplier', async (_event, payload: {
    companyName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    address?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };
      if (!payload.companyName?.trim()) return { success: false, error: 'Supplier company name is required' };

      const client = getClient();
      const supplierId = `SUPP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.execute({
        sql: `INSERT INTO suppliers (id, company_name, contact_person, phone, email, gstin, address)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          supplierId,
          payload.companyName.trim(),
          payload.contactPerson?.trim() || null,
          payload.phone?.trim() || null,
          payload.email?.trim() || null,
          payload.gstin?.trim() || null,
          payload.address?.trim() || null,
        ],
      });

      return { success: true, data: { supplierId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ==========================================
  // SALVAGE DISMANTLING & RECOVERY SUBSYSTEM
  // ==========================================

  // 8. List Salvage Devices
  ipcMain.handle('salvage:list', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`
        SELECT sd.*, 
               u.full_name as dismantled_by_name,
               COUNT(sp.id) as harvested_parts_count,
               COALESCE(SUM(sp.estimated_value), 0) as total_harvested_value,
               sj.job_number as original_job_number,
               c.full_name as original_customer_name
        FROM salvage_devices sd
        LEFT JOIN users u ON sd.dismantled_by = u.id
        LEFT JOIN salvage_parts sp ON sd.id = sp.salvage_device_id
        LEFT JOIN service_jobs sj ON sd.original_service_job_id = sj.id
        LEFT JOIN customers c ON sj.customer_id = c.id
        GROUP BY sd.id
        ORDER BY sd.created_at DESC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 9. Salvage Intake (Convert unrepairable job or direct scrap acquisition)
  ipcMain.handle('salvage:intake', async (_event, payload: {
    originalServiceJobId?: string;
    equipmentType: string;
    brand: string;
    modelName: string;
    serialNumber?: string;
    acquisitionType: 'CUSTOMER_SCRAP_DONATION' | 'PURCHASED_FOR_PARTS' | 'UNREPAIRABLE_RETENTION';
    acquisitionCost?: number;
    notes?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM salvage_devices`);
      const cnt = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const currentYear = new Date().getFullYear();
      const salvageCode = `SALV-${currentYear}-${String(cnt).padStart(5, '0')}`;
      const salvageId = `SD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      await client.execute({
        sql: `INSERT INTO salvage_devices (
                id, salvage_code, original_service_job_id, equipment_type, brand, model_name,
                serial_number, acquisition_type, acquisition_cost, dismantled_by, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          salvageId,
          salvageCode,
          payload.originalServiceJobId || null,
          payload.equipmentType,
          payload.brand.trim(),
          payload.modelName.trim(),
          payload.serialNumber?.trim() || null,
          payload.acquisitionType,
          payload.acquisitionCost || 0.0,
          session.id,
          payload.notes?.trim() || null,
        ],
      });

      // If linked to a job, log status note
      if (payload.originalServiceJobId) {
        await client.execute({
          sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                VALUES (?, ?, 'UNREPAIRABLE', 'SALVAGED', ?, ?)`,
          args: [
            `JSH-${Date.now()}`,
            payload.originalServiceJobId,
            session.id,
            `Device transferred to Salvage Engine for parts recovery (${salvageCode}).`,
          ],
        });
      }

      await logAudit(session.id, 'SALVAGE_INTAKE', 'salvage_devices', salvageId, null, { salvageCode, brand: payload.brand, model: payload.modelName });

      return { success: true, data: { salvageId, salvageCode } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 10. Salvage Dismantling & Component Harvesting
  ipcMain.handle('salvage:harvestComponents', async (_event, payload: {
    salvageDeviceId: string;
    harvestedParts: Array<{
      partName: string;
      categoryId: string;
      serialNumber?: string;
      testedCondition: 'GRADE_A_WORKING' | 'GRADE_B_MINOR_WEAR' | 'UNTESTED_AS_IS';
      estimatedValue: number;
      sellingPrice?: number;
      locationId?: string;
      notes?: string;
    }>;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      if (!payload.harvestedParts || payload.harvestedParts.length === 0) {
        return { success: false, error: 'At least one harvested component is required' };
      }

      const client = getClient();
      const tx = await client.transaction('write');

      try {
        const salvRes = await tx.execute({
          sql: `SELECT * FROM salvage_devices WHERE id = ? OR salvage_code = ?`,
          args: [payload.salvageDeviceId, payload.salvageDeviceId],
        });

        if (salvRes.rows.length === 0) {
          throw new Error(`Salvage device "${payload.salvageDeviceId}" not found`);
        }

        const salvageDevice = salvRes.rows[0] as Record<string, unknown>;
        const salvId = salvageDevice.id as string;
        const salvCode = salvageDevice.salvage_code as string;
        const createdItemIds: string[] = [];

        for (const part of payload.harvestedParts) {
          const invItemId = `INV-SALV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const salvPartId = `SP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          // Generate SKU for salvaged part
          const catRes = await tx.execute({ sql: `SELECT code FROM inventory_categories WHERE id = ?`, args: [part.categoryId] });
          const catCode = (catRes.rows[0] as Record<string, unknown>)?.code || 'SALV';
          const cntRes = await tx.execute(`SELECT COUNT(*) as cnt FROM inventory_items WHERE item_type = 'SALVAGED_PART'`);
          const count = Number((cntRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
          const sku = `${catCode}-SALV-${String(count).padStart(4, '0')}`;

          // 1. Create inventory item with source tracking
          await tx.execute({
            sql: `INSERT INTO inventory_items (
                    id, sku, name, category_id, item_type, serial_number,
                    cost_price, selling_price, quantity_on_hand, min_reorder_level,
                    location_id, salvage_source_id, warranty_months
                  ) VALUES (?, ?, ?, ?, 'SALVAGED_PART', ?, ?, ?, 1, 0, ?, ?, 1)`,
            args: [
              invItemId,
              sku,
              `[Salvaged] ${part.partName.trim()} (from ${salvCode})`,
              part.categoryId,
              part.serialNumber?.trim() || null,
              part.estimatedValue || 0,
              part.sellingPrice || (part.estimatedValue * 1.5),
              part.locationId || null,
              salvId,
            ],
          });

          // 2. Record in salvage_parts
          await tx.execute({
            sql: `INSERT INTO salvage_parts (
                    id, salvage_device_id, inventory_item_id, part_name,
                    serial_number, tested_condition, estimated_value
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              salvPartId,
              salvId,
              invItemId,
              part.partName.trim(),
              part.serialNumber?.trim() || null,
              part.testedCondition,
              part.estimatedValue || 0,
            ],
          });

          // 3. Write stock movement audit
          const txId = `ITX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await tx.execute({
            sql: `INSERT INTO inventory_transactions (
                    id, item_id, transaction_type, quantity_delta, balance_after,
                    reference_type, reference_id, notes, created_by
                  ) VALUES (?, ?, 'SALVAGE_HARVEST', 1, 1, 'SALVAGE_DEVICE', ?, ?, ?)`,
            args: [
              txId,
              invItemId,
              salvCode,
              `Harvested from ${salvageDevice.brand} ${salvageDevice.model_name} (${salvCode})`,
              session.id,
            ],
          });

          createdItemIds.push(invItemId);
        }

        await tx.commit();

        await logAudit(session.id, 'SALVAGE_HARVEST', 'salvage_devices', salvId, null, {
          salvageCode: salvCode,
          harvestedCount: payload.harvestedParts.length,
          itemIds: createdItemIds,
        });

        return {
          success: true,
          data: {
            salvageId: salvId,
            harvestedCount: payload.harvestedParts.length,
            createdItemIds,
          },
        };
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 11. Get Salvage Device Details with Harvested Parts List
  ipcMain.handle('salvage:getById', async (_event, params: { salvageId: string }) => {
    try {
      const client = getClient();
      const res = await client.execute({
        sql: `SELECT sd.*, 
                u.full_name as dismantled_by_name,
                sj.job_number as original_job_number,
                c.full_name as original_customer_name
              FROM salvage_devices sd
              LEFT JOIN users u ON sd.dismantled_by = u.id
              LEFT JOIN service_jobs sj ON sd.original_service_job_id = sj.id
              LEFT JOIN customers c ON sj.customer_id = c.id
              WHERE sd.id = ? OR sd.salvage_code = ?
              LIMIT 1`,
        args: [params.salvageId, params.salvageId],
      });

      if (res.rows.length === 0) {
        return { success: false, error: `Salvage device "${params.salvageId}" not found` };
      }

      const device = res.rows[0] as Record<string, unknown>;

      const partsRes = await client.execute({
        sql: `SELECT sp.*, i.sku, i.quantity_on_hand, i.selling_price
              FROM salvage_parts sp
              LEFT JOIN inventory_items i ON sp.inventory_item_id = i.id
              WHERE sp.salvage_device_id = ?
              ORDER BY sp.created_at DESC`,
        args: [String(device.id)],
      });

      return {
        success: true,
        data: {
          device,
          harvestedParts: partsRes.rows,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
