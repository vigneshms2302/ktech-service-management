import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';

export const reportsRouter = Router();

reportsRouter.use(authenticateToken);

// ── Overview (Dashboard KPIs) ─────────────────────────────────────
reportsRouter.get('/overview', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();

    // 1. Jobs summary
    const jobsRes = await client.execute({
      sql: `SELECT
              COUNT(*) as total,
              SUM(CASE WHEN current_status IN ('RECEIVED','AWAITING_PARTS','INTAKE_PENDING','WAITING_FOR_INSPECTION') THEN 1 ELSE 0 END) as intake_pending,
              SUM(CASE WHEN current_status IN ('IN_DIAGNOSIS','IN_REPAIR','BOARD_LEVEL_REPAIR','CHIP_LEVEL_REPAIR','UNDER_INSPECTION','UNDER_REPAIR') THEN 1 ELSE 0 END) as in_repair,
              SUM(CASE WHEN current_status IN ('REPAIR_DONE','REPAIR_COMPLETED','QUALITY_CHECK','READY_FOR_DELIVERY') THEN 1 ELSE 0 END) as ready_for_delivery,
              SUM(CASE WHEN current_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
              SUM(CASE WHEN current_status IN ('UNREPAIRABLE','CANCELLED','RETURNED_WITHOUT_REPAIR') THEN 1 ELSE 0 END) as unrepairable
            FROM service_jobs WHERE shop_id = ?`,
      args: [shopId],
    });
    const j = jobsRes.rows[0] as Record<string, unknown>;

    // 2. Finance summary
    const finRes = await client.execute({
      sql: `SELECT
              COUNT(*) as total_invoices,
              COALESCE(SUM(total_amount), 0) as total_billed,
              COALESCE(SUM(amount_paid), 0) as total_collected,
              COALESCE(SUM(balance_due), 0) as total_outstanding,
              COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) as total_gst_collected
            FROM invoices WHERE shop_id = ?`,
      args: [shopId],
    });
    const f = finRes.rows[0] as Record<string, unknown>;

    // 3. Inventory summary (Using schema-verified columns: quantity_on_hand, min_reorder_level)
    const invRes = await client.execute({
      sql: `SELECT
              COUNT(DISTINCT id) as total_skus,
              COALESCE(SUM(quantity_on_hand), 0) as total_units,
              COALESCE(SUM(quantity_on_hand * cost_price), 0) as stock_valuation,
              SUM(CASE WHEN quantity_on_hand <= min_reorder_level AND min_reorder_level > 0 THEN 1 ELSE 0 END) as low_stock_alerts
            FROM inventory_items WHERE shop_id = ?`,
      args: [shopId],
    });
    const inv = invRes.rows[0] as Record<string, unknown>;

    // 4. CRM summary
    const crmRes = await client.execute({
      sql: `SELECT COUNT(*) as total_customers FROM customers WHERE shop_id = ?`,
      args: [shopId],
    });
    const crm = crmRes.rows[0] as Record<string, unknown>;

    // 5. Recent jobs (last 6)
    const recentRes = await client.execute({
      sql: `SELECT j.id, j.job_number, j.current_status, j.priority, j.created_at,
                   c.full_name as customer_name, c.primary_phone as customer_phone,
                   d.equipment_type, d.brand, d.model_name
            FROM service_jobs j
            JOIN customers c ON j.customer_id = c.id
            JOIN devices d ON j.device_id = d.id
            WHERE j.shop_id = ?
            ORDER BY j.created_at DESC LIMIT 6`,
      args: [shopId],
    });

    res.json({
      success: true,
      data: {
        jobs: {
          total: Number(j.total) || 0,
          active: (Number(j.intake_pending) || 0) + (Number(j.in_repair) || 0),
          intakePending: Number(j.intake_pending) || 0,
          inRepair: Number(j.in_repair) || 0,
          readyForDelivery: Number(j.ready_for_delivery) || 0,
          delivered: Number(j.delivered) || 0,
          unrepairable: Number(j.unrepairable) || 0,
        },
        finances: {
          totalInvoices: Number(f.total_invoices) || 0,
          totalBilled: Number(f.total_billed) || 0,
          totalCollected: Number(f.total_collected) || 0,
          totalOutstanding: Number(f.total_outstanding) || 0,
          totalGstCollected: Number(f.total_gst_collected) || 0,
        },
        inventory: {
          totalSkus: Number(inv.total_skus) || 0,
          totalUnitsInStock: Number(inv.total_units) || 0,
          stockValuation: Number(inv.stock_valuation) || 0,
          lowStockAlerts: Number(inv.low_stock_alerts) || 0,
        },
        crm: {
          totalCustomers: Number(crm.total_customers) || 0,
        },
        recentJobs: recentRes.rows,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Executive Summary (Detailed Business KPIs) ────────────────────
reportsRouter.get('/executive-summary', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();

    const result = await client.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM service_jobs WHERE shop_id = ?) as total_jobs,
              (SELECT COUNT(*) FROM service_jobs WHERE shop_id = ? AND current_status NOT IN ('DELIVERED','UNREPAIRABLE','CANCELLED')) as pending_jobs,
              (SELECT COUNT(*) FROM service_jobs WHERE shop_id = ? AND current_status IN ('REPAIR_DONE','REPAIR_COMPLETED','QUALITY_CHECK','READY_FOR_DELIVERY')) as completed_jobs,
              (SELECT COUNT(*) FROM service_jobs WHERE shop_id = ? AND current_status = 'DELIVERED') as delivered_jobs,
              (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE shop_id = ?) as total_revenue,
              (SELECT COALESCE(SUM(amount_paid), 0) FROM invoices WHERE shop_id = ?) as payments_collected,
              (SELECT COALESCE(SUM(balance_due), 0) FROM invoices WHERE shop_id = ?) as outstanding_balance,
              (SELECT COUNT(*) FROM users WHERE shop_id = ? AND is_active = 1) as technician_count`,
      args: [shopId, shopId, shopId, shopId, shopId, shopId, shopId, shopId],
    });

    const r = result.rows[0] as Record<string, unknown>;
    res.json({
      success: true,
      data: {
        totalJobs: Number(r.total_jobs) || 0,
        pendingJobs: Number(r.pending_jobs) || 0,
        completedJobs: Number(r.completed_jobs) || 0,
        deliveredJobs: Number(r.delivered_jobs) || 0,
        totalRevenue: Number(r.total_revenue) || 0,
        paymentsCollected: Number(r.payments_collected) || 0,
        outstandingBalance: Number(r.outstanding_balance) || 0,
        technicianCount: Number(r.technician_count) || 0,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Revenue Stats (Last 7 Days) ───────────────────────────────────
reportsRouter.get('/revenue', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();

    const result = await client.execute({
      sql: `SELECT
              date(created_at) as day,
              SUM(total_amount) as revenue,
              COUNT(*) as invoices
            FROM invoices
            WHERE shop_id = ? AND created_at >= date('now', '-7 days')
            GROUP BY date(created_at)
            ORDER BY day ASC`,
      args: [shopId],
    });

    res.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Equipment Failure Breakdown ───────────────────────────────────
reportsRouter.get('/failure-breakdown', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();

    const result = await client.execute({
      sql: `SELECT d.equipment_type, COUNT(j.id) as job_count
            FROM service_jobs j
            JOIN devices d ON j.device_id = d.id
            WHERE j.shop_id = ?
            GROUP BY d.equipment_type
            ORDER BY job_count DESC
            LIMIT 10`,
      args: [shopId],
    });

    res.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
