import { ipcMain } from 'electron';
import { getClient } from '../db/database.ts';

export function registerReportsIpc(): void {
  ipcMain.handle('reports:getOverview', async () => {
    try {
      const client = getClient();

      // 1. Jobs Counts
      const jobsCountRes = await client.execute(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN current_status NOT IN ('DELIVERED', 'UNREPAIRABLE', 'CANCELLED') THEN 1 ELSE 0 END) as active_jobs,
          SUM(CASE WHEN current_status = 'WAITING_FOR_INSPECTION' THEN 1 ELSE 0 END) as intake_pending,
          SUM(CASE WHEN current_status = 'UNDER_REPAIR' THEN 1 ELSE 0 END) as in_repair,
          SUM(CASE WHEN current_status = 'REPAIR_COMPLETED' OR current_status = 'READY_FOR_DELIVERY' THEN 1 ELSE 0 END) as ready_for_delivery,
          SUM(CASE WHEN current_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_jobs,
          SUM(CASE WHEN current_status = 'UNREPAIRABLE' THEN 1 ELSE 0 END) as unrepairable_jobs
        FROM service_jobs
      `);
      const jobCounts = jobsCountRes.rows[0] as Record<string, unknown>;

      // 2. Invoicing & Financials
      const financesRes = await client.execute(`
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total_amount), 0) as total_billed,
          COALESCE(SUM(amount_paid), 0) as total_collected,
          COALESCE(SUM(balance_due), 0) as total_outstanding,
          COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) as total_gst_collected
        FROM invoices
        WHERE is_void = 0
      `);
      const finances = financesRes.rows[0] as Record<string, unknown>;

      // 3. Inventory & Salvage Valuation
      const invRes = await client.execute(`
        SELECT 
          COUNT(*) as total_skus,
          COALESCE(SUM(quantity_on_hand), 0) as total_units_in_stock,
          COALESCE(SUM(quantity_on_hand * cost_price), 0) as stock_valuation,
          SUM(CASE WHEN quantity_on_hand <= min_reorder_level THEN 1 ELSE 0 END) as low_stock_alerts
        FROM inventory_items
      `);
      const inv = invRes.rows[0] as Record<string, unknown>;

      const salvRes = await client.execute(`
        SELECT 
          COUNT(*) as salvage_devices_count,
          COALESCE(SUM(acquisition_cost), 0) as salvage_acquisitions_cost
        FROM salvage_devices
      `);
      const salv = salvRes.rows[0] as Record<string, unknown>;

      // 4. Customers & Warranties
      const custRes = await client.execute(`SELECT COUNT(*) as total_customers FROM customers`);
      const totalCustomers = Number((custRes.rows[0] as Record<string, unknown>)?.total_customers || 0);

      const warrRes = await client.execute(`
        SELECT 
          COUNT(*) as active_warranties,
          (SELECT COUNT(*) FROM warranty_jobs) as warranty_claims_handled
        FROM warranties 
        WHERE status = 'ACTIVE'
      `);
      const warr = warrRes.rows[0] as Record<string, unknown>;

      return {
        success: true,
        data: {
          jobs: {
            total: Number(jobCounts?.total_jobs || 0),
            active: Number(jobCounts?.active_jobs || 0),
            intakePending: Number(jobCounts?.intake_pending || 0),
            inRepair: Number(jobCounts?.in_repair || 0),
            readyForDelivery: Number(jobCounts?.ready_for_delivery || 0),
            delivered: Number(jobCounts?.delivered_jobs || 0),
            unrepairable: Number(jobCounts?.unrepairable_jobs || 0),
          },
          finances: {
            totalInvoices: Number(finances?.total_invoices || 0),
            totalBilled: Number(finances?.total_billed || 0),
            totalCollected: Number(finances?.total_collected || 0),
            totalOutstanding: Number(finances?.total_outstanding || 0),
            totalGstCollected: Number(finances?.total_gst_collected || 0),
          },
          inventory: {
            totalSkus: Number(inv?.total_skus || 0),
            totalUnitsInStock: Number(inv?.total_units_in_stock || 0),
            stockValuation: Number(inv?.stock_valuation || 0),
            lowStockAlerts: Number(inv?.low_stock_alerts || 0),
            salvageDevicesCount: Number(salv?.salvage_devices_count || 0),
            salvageAcquisitionsCost: Number(salv?.salvage_acquisitions_cost || 0),
          },
          crm: {
            totalCustomers,
            activeWarranties: Number(warr?.active_warranties || 0),
            warrantyClaimsHandled: Number(warr?.warranty_claims_handled || 0),
          },
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('reports:getTechnicianPerformance', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`
        SELECT u.id, u.full_name, u.username,
               COUNT(sj.id) as total_assigned_jobs,
               SUM(CASE WHEN sj.current_status IN ('REPAIR_COMPLETED', 'READY_FOR_DELIVERY', 'DELIVERED') THEN 1 ELSE 0 END) as completed_repairs,
               SUM(CASE WHEN sj.current_status = 'UNREPAIRABLE' THEN 1 ELSE 0 END) as unrepairable_count,
               COALESCE((SELECT SUM(time_spent_minutes) FROM job_repair_activities WHERE technician_id = u.id), 0) as total_minutes_logged
        FROM users u
        LEFT JOIN service_jobs sj ON u.id = sj.assigned_technician_id
        WHERE u.role_id IN ('ROLE_TECHNICIAN', 'ROLE_OWNER')
        GROUP BY u.id
        ORDER BY completed_repairs DESC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('reports:getEquipmentFailureBreakdown', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`
        SELECT d.equipment_type, COUNT(sj.id) as job_count
        FROM service_jobs sj
        JOIN devices d ON sj.device_id = d.id
        GROUP BY d.equipment_type
        ORDER BY job_count DESC
      `);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
