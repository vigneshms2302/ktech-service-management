import crypto from 'node:crypto';
import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken, requireSuperAdmin, hashPassword, verifyPassword, generateToken } from '../middleware/auth.ts';
import { encryptSecret, decryptSecret } from '../security/crypto.ts';
import { generateReadableTempPassword, resolvePublicAppUrl, buildResetUrl } from '../security/passwordUtils.ts';
import { validateBody } from '../middleware/validate.ts';
import { provisionShopSchema } from '../validation/schemas.ts';

export const adminRouter = Router();

// Protect all admin routes strictly for Vendor Super-Admin
adminRouter.use(authenticateToken, requireSuperAdmin);

function isTimestampPastDue(ts: unknown): boolean {
  if (!ts) return false;
  const parsed = new Date(String(ts)).getTime();
  return Number.isFinite(parsed) && parsed < Date.now();
}

function resolveEffectiveShopStatus(rawStatus: unknown, subscriptionEndsAt: unknown): 'ACTIVE' | 'FROZEN' | 'EXPIRED' {
  const status = String(rawStatus || 'ACTIVE').toUpperCase();
  if (status === 'FROZEN') return 'FROZEN';
  if (status === 'EXPIRED' || isTimestampPastDue(subscriptionEndsAt)) return 'EXPIRED';
  return 'ACTIVE';
}

function getDatabaseProviderLabel(): 'TURSO_LIBSQL_CLOUD' | 'REMOTE_DATABASE' | 'LOCAL_SQLITE' {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('libsql:') || dbUrl.includes('.turso.io')) return 'TURSO_LIBSQL_CLOUD';
  if (dbUrl) return 'REMOTE_DATABASE';
  return 'LOCAL_SQLITE';
}

// Helper to record administrative audit events
async function recordAdminAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  const client = getClient();
  await client.execute({
    sql: `
      INSERT INTO saas_admin_audit_logs (id, admin_id, action, target_entity_type, target_entity_id, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId,
      action,
      targetType,
      targetId,
      JSON.stringify(details),
      ipAddress || '127.0.0.1',
    ],
  });
}

// 1. Platform System Metrics (Single authoritative source synced with Analytics & Directories)
adminRouter.get('/metrics', async (_req, res) => {
  try {
    const client = getClient();
    const [
      shopsRes,
      jobsRes,
      activeJobsRes,
      usersRes,
      activeUsersRes,
      customersRes,
      devicesRes,
      invoicesAggRes,
      subRes,
      pendingClaimsRes,
      approvedClaimsRes,
      revRes,
      unreadAlertsRes,
    ] = await Promise.all([
      client.execute(`SELECT id, status, subscription_ends_at FROM shops`),
      client.execute(`SELECT COUNT(*) as count FROM service_jobs`),
      client.execute(`SELECT COUNT(*) as count FROM service_jobs WHERE current_status NOT IN ('DELIVERED', 'CANCELLED')`),
      client.execute(`SELECT COUNT(*) as count FROM users`),
      client.execute(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`),
      client.execute(`SELECT COUNT(*) as count FROM customers`),
      client.execute(`SELECT COUNT(*) as count FROM devices`),
      client.execute(`SELECT COALESCE(SUM(total_amount), 0) as gmv, COALESCE(SUM(amount_paid), 0) as collected FROM invoices WHERE is_void = 0`),
      client.execute(`SELECT shop_id, status, trial_ends_at, current_period_ends_at FROM saas_subscriptions`),
      client.execute(`SELECT COUNT(*) as count FROM saas_payment_claims WHERE status = 'PENDING'`),
      client.execute(`SELECT COUNT(*) as count FROM saas_payment_claims WHERE status = 'APPROVED'`),
      client.execute(`SELECT COALESCE(SUM(amount_inr), 0) as total FROM saas_payment_claims WHERE status = 'APPROVED'`),
      client.execute(`SELECT COUNT(*) as count FROM saas_notifications WHERE recipient_type = 'VENDOR_ADMIN' AND is_read = 0`),
    ]);

    let activeShops = 0;
    let frozenShops = 0;
    let expiredShops = 0;
    const effectiveShopStatusById = new Map<string, 'ACTIVE' | 'FROZEN' | 'EXPIRED'>();

    for (const row of shopsRes.rows) {
      const r = row as Record<string, unknown>;
      const eff = resolveEffectiveShopStatus(r.status, r.subscription_ends_at);
      effectiveShopStatusById.set(String(r.id), eff);
      if (eff === 'FROZEN') frozenShops++;
      else if (eff === 'EXPIRED') expiredShops++;
      else activeShops++;
    }

    let trialingShops = 0;
    let activeSubscriptions = 0;
    for (const row of subRes.rows) {
      const r = row as Record<string, unknown>;
      const shopEff = effectiveShopStatusById.get(String(r.shop_id));
      if (shopEff === 'FROZEN' || shopEff === 'EXPIRED') continue;
      if (r.status === 'TRIALING' && !isTimestampPastDue(r.trial_ends_at)) {
        trialingShops++;
      } else if (r.status === 'ACTIVE' && !isTimestampPastDue(r.current_period_ends_at)) {
        activeSubscriptions++;
      }
    }

    const invAgg = invoicesAggRes.rows[0] as Record<string, unknown>;
    const totalVerifiedRevenue = Number((revRes.rows[0] as Record<string, unknown>)?.total || 0);

    res.json({
      success: true,
      data: {
        totalShops: shopsRes.rows.length,
        activeShops,
        frozenShops,
        expiredShops,
        trialingShops,
        activeSubscriptions,
        pendingPaymentClaims: Number((pendingClaimsRes.rows[0] as Record<string, unknown>).count),
        approvedPaymentClaims: Number((approvedClaimsRes.rows[0] as Record<string, unknown>).count),
        totalVerifiedRevenueInr: totalVerifiedRevenue,
        totalJobs: Number((jobsRes.rows[0] as Record<string, unknown>).count),
        activeJobs: Number((activeJobsRes.rows[0] as Record<string, unknown>).count),
        totalUsers: Number((usersRes.rows[0] as Record<string, unknown>).count),
        activeUsers: Number((activeUsersRes.rows[0] as Record<string, unknown>).count),
        totalCustomers: Number((customersRes.rows[0] as Record<string, unknown>).count),
        totalDevices: Number((devicesRes.rows[0] as Record<string, unknown>).count),
        totalShopGmvInr: Number(invAgg?.gmv || 0),
        totalShopCollectedInr: Number(invAgg?.collected || 0),
        unreadNotifications: Number((unreadAlertsRes.rows[0] as Record<string, unknown>).count),
        databaseProvider: getDatabaseProviderLabel(),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. List All Tenant Shops (Search & Filter with Live Statuses, Usage & Revenue)
adminRouter.get('/shops', async (req, res) => {
  try {
    const { search, status } = req.query;
    const client = getClient();

    let query = `
      SELECT 
        s.*, 
        sub.status as subscription_status,
        sub.trial_ends_at,
        sub.current_period_ends_at,
        sub.is_complimentary,
        (SELECT u.username FROM users u WHERE u.shop_id = s.id AND u.role_id = 'ROLE_OWNER' ORDER BY u.created_at ASC LIMIT 1) as owner_username,
        (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id AND u.is_active = 1) as active_users_count,
        (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id) as total_users_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id) as total_jobs_count,
        (SELECT COUNT(*) FROM customers c WHERE c.shop_id = s.id) as total_customers_count,
        (SELECT COUNT(*) FROM devices d WHERE d.shop_id = s.id) as total_devices_count,
        (SELECT COALESCE(SUM(inv.total_amount), 0) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) as workshop_gmv_inr,
        (SELECT MAX(j.created_at) FROM service_jobs j WHERE j.shop_id = s.id) as last_activity_at
      FROM shops s 
      LEFT JOIN saas_subscriptions sub ON s.id = sub.shop_id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (s.name LIKE ? OR s.slug LIKE ? OR s.owner_name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)`;
      args.push(q, q, q, q, q);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await client.execute({ sql: query, args });

    const mapped = result.rows
      .map((row) => {
        const effectiveStatus = resolveEffectiveShopStatus(row.status, row.subscription_ends_at);
        let effectiveSubStatus = String(row.subscription_status || 'ACTIVE');
        if (effectiveStatus === 'FROZEN') effectiveSubStatus = 'SUSPENDED';
        else if (effectiveStatus === 'EXPIRED') effectiveSubStatus = 'EXPIRED';

        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          ownerName: row.owner_name,
          ownerUsername: row.owner_username || 'admin',
          phone: row.phone,
          email: row.email,
          gstin: row.gstin,
          address: row.address,
          city: row.city,
          state: row.state,
          pincode: row.pincode,
          status: effectiveStatus,
          subscriptionStatus: effectiveSubStatus,
          trialEndsAt: row.trial_ends_at,
          currentPeriodEndsAt: row.current_period_ends_at,
          isComplimentary: Boolean(row.is_complimentary),
          maxSeats: Number(row.max_seats),
          activeUsersCount: Number(row.active_users_count),
          totalUsersCount: Number(row.total_users_count),
          totalJobsCount: Number(row.total_jobs_count),
          totalCustomersCount: Number(row.total_customers_count),
          totalDevicesCount: Number(row.total_devices_count),
          workshopGmvInr: Number(row.workshop_gmv_inr || 0),
          lastActivityAt: row.last_activity_at || row.updated_at || row.created_at,
          subscriptionPlan: row.subscription_plan,
          subscriptionEndsAt: row.subscription_ends_at,
          createdAt: row.created_at,
        };
      })
      .filter((item) => (!status || status === 'ALL' ? true : item.status === String(status).toUpperCase()));

    res.json({
      success: true,
      data: mapped,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2b. Get Complete 360° Tenant Shop Dossier (Profile, Logins, Customers, Jobs, Invoices & Claims)
adminRouter.get('/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getClient();

    const query = `
      SELECT 
        s.*, 
        sub.status as subscription_status,
        sub.trial_ends_at,
        sub.current_period_starts_at,
        sub.current_period_ends_at,
        sub.is_complimentary,
        sub.complimentary_reason,
        (SELECT u.username FROM users u WHERE u.shop_id = s.id AND u.role_id = 'ROLE_OWNER' ORDER BY u.created_at ASC LIMIT 1) as owner_username,
        (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id AND u.is_active = 1) as active_users_count,
        (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id) as total_users_count,
        (SELECT COUNT(*) FROM customers c WHERE c.shop_id = s.id) as total_customers_count,
        (SELECT COUNT(*) FROM devices d WHERE d.shop_id = s.id) as total_devices_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id) as total_jobs_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id AND j.current_status NOT IN ('DELIVERED', 'CANCELLED')) as open_jobs_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id AND j.current_status = 'DELIVERED') as delivered_jobs_count,
        (SELECT COUNT(*) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) as total_invoices_count,
        (SELECT COALESCE(SUM(inv.total_amount), 0) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) as workshop_gmv_inr,
        (SELECT COALESCE(SUM(inv.amount_paid), 0) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) as collected_inr
      FROM shops s 
      LEFT JOIN saas_subscriptions sub ON s.id = sub.shop_id
      WHERE s.id = ? OR s.slug = ?
      LIMIT 1
    `;

    const result = await client.execute({ sql: query, args: [id, id] });
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const row = result.rows[0] as Record<string, unknown>;
    const shopId = String(row.id);
    const effectiveStatus = resolveEffectiveShopStatus(row.status, row.subscription_ends_at);
    let effectiveSubStatus = String(row.subscription_status || 'ACTIVE');
    if (effectiveStatus === 'FROZEN') effectiveSubStatus = 'SUSPENDED';
    else if (effectiveStatus === 'EXPIRED') effectiveSubStatus = 'EXPIRED';

    const [usersRes, customersRes, jobsRes, claimsRes] = await Promise.all([
      client.execute({
        sql: `
          SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.phone, u.pin_code,
                 u.is_active, u.encrypted_recovery_password, u.created_at, u.updated_at
          FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE u.shop_id = ?
          ORDER BY CASE WHEN u.role_id = 'ROLE_OWNER' THEN 0 ELSE 1 END, u.created_at ASC
        `,
        args: [shopId],
      }),
      client.execute({
        sql: `
          SELECT c.id, c.customer_code, c.full_name, c.primary_phone, c.secondary_phone, c.email, c.gstin, c.customer_type, c.created_at,
                 (SELECT COUNT(*) FROM devices d WHERE d.customer_id = c.id) as devices_count,
                 (SELECT COUNT(*) FROM service_jobs j WHERE j.customer_id = c.id) as jobs_count,
                 (SELECT COALESCE(SUM(inv.total_amount), 0) FROM invoices inv WHERE inv.customer_id = c.id AND inv.is_void = 0) as total_invoiced_inr,
                 (SELECT COALESCE(SUM(inv.amount_paid), 0) FROM invoices inv WHERE inv.customer_id = c.id AND inv.is_void = 0) as total_paid_inr
          FROM customers c
          WHERE c.shop_id = ?
          ORDER BY c.created_at DESC
          LIMIT 50
        `,
        args: [shopId],
      }),
      client.execute({
        sql: `
          SELECT j.id, j.job_number, j.service_category, j.current_status, j.priority, j.reported_issue,
                 j.estimated_cost, j.advance_deposit, j.created_at,
                 c.full_name as customer_name, c.primary_phone as customer_phone,
                 d.brand as device_brand, d.model_name as device_model, d.equipment_type
          FROM service_jobs j
          JOIN customers c ON j.customer_id = c.id
          JOIN devices d ON j.device_id = d.id
          WHERE j.shop_id = ?
          ORDER BY j.created_at DESC
          LIMIT 40
        `,
        args: [shopId],
      }),
      client.execute({
        sql: `
          SELECT id, amount_inr, upi_transaction_id, status, customer_notes, rejection_reason, created_at, reviewed_at
          FROM saas_payment_claims
          WHERE shop_id = ?
          ORDER BY created_at DESC
          LIMIT 20
        `,
        args: [shopId],
      }),
    ]);

    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        ownerName: row.owner_name,
        ownerUsername: row.owner_username || 'admin',
        phone: row.phone,
        email: row.email,
        gstin: row.gstin,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        upiId: row.upi_id,
        logoUrl: row.logo_url,
        status: effectiveStatus,
        subscriptionStatus: effectiveSubStatus,
        subscriptionPlan: row.subscription_plan,
        subscriptionEndsAt: row.subscription_ends_at,
        trialEndsAt: row.trial_ends_at,
        currentPeriodStartsAt: row.current_period_starts_at,
        currentPeriodEndsAt: row.current_period_ends_at,
        isComplimentary: Boolean(row.is_complimentary),
        complimentaryReason: row.complimentary_reason,
        maxSeats: Number(row.max_seats),
        activeUsersCount: Number(row.active_users_count),
        totalUsersCount: Number(row.total_users_count),
        totalCustomersCount: Number(row.total_customers_count),
        totalDevicesCount: Number(row.total_devices_count),
        totalJobsCount: Number(row.total_jobs_count),
        openJobsCount: Number(row.open_jobs_count),
        deliveredJobsCount: Number(row.delivered_jobs_count),
        totalInvoicesCount: Number(row.total_invoices_count),
        workshopGmvInr: Number(row.workshop_gmv_inr || 0),
        collectedInr: Number(row.collected_inr || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        users: usersRes.rows.map((u) => {
          const r = u as Record<string, unknown>;
          return {
            id: r.id,
            shopId,
            shopName: row.name,
            shopSlug: row.slug,
            username: r.username,
            fullName: r.full_name,
            roleId: r.role_id,
            roleName: r.role_name,
            phone: r.phone,
            pinCode: r.pin_code,
            isActive: Boolean(r.is_active),
            hasRecoverablePassword: Boolean(r.encrypted_recovery_password),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }),
        recentCustomers: customersRes.rows.map((c) => {
          const r = c as Record<string, unknown>;
          return {
            id: r.id,
            customerCode: r.customer_code,
            fullName: r.full_name,
            primaryPhone: r.primary_phone,
            secondaryPhone: r.secondary_phone,
            email: r.email,
            gstin: r.gstin,
            customerType: r.customer_type,
            devicesCount: Number(r.devices_count || 0),
            jobsCount: Number(r.jobs_count || 0),
            totalInvoicedInr: Number(r.total_invoiced_inr || 0),
            totalPaidInr: Number(r.total_paid_inr || 0),
            createdAt: r.created_at,
          };
        }),
        recentJobs: jobsRes.rows.map((j) => {
          const r = j as Record<string, unknown>;
          return {
            id: r.id,
            jobNumber: r.job_number,
            serviceCategory: r.service_category,
            currentStatus: r.current_status,
            priority: r.priority,
            reportedIssue: r.reported_issue,
            estimatedCost: Number(r.estimated_cost || 0),
            advanceDeposit: Number(r.advance_deposit || 0),
            customerName: r.customer_name,
            customerPhone: r.customer_phone,
            deviceLabel: `${r.device_brand} ${r.device_model} (${r.equipment_type})`,
            createdAt: r.created_at,
          };
        }),
        paymentClaims: claimsRes.rows.map((cl) => {
          const r = cl as Record<string, unknown>;
          return {
            id: r.id,
            amountInr: Number(r.amount_inr || 0),
            upiTransactionId: r.upi_transaction_id,
            status: r.status,
            customerNotes: r.customer_notes,
            rejectionReason: r.rejection_reason,
            createdAt: r.created_at,
            reviewedAt: r.reviewed_at,
          };
        }),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2b-ii. Edit Shop Profile, Seat Limits & Subscription Plan directly from Super-Admin
adminRouter.put('/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      ownerName,
      phone,
      email,
      gstin,
      address,
      city,
      state,
      pincode,
      maxSeats,
      subscriptionPlan,
    } = req.body as Record<string, unknown>;

    const client = getClient();
    const shopRes = await client.execute({
      sql: `SELECT id FROM shops WHERE id = ? OR slug = ? LIMIT 1`,
      args: [id, id],
    });
    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }
    const shopId = String(shopRes.rows[0].id);

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    const setStr = (col: string, val: unknown, transform?: (s: string) => string) => {
      if (val !== undefined) {
        updates.push(`${col} = ?`);
        const trimmed = val === null ? '' : String(val).trim();
        args.push(trimmed ? (transform ? transform(trimmed) : trimmed) : null);
      }
    };

    setStr('name', name);
    setStr('owner_name', ownerName);
    setStr('phone', phone);
    setStr('email', email);
    setStr('gstin', gstin, (s) => s.toUpperCase());
    setStr('address', address);
    setStr('city', city);
    setStr('state', state);
    setStr('pincode', pincode);
    setStr('subscription_plan', subscriptionPlan);

    if (maxSeats !== undefined) {
      const parsedSeats = Number(maxSeats);
      if (!Number.isFinite(parsedSeats) || parsedSeats < 1 || parsedSeats > 500) {
        res.status(400).json({ success: false, error: 'Max seats must be between 1 and 500.' });
        return;
      }
      updates.push('max_seats = ?');
      args.push(parsedSeats);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No shop fields supplied to update.' });
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(shopId);

    await client.execute({
      sql: `UPDATE shops SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    await recordAdminAudit(
      req.user!.userId,
      'SHOP_PROFILE_UPDATED',
      'SHOP',
      shopId,
      { updatedFields: Object.keys(req.body || {}) },
      req.ip
    );

    res.json({ success: true, message: 'Shop profile & licence limits updated successfully.' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2c. List Shop Staff & Owner Accounts (Never returns plaintext password — use explicit reveal or reset)
adminRouter.get('/shops/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getClient();

    const shopRes = await client.execute({
      sql: `SELECT id, name, slug FROM shops WHERE id = ? OR slug = ? LIMIT 1`,
      args: [id, id],
    });
    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }
    const shop = shopRes.rows[0] as Record<string, unknown>;

    const usersRes = await client.execute({
      sql: `
        SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.phone, u.pin_code,
               u.is_active, u.encrypted_recovery_password, u.created_at, u.updated_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.shop_id = ?
        ORDER BY CASE WHEN u.role_id = 'ROLE_OWNER' THEN 0 ELSE 1 END, u.created_at ASC
      `,
      args: [String(shop.id)],
    });

    res.json({
      success: true,
      data: {
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.slug,
        users: usersRes.rows.map((u) => {
          const row = u as Record<string, unknown>;
          return {
            id: row.id,
            shopId: shop.id,
            shopName: shop.name,
            shopSlug: shop.slug,
            username: row.username,
            fullName: row.full_name,
            roleId: row.role_id,
            roleName: row.role_name,
            phone: row.phone,
            pinCode: row.pin_code,
            isActive: Boolean(row.is_active),
            hasRecoverablePassword: Boolean(row.encrypted_recovery_password),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2d. Reset Shop Owner / Staff Credentials (Issues & Stores Recoverable Temporary Password + Optional PIN)
adminRouter.post('/shops/:id/reset-credentials', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, newPassword, newPin } = req.body as {
      userId?: string;
      newPassword?: string;
      newPin?: string;
    };
    const client = getClient();

    const shopRes = await client.execute({
      sql: `SELECT id, name, slug FROM shops WHERE id = ? OR slug = ? LIMIT 1`,
      args: [id, id],
    });
    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }
    const shop = shopRes.rows[0] as Record<string, unknown>;
    const shopId = String(shop.id);

    const userRes = userId
      ? await client.execute({
          sql: `SELECT id, username, full_name, phone, pin_code, role_id FROM users WHERE id = ? AND shop_id = ? LIMIT 1`,
          args: [userId, shopId],
        })
      : await client.execute({
          sql: `SELECT id, username, full_name, phone, pin_code, role_id FROM users WHERE shop_id = ? ORDER BY CASE WHEN role_id = 'ROLE_OWNER' THEN 0 ELSE 1 END, created_at ASC LIMIT 1`,
          args: [shopId],
        });

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No matching user found for this shop.' });
      return;
    }
    const targetUser = userRes.rows[0] as Record<string, unknown>;

    const trimmedPass = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (trimmedPass && trimmedPass.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      return;
    }
    const plainTempPassword = trimmedPass || generateReadableTempPassword(10);
    const passwordHash = hashPassword(plainTempPassword);
    const recoveryCipher = encryptSecret(plainTempPassword);

    const trimmedPin = typeof newPin === 'string' ? newPin.trim() : '';
    if (trimmedPin && !/^\d{4,6}$/.test(trimmedPin)) {
      res.status(400).json({ success: false, error: 'Quick PIN must be 4 to 6 numeric digits.' });
      return;
    }

    const nextPin = trimmedPin || String(targetUser.pin_code || '1234');

    await client.execute({
      sql: `UPDATE users SET password_hash = ?, encrypted_recovery_password = ?, pin_code = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?`,
      args: [passwordHash, recoveryCipher, nextPin, String(targetUser.id), shopId],
    });

    await recordAdminAudit(
      req.user!.userId,
      'SHOP_CREDENTIALS_RESET',
      'USER',
      String(targetUser.id),
      { shopId, shopSlug: shop.slug, username: targetUser.username, pinUpdated: Boolean(trimmedPin) },
      req.ip
    );

    res.json({
      success: true,
      message: `New credentials saved & ready for @${targetUser.username}.`,
      data: {
        shopId,
        shopName: shop.name,
        shopSlug: shop.slug,
        userId: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.full_name,
        phone: targetUser.phone,
        temporaryPassword: plainTempPassword,
        pinCode: nextPin,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2e. Safely Delete a Tenant Shop & All Scoped Data (Useful for Cleaning Up Test/Demo Shops)
adminRouter.delete('/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getClient();

    const shopRes = await client.execute({
      sql: `SELECT id, name, slug FROM shops WHERE id = ? OR slug = ? LIMIT 1`,
      args: [id, id],
    });
    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const shop = shopRes.rows[0] as Record<string, unknown>;
    const shopId = String(shop.id);

    if (shopId === 'shop_ktech') {
      res.status(400).json({ success: false, error: 'The flagship demonstration shop (ktech) cannot be deleted.' });
      return;
    }

    // Delete in strict dependency order so deletion succeeds with or without ON DELETE CASCADE over HTTP
    const orderedTables = [
      'invoice_items',
      'payments',
      'invoices',
      'quotation_approvals',
      'quotation_items',
      'quotations',
      'job_status_history',
      'job_parts',
      'job_services',
      'job_diagnosis',
      'job_inspections',
      'job_notes',
      'job_repair_activities',
      'job_checklists',
      'data_recovery_jobs',
      'pc_builds',
      'warranties',
      'service_jobs',
      'device_photos',
      'devices',
      'customer_addresses',
      'customers',
      'inventory_transactions',
      'salvage_parts',
      'salvage_devices',
      'inventory_items',
      'inventory_categories',
      'inventory_locations',
      'suppliers',
      'products',
      'audit_logs',
      'shop_settings',
      'saas_payment_claims',
      'saas_subscriptions',
      'users',
    ];

    const statements = [
      ...orderedTables.map((tbl) => ({
        sql: `DELETE FROM ${tbl} WHERE shop_id = ?`,
        args: [shopId],
      })),
      {
        sql: `DELETE FROM saas_notifications WHERE recipient_type = 'SHOP_OWNER' AND recipient_id = ?`,
        args: [shopId],
      },
      {
        sql: `DELETE FROM shops WHERE id = ?`,
        args: [shopId],
      },
    ];

    await client.batch(statements, 'write');

    await recordAdminAudit(
      req.user!.userId,
      'SHOP_DELETED',
      'SHOP',
      shopId,
      { name: shop.name, slug: shop.slug },
      req.ip
    );

    res.json({
      success: true,
      message: `Shop "${shop.name}" (${shop.slug}) and all scoped records have been permanently deleted.`,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
adminRouter.post('/shops', validateBody(provisionShopSchema), async (req, res) => {
  try {
    const {
      name,
      slug,
      ownerName,
      phone,
      email,
      gstin,
      address,
      city,
      state,
      pincode,
      maxSeats,
      subscriptionPlan,
      subscriptionMonths,
      ownerUsername,
      ownerPassword,
      ownerPin,
    } = req.body;

    const client = getClient();
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const shopId = `shop_${cleanSlug}`;

    // Verify slug uniqueness
    const checkRes = await client.execute({
      sql: `SELECT id FROM shops WHERE slug = ? OR id = ?`,
      args: [cleanSlug, shopId],
    });

    if (checkRes.rows.length > 0) {
      res.status(400).json({ success: false, error: `Shop with slug "${cleanSlug}" already exists.` });
      return;
    }

    const months = Number(subscriptionMonths) || 12;
    const endsAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create Shop Record
    await client.execute({
      sql: `INSERT INTO shops (id, name, slug, owner_name, phone, email, gstin, address, city, state, pincode, status, max_seats, subscription_plan, subscription_ends_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      args: [
        shopId,
        name.trim(),
        cleanSlug,
        ownerName.trim(),
        phone.trim(),
        email ? email.trim() : null,
        gstin ? gstin.trim().toUpperCase() : null,
        address ? address.trim() : 'Shop Address',
        city ? city.trim() : 'Coimbatore',
        state ? state.trim() : 'Tamil Nadu',
        pincode ? pincode.trim() : null,
        Number(maxSeats) || 5,
        subscriptionPlan || 'PRO_ANNUAL',
        endsAt,
      ],
    });

    // 2. Create Subscription Record
    await client.execute({
      sql: `INSERT INTO saas_subscriptions (id, shop_id, plan_id, status, trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at)
            VALUES (?, ?, 'plan_pro_annual', 'ACTIVE', NULL, NULL, CURRENT_TIMESTAMP, ?)`,
      args: [`sub_${cleanSlug}`, shopId, endsAt],
    });

    // 3. Create Initial Shop Owner User
    const ownerUserId = `usr_${cleanSlug}_owner`;
    const plainPassword = ownerPassword && ownerPassword.trim() ? ownerPassword.trim() : 'shop123';
    const passwordHash = hashPassword(plainPassword);
    const recoveryCipher = encryptSecret(plainPassword);
    const pin = ownerPin && ownerPin.trim() ? ownerPin.trim() : '1234';

    await client.execute({
      sql: `INSERT INTO users (id, shop_id, username, password_hash, encrypted_recovery_password, pin_code, full_name, role_id, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ROLE_OWNER', ?, 1)`,
      args: [
        ownerUserId,
        shopId,
        ownerUsername ? ownerUsername.trim().toLowerCase() : 'admin',
        passwordHash,
        recoveryCipher,
        pin,
        ownerName.trim(),
        phone.trim(),
      ],
    });

    // Audit log
    await recordAdminAudit(
      req.user!.userId,
      'SHOP_PROVISIONED',
      'SHOP',
      shopId,
      { name, slug: cleanSlug, ownerName, months },
      req.ip
    );

    res.json({
      success: true,
      message: `Shop "${name}" provisioned successfully with Owner account.`,
      data: {
        shopId,
        slug: cleanSlug,
        ownerUsername: ownerUsername || 'admin',
        subscriptionEndsAt: endsAt,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Update Shop Status (Freeze, Suspend, Reactivate)
adminRouter.put('/shops/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, maxSeats } = req.body;
    const client = getClient();

    const allowedStatuses = ['ACTIVE', 'FROZEN', 'EXPIRED'];
    if (status && !allowedStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
      return;
    }

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (status) {
      updates.push('status = ?');
      args.push(status);
    }

    if (maxSeats) {
      updates.push('max_seats = ?');
      args.push(Number(maxSeats));
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      args.push(id);
      await client.execute({
        sql: `UPDATE shops SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });

      // Synchronize saas_subscriptions status
      if (status) {
        await client.execute({
          sql: `UPDATE saas_subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ?`,
          args: [status === 'FROZEN' ? 'SUSPENDED' : status, id],
        });
      }

      await recordAdminAudit(
        req.user!.userId,
        `SHOP_STATUS_${status || 'UPDATED'}`,
        'SHOP',
        id,
        { status, reason, maxSeats },
        req.ip
      );
    }

    res.json({ success: true, message: `Shop updated successfully.` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Extend Free Trial or Paid Period (+7, +14, +30 Days)
adminRouter.post('/shops/:id/extend-trial', async (req, res) => {
  try {
    const { id } = req.params;
    const { additionalDays = 7, reason } = req.body;
    const days = Number(additionalDays);
    if (!Number.isFinite(days) || days <= 0 || days > 3650) {
      res.status(400).json({ success: false, error: 'additionalDays must be a valid positive number of days.' });
      return;
    }

    const client = getClient();
    const shopRes = await client.execute({
      sql: `SELECT id, subscription_plan, status, subscription_ends_at FROM shops WHERE id = ? OR slug = ?`,
      args: [id, id],
    });
    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const shopRow = shopRes.rows[0] as Record<string, unknown>;
    const resolvedShopId = String(shopRow.id);

    const subRes = await client.execute({
      sql: `SELECT id, status, trial_ends_at, current_period_ends_at FROM saas_subscriptions WHERE shop_id = ?`,
      args: [resolvedShopId],
    });

    const sub = subRes.rows[0] as Record<string, unknown> | undefined;
    const nowMs = Date.now();
    const candidateMs = [
      nowMs,
      sub?.trial_ends_at ? new Date(String(sub.trial_ends_at)).getTime() : 0,
      sub?.current_period_ends_at ? new Date(String(sub.current_period_ends_at)).getTime() : 0,
      shopRow.subscription_ends_at ? new Date(String(shopRow.subscription_ends_at)).getTime() : 0,
    ].filter((ms) => Number.isFinite(ms));

    const baseMs = Math.max(...candidateMs);
    const newEnd = new Date(baseMs + days * 24 * 60 * 60 * 1000).toISOString();
    const nextSubStatus = sub && String(sub.status) === 'ACTIVE' ? 'ACTIVE' : 'TRIALING';

    if (sub) {
      await client.execute({
        sql: `
          UPDATE saas_subscriptions
          SET trial_ends_at = CASE WHEN ? = 'TRIALING' THEN ? ELSE trial_ends_at END,
              current_period_ends_at = ?,
              status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE shop_id = ?
        `,
        args: [nextSubStatus, newEnd, newEnd, nextSubStatus, resolvedShopId],
      });
    } else {
      const planRes = await client.execute({
        sql: `SELECT id FROM saas_plans WHERE code = ? OR id = ? LIMIT 1`,
        args: [String(shopRow.subscription_plan || 'PRO_ANNUAL'), String(shopRow.subscription_plan || 'plan_pro_annual')],
      });
      const resolvedPlanId = String(planRes.rows[0]?.id || 'plan_pro_annual');
      await client.execute({
        sql: `
          INSERT INTO saas_subscriptions (id, shop_id, plan_id, status, trial_starts_at, trial_ends_at, current_period_ends_at)
          VALUES (?, ?, ?, 'TRIALING', CURRENT_TIMESTAMP, ?, ?)
        `,
        args: [`sub_${crypto.randomUUID()}`, resolvedShopId, resolvedPlanId, newEnd, newEnd],
      });
    }

    await client.execute({
      sql: `UPDATE shops SET status = 'ACTIVE', subscription_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newEnd, resolvedShopId],
    });

    await recordAdminAudit(
      req.user!.userId,
      'TRIAL_EXTENDED',
      'SHOP',
      resolvedShopId,
      { additionalDays: days, newEnd, preservedStatus: nextSubStatus, reason: reason || 'Super Admin extended subscription/trial' },
      req.ip
    );

    res.json({
      success: true,
      message: `Access extended by ${days} days. New end date: ${newEnd}`,
      data: { shopId: resolvedShopId, trialEndsAt: newEnd, status: nextSubStatus },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. Grant Complimentary Access
adminRouter.post('/shops/:id/grant-complimentary', async (req, res) => {
  try {
    const { id } = req.params;
    const { months = 3, reason } = req.body;
    const client = getClient();

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'A mandatory reason is required to grant complimentary access.' });
      return;
    }

    const endsAt = new Date(Date.now() + Number(months) * 30 * 24 * 60 * 60 * 1000).toISOString();

    await client.execute({
      sql: `
        UPDATE saas_subscriptions
        SET status = 'ACTIVE', current_period_starts_at = CURRENT_TIMESTAMP, current_period_ends_at = ?,
            is_complimentary = 1, complimentary_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE shop_id = ?
      `,
      args: [endsAt, reason.trim(), id],
    });

    await client.execute({
      sql: `UPDATE shops SET status = 'ACTIVE', subscription_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [endsAt, id],
    });

    await recordAdminAudit(
      req.user!.userId,
      'COMPLIMENTARY_ACCESS_GRANTED',
      'SHOP',
      id,
      { months, endsAt, reason: reason.trim() },
      req.ip
    );

    res.json({
      success: true,
      message: `Complimentary access granted for ${months} months.`,
      data: { subscriptionEndsAt: endsAt },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 7. Manual Payment Verification Queue (Inspect Claims)
adminRouter.get('/payments', async (req, res) => {
  try {
    const { status = 'ALL', search } = req.query;
    const client = getClient();

    let query = `
      SELECT 
        c.*, 
        s.name as shop_name,
        s.slug as shop_slug,
        s.owner_name,
        s.phone as shop_phone,
        p.name as plan_name,
        p.code as plan_code,
        va.full_name as reviewed_by_name
      FROM saas_payment_claims c
      JOIN shops s ON c.shop_id = s.id
      JOIN saas_plans p ON c.plan_id = p.id
      LEFT JOIN vendor_admins va ON c.reviewed_by = va.id
      WHERE 1=1
    `;
    const args: string[] = [];

    if (status && status !== 'ALL') {
      query += ` AND c.status = ?`;
      args.push(String(status));
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (c.upi_transaction_id LIKE ? OR c.id LIKE ? OR s.name LIKE ? OR s.owner_name LIKE ?)`;
      args.push(q, q, q, q);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await client.execute({ sql: query, args });

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        shopId: row.shop_id,
        shopName: row.shop_name,
        shopSlug: row.shop_slug,
        ownerName: row.owner_name,
        shopPhone: row.shop_phone,
        planName: row.plan_name,
        amountInr: Number(row.amount_inr),
        upiTransactionId: row.upi_transaction_id,
        evidenceFilePath: row.evidence_file_path,
        customerNotes: row.customer_notes,
        status: row.status,
        reviewedByName: row.reviewed_by_name,
        reviewedAt: row.reviewed_at,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 8. Super-Admin Approve Payment & Activate Annual Subscription (1-Click Safe Activation)
adminRouter.post('/payments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getClient();
    const adminId = req.user!.userId;

    // Fetch claim
    const claimRes = await client.execute({
      sql: `SELECT * FROM saas_payment_claims WHERE id = ?`,
      args: [id],
    });

    if (claimRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Payment claim not found.' });
      return;
    }

    const claim = claimRes.rows[0] as Record<string, unknown>;

    if (claim.status === 'APPROVED') {
      res.status(400).json({ success: false, error: 'Payment claim has already been approved and activated.' });
      return;
    }

    // Determine annual period start & end date (365 days)
    // If shop currently has active subscription in future, extend from that end date; else start from today.
    const subRes = await client.execute({
      sql: `SELECT * FROM saas_subscriptions WHERE shop_id = ?`,
      args: [String(claim.shop_id)],
    });

    let baseDate = new Date();
    if (subRes.rows.length > 0) {
      const existingSub = subRes.rows[0] as Record<string, unknown>;
      if (existingSub.status === 'ACTIVE' && existingSub.current_period_ends_at) {
        const currEnd = new Date(String(existingSub.current_period_ends_at));
        if (currEnd > baseDate) {
          baseDate = currEnd;
        }
      }
    }

    const periodStartsAt = new Date().toISOString();
    const periodEndsAt = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Execute approval, subscription update, shop status unfreeze, and notification in a single atomic transaction
    await client.batch([
      {
        sql: `
          UPDATE saas_payment_claims 
          SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'PENDING'
        `,
        args: [adminId, id],
      },
      {
        sql: `
          INSERT INTO saas_subscriptions (
            id, shop_id, plan_id, status, trial_starts_at, trial_ends_at,
            current_period_starts_at, current_period_ends_at, is_complimentary
          ) VALUES (?, ?, ?, 'ACTIVE', NULL, NULL, ?, ?, 0)
          ON CONFLICT(shop_id) DO UPDATE SET
            plan_id = excluded.plan_id,
            status = 'ACTIVE',
            current_period_starts_at = excluded.current_period_starts_at,
            current_period_ends_at = excluded.current_period_ends_at,
            is_complimentary = 0,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [`sub_${claim.shop_id}`, String(claim.shop_id), String(claim.plan_id), periodStartsAt, periodEndsAt],
      },
      {
        sql: `UPDATE shops SET status = 'ACTIVE', subscription_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [periodEndsAt, String(claim.shop_id)],
      },
      {
        sql: `
          INSERT INTO saas_notifications (id, recipient_type, recipient_id, channel, title, message)
          VALUES (?, 'SHOP_OWNER', ?, 'IN_APP', 'Annual Subscription Activated! 🎉', ?)
        `,
        args: [
          `notif_${Date.now()}`,
          String(claim.shop_id),
          `Your GPay payment (${claim.upi_transaction_id}) for ₹${claim.amount_inr} has been verified and approved. Your annual subscription is active until ${new Date(periodEndsAt).toLocaleDateString()}.`,
        ],
      },
    ], 'write');

    // 5. Record Admin Audit Trail
    await recordAdminAudit(
      adminId,
      'PAYMENT_CLAIM_APPROVED',
      'PAYMENT_CLAIM',
      id,
      {
        shopId: claim.shop_id,
        amountInr: claim.amount_inr,
        upiTransactionId: claim.upi_transaction_id,
        activatedUntil: periodEndsAt,
      },
      req.ip
    );

    res.json({
      success: true,
      message: `Payment verified successfully! Annual subscription activated until ${new Date(periodEndsAt).toLocaleDateString()}.`,
      data: {
        claimId: id,
        status: 'APPROVED',
        periodEndsAt,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 9. Super-Admin Reject Payment Claim
adminRouter.post('/payments/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const client = getClient();
    const adminId = req.user!.userId;

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'A mandatory rejection reason is required.' });
      return;
    }

    const claimRes = await client.execute({
      sql: `SELECT * FROM saas_payment_claims WHERE id = ?`,
      args: [id],
    });

    if (claimRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Payment claim not found.' });
      return;
    }

    const claim = claimRes.rows[0] as Record<string, unknown>;

    await client.execute({
      sql: `
        UPDATE saas_payment_claims
        SET status = 'REJECTED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
            rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [adminId, reason.trim(), id],
    });

    // Notify Shop Owner
    await client.execute({
      sql: `
        INSERT INTO saas_notifications (id, recipient_type, recipient_id, channel, title, message)
        VALUES (?, 'SHOP_OWNER', ?, 'IN_APP', 'Payment Claim Update', ?)
      `,
      args: [
        `notif_${Date.now()}`,
        String(claim.shop_id),
        `Your payment claim (${claim.upi_transaction_id}) for ₹${claim.amount_inr} could not be verified. Reason: ${reason.trim()}. Please submit a corrected reference or contact support.`,
      ],
    });

    // Record Audit
    await recordAdminAudit(
      adminId,
      'PAYMENT_CLAIM_REJECTED',
      'PAYMENT_CLAIM',
      id,
      {
        shopId: claim.shop_id,
        amountInr: claim.amount_inr,
        upiTransactionId: claim.upi_transaction_id,
        reason: reason.trim(),
      },
      req.ip
    );

    res.json({
      success: true,
      message: 'Payment claim marked as rejected.',
      data: { claimId: id, status: 'REJECTED' },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 10. Platform Settings (Configure GPay QR, UPI ID, Annual Price)
const SETTINGS_ALIAS_MAP: Record<string, string> = {
  upi_id: 'payment.upi_id',
  payee_name: 'payment.payee_name',
  annual_fee_inr: 'payment.annual_price_inr',
  annual_price_inr: 'payment.annual_price_inr',
  qr_image_url: 'payment.qr_image_url',
  trial_days: 'trial.duration_days',
  support_phone: 'support.phone',
  support_email: 'support.email',
};

adminRouter.get('/settings', async (_req, res) => {
  try {
    const client = getClient();
    const result = await client.execute(`SELECT * FROM saas_platform_settings ORDER BY category, key`);
    const rows = (result.rows as unknown as Array<{ key: string; value: string; category?: string }>).map((r) => ({ ...r }));

    const settingsMap: Record<string, string> = {};
    for (const row of rows) {
      settingsMap[String(row.key)] = String(row.value);
    }

    // Include friendly aliases for UI convenience
    const aliasEntries = [
      { key: 'upi_id', value: settingsMap['payment.upi_id'] || '', category: 'PAYMENT' },
      { key: 'payee_name', value: settingsMap['payment.payee_name'] || '', category: 'PAYMENT' },
      { key: 'annual_fee_inr', value: settingsMap['payment.annual_price_inr'] || '', category: 'PAYMENT' },
      { key: 'trial_days', value: settingsMap['trial.duration_days'] || '', category: 'TRIAL' },
      { key: 'support_phone', value: settingsMap['support.phone'] || '', category: 'SUPPORT' },
      { key: 'support_email', value: settingsMap['support.email'] || '', category: 'SUPPORT' },
    ];

    res.json({ success: true, data: [...rows, ...aliasEntries] });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

adminRouter.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body; // Array of { key, value }
    const client = getClient();

    if (!Array.isArray(settings)) {
      res.status(400).json({ success: false, error: 'Expected settings array of key-value objects.' });
      return;
    }

    // Deduplicate by canonical key so stale canonical+alias pairs cannot revert an edit
    const deduped = new Map<string, { value: string; fromAlias: boolean }>();
    for (const item of settings) {
      if (item?.key && item.value !== undefined && item.value !== null) {
        const rawKey = String(item.key);
        const canonicalKey = SETTINGS_ALIAS_MAP[rawKey] || rawKey;
        const fromAlias = Object.prototype.hasOwnProperty.call(SETTINGS_ALIAS_MAP, rawKey);
        const existing = deduped.get(canonicalKey);
        if (!existing || (fromAlias && !existing.fromAlias) || fromAlias === existing.fromAlias) {
          deduped.set(canonicalKey, { value: String(item.value).trim(), fromAlias });
        }
      }
    }

    for (const [canonicalKey, entry] of deduped.entries()) {
      await client.execute({
        sql: `
          INSERT INTO saas_platform_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [canonicalKey, entry.value],
      });
    }

    const updatedMap = Object.fromEntries(Array.from(deduped.entries()).map(([k, v]) => [k, v.value]));

    await recordAdminAudit(
      req.user!.userId,
      'PLATFORM_SETTINGS_UPDATED',
      'SETTINGS',
      'GLOBAL',
      { updatedKeys: Array.from(deduped.keys()) },
      req.ip
    );

    res.json({ success: true, message: 'Commercial & UPI settings saved successfully.', data: updatedMap });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 11. Plans Management
adminRouter.get('/plans', async (_req, res) => {
  try {
    const client = getClient();
    const result = await client.execute(`SELECT * FROM saas_plans ORDER BY price_inr ASC`);
    res.json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        price_inr: Number(r.price_inr),
        features: JSON.parse(String(r.features_json || '[]')),
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

adminRouter.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, priceInr, maxSeats, features } = req.body;
    const client = getClient();

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (name) {
      updates.push('name = ?');
      args.push(name.trim());
    }

    if (priceInr !== undefined) {
      updates.push('price_inr = ?');
      args.push(Number(priceInr));
    }

    if (maxSeats !== undefined) {
      updates.push('max_seats = ?');
      args.push(Number(maxSeats));
    }

    if (features && Array.isArray(features)) {
      updates.push('features_json = ?');
      args.push(JSON.stringify(features));
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      args.push(id);
      await client.execute({
        sql: `UPDATE saas_plans SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });

      await recordAdminAudit(
        req.user!.userId,
        'PLAN_UPDATED',
        'PLAN',
        id,
        { name, priceInr, maxSeats },
        req.ip
      );
    }

    res.json({ success: true, message: 'Plan updated successfully.' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 12. Super-Admin Platform Audit Logs
adminRouter.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const client = getClient();

    const result = await client.execute({
      sql: `
        SELECT l.*, va.full_name as admin_name, va.username as admin_username
        FROM saas_admin_audit_logs l
        JOIN vendor_admins va ON l.admin_id = va.id
        ORDER BY l.created_at DESC
        LIMIT ?
      `,
      args: [Number(limit)],
    });

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        adminName: row.admin_name,
        adminUsername: row.admin_username,
        action: row.action,
        targetEntityType: row.target_entity_type,
        targetEntityId: row.target_entity_id,
        details: row.details_json ? JSON.parse(String(row.details_json)) : {},
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 13. Super-Admin Notifications & Public Inquiries Queue
adminRouter.get('/notifications', async (req, res) => {
  try {
    const unreadOnly = String(req.query.unreadOnly || '') === 'true';
    const client = getClient();

    const rowsRes = await client.execute({
      sql: `
        SELECT id, recipient_type, recipient_id, channel, title, message, is_read, metadata_json, created_at
        FROM saas_notifications
        WHERE recipient_type = 'VENDOR_ADMIN' ${unreadOnly ? 'AND is_read = 0' : ''}
        ORDER BY is_read ASC, created_at DESC
        LIMIT 50
      `,
      args: [],
    });

    const unreadCountRes = await client.execute(
      `SELECT COUNT(*) as total FROM saas_notifications WHERE recipient_type = 'VENDOR_ADMIN' AND is_read = 0`
    );

    const safeParseMetadata = (raw: unknown) => {
      if (!raw) return {};
      try {
        return JSON.parse(String(raw));
      } catch {
        return {};
      }
    };

    res.json({
      success: true,
      unreadCount: Number(unreadCountRes.rows[0]?.total || 0),
      data: rowsRes.rows.map((row) => ({
        id: String(row.id),
        recipientType: String(row.recipient_type),
        recipientId: String(row.recipient_id),
        channel: String(row.channel || 'IN_APP'),
        title: String(row.title),
        message: String(row.message),
        isRead: Boolean(row.is_read),
        metadata: safeParseMetadata(row.metadata_json),
        createdAt: String(row.created_at),
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

adminRouter.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getClient();

    if (id === 'mark-all-read') {
      await client.execute(
        `UPDATE saas_notifications SET is_read = 1 WHERE recipient_type = 'VENDOR_ADMIN' AND is_read = 0`
      );
      res.json({ success: true, message: 'All vendor notifications marked as read.' });
      return;
    }

    const result = await client.execute({
      sql: `UPDATE saas_notifications SET is_read = 1 WHERE id = ? AND recipient_type = 'VENDOR_ADMIN'`,
      args: [id],
    });
    if ((result.rowsAffected ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Notification not found.' });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Shared helper to resolve a shop by primary ID or URL slug
async function findShopByIdOrSlug(idOrSlug: string): Promise<Record<string, unknown> | null> {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT id, name, slug, status, subscription_ends_at FROM shops WHERE id = ? OR slug = ? LIMIT 1`,
    args: [idOrSlug, idOrSlug],
  });
  return res.rows.length > 0 ? (res.rows[0] as Record<string, unknown>) : null;
}

// Shared mapper for cross-tenant shop login directory entries (never emits ciphertext/hashes)
function mapShopUserRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    shopName: String(row.shop_name || ''),
    shopSlug: String(row.shop_slug || ''),
    shopStatus: resolveEffectiveShopStatus(row.shop_status, row.shop_subscription_ends_at),
    username: String(row.username),
    fullName: String(row.full_name),
    roleId: String(row.role_id),
    roleName: String(row.role_name || row.role_id),
    phone: row.phone ? String(row.phone) : null,
    pinCode: row.pin_code ? String(row.pin_code) : null,
    isActive: Boolean(row.is_active),
    hasRecoverablePassword: Boolean(row.encrypted_recovery_password),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

// 9. Global Shop Logins Directory across ALL Tenant Shops
adminRouter.get('/logins', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const shopId = typeof req.query.shopId === 'string' ? req.query.shopId.trim() : '';
    const roleId = typeof req.query.roleId === 'string' ? req.query.roleId.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';

    const client = getClient();
    const conditions: string[] = [];
    const args: Array<string | number> = [];

    if (shopId && shopId !== 'ALL') {
      conditions.push('(u.shop_id = ? OR s.slug = ?)');
      args.push(shopId, shopId);
    }

    if (roleId && roleId !== 'ALL') {
      conditions.push('u.role_id = ?');
      args.push(roleId);
    }

    if (status === 'ACTIVE') {
      conditions.push('u.is_active = 1');
    } else if (status === 'DISABLED' || status === 'INACTIVE') {
      conditions.push('u.is_active = 0');
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        `(LOWER(u.username) LIKE ? OR LOWER(u.full_name) LIKE ? OR COALESCE(u.phone, '') LIKE ? OR LOWER(s.name) LIKE ? OR LOWER(s.slug) LIKE ?)`
      );
      args.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rowsRes = await client.execute({
      sql: `
        SELECT
          u.id, u.shop_id, u.username, u.full_name, u.role_id, u.phone, u.pin_code,
          u.is_active, u.encrypted_recovery_password, u.created_at, u.updated_at,
          s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status,
          s.subscription_ends_at AS shop_subscription_ends_at,
          r.name AS role_name
        FROM users u
        INNER JOIN shops s ON u.shop_id = s.id
        LEFT JOIN roles r ON u.role_id = r.id
        ${whereClause}
        ORDER BY
          CASE WHEN u.role_id = 'ROLE_OWNER' THEN 0 ELSE 1 END ASC,
          s.name ASC,
          u.created_at DESC
      `,
      args,
    });

    res.json({
      success: true,
      data: rowsRes.rows.map((r) => mapShopUserRow(r as Record<string, unknown>)),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 10. Create a New User Login inside any Shop
adminRouter.post('/shops/:id/users', async (req, res) => {
  try {
    const shop = await findShopByIdOrSlug(req.params.id);
    if (!shop) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const shopId = String(shop.id);
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const roleId = typeof req.body?.roleId === 'string' && req.body.roleId.trim() ? req.body.roleId.trim() : 'ROLE_TECHNICIAN';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const rawPin = typeof req.body?.pinCode === 'string' ? req.body.pinCode.trim() : '';

    if (!/^[a-z0-9._-]{2,40}$/.test(rawUsername)) {
      res.status(400).json({
        success: false,
        error: 'Username must be 2–40 lowercase characters using letters, numbers, dots, underscores, or hyphens.',
      });
      return;
    }

    if (fullName.length < 2) {
      res.status(400).json({ success: false, error: 'Full name is required (minimum 2 characters).' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
      return;
    }

    if (rawPin && !/^\d{4,6}$/.test(rawPin)) {
      res.status(400).json({ success: false, error: 'Quick PIN must be 4 to 6 numeric digits.' });
      return;
    }

    const client = getClient();

    const roleRes = await client.execute({
      sql: `SELECT id, name FROM roles WHERE id = ? LIMIT 1`,
      args: [roleId],
    });
    if (roleRes.rows.length === 0) {
      res.status(400).json({ success: false, error: `Invalid roleId: ${roleId}.` });
      return;
    }
    const roleName = String((roleRes.rows[0] as Record<string, unknown>).name || roleId);

    const dupRes = await client.execute({
      sql: `SELECT id FROM users WHERE shop_id = ? AND LOWER(username) = LOWER(?) LIMIT 1`,
      args: [shopId, rawUsername],
    });
    if (dupRes.rows.length > 0) {
      res.status(409).json({ success: false, error: `Username "@${rawUsername}" already exists in this shop.` });
      return;
    }

    const newUserId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = hashPassword(password);
    const recoveryCipher = encryptSecret(password);
    const pinToStore = rawPin || null;

    await client.execute({
      sql: `
        INSERT INTO users (id, shop_id, username, password_hash, encrypted_recovery_password, pin_code, full_name, role_id, phone, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      args: [newUserId, shopId, rawUsername, passwordHash, recoveryCipher, pinToStore, fullName, roleId, phone || null],
    });

    await recordAdminAudit(
      req.user!.userId,
      'SHOP_USER_CREATED',
      'USER',
      newUserId,
      { shopId, shopSlug: shop.slug, username: rawUsername, roleId },
      req.ip
    );

    const createdRes = await client.execute({
      sql: `
        SELECT
          u.id, u.shop_id, u.username, u.full_name, u.role_id, u.phone, u.pin_code,
          u.is_active, u.encrypted_recovery_password, u.created_at, u.updated_at,
          ? AS shop_name, ? AS shop_slug, ? AS shop_status, ? AS shop_subscription_ends_at,
          ? AS role_name
        FROM users u
        WHERE u.id = ?
        LIMIT 1
      `,
      args: [
        String(shop.name),
        String(shop.slug),
        String(shop.status),
        shop.subscription_ends_at ? String(shop.subscription_ends_at) : null,
        roleName,
        newUserId,
      ],
    });

    res.status(201).json({
      success: true,
      message: `Created login @${rawUsername} (${roleName}) for ${shop.name}.`,
      data: mapShopUserRow(createdRes.rows[0] as Record<string, unknown>),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 11. Audited Reveal of Encrypted Recoverable Password for Any Shop User
adminRouter.post('/users/:userId/reveal-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getClient();

    const userRes = await client.execute({
      sql: `
        SELECT u.id, u.shop_id, u.username, u.full_name, u.phone, u.pin_code, u.encrypted_recovery_password,
               s.name AS shop_name, s.slug AS shop_slug
        FROM users u
        INNER JOIN shops s ON u.shop_id = s.id
        WHERE u.id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop user account not found.' });
      return;
    }

    const row = userRes.rows[0] as Record<string, unknown>;
    const cipher = row.encrypted_recovery_password ? String(row.encrypted_recovery_password) : '';

    if (!cipher) {
      res.status(400).json({
        success: false,
        code: 'LEGACY_HASH_NO_RECOVERY',
        error: 'This account uses a legacy one-way password hash created before recoverable vault activation. Click Reset Password to issue a new password.',
      });
      return;
    }

    const decryptedPassword = decryptSecret(cipher);
    if (!decryptedPassword) {
      res.status(400).json({
        success: false,
        code: 'LEGACY_HASH_NO_RECOVERY',
        error: 'Stored password cipher could not be decrypted. Click Reset Password to issue a new password.',
      });
      return;
    }

    await recordAdminAudit(
      req.user!.userId,
      'CREDENTIAL_PASSWORD_VIEWED',
      'USER',
      String(row.id),
      { shopId: row.shop_id, shopSlug: row.shop_slug, username: row.username },
      req.ip
    );

    res.json({
      success: true,
      data: {
        userId: String(row.id),
        shopId: String(row.shop_id),
        shopName: String(row.shop_name),
        shopSlug: String(row.shop_slug),
        username: String(row.username),
        fullName: String(row.full_name),
        phone: row.phone ? String(row.phone) : null,
        password: decryptedPassword,
        pinCode: row.pin_code ? String(row.pin_code) : null,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 12. Activate or Disable a Shop User Login
adminRouter.put('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const isActive = req.body?.isActive;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: 'Boolean isActive field is required.' });
      return;
    }

    const client = getClient();
    const existingRes = await client.execute({
      sql: `SELECT id, shop_id, username, role_id FROM users WHERE id = ? LIMIT 1`,
      args: [userId],
    });
    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User account not found.' });
      return;
    }

    const existing = existingRes.rows[0] as Record<string, unknown>;
    await client.execute({
      sql: `UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [isActive ? 1 : 0, userId],
    });

    await recordAdminAudit(
      req.user!.userId,
      'SHOP_USER_STATUS_UPDATED',
      'USER',
      userId,
      { shopId: existing.shop_id, username: existing.username, isActive },
      req.ip
    );

    res.json({
      success: true,
      message: `User @${existing.username} is now ${isActive ? 'ACTIVE' : 'DISABLED'}.`,
      data: { userId, isActive },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 13. Audited 1-Click Support Impersonation into a Shop Workspace
adminRouter.post('/shops/:id/impersonate', async (req, res) => {
  try {
    const shop = await findShopByIdOrSlug(req.params.id);
    if (!shop) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const shopId = String(shop.id);
    const effectiveStatus = resolveEffectiveShopStatus(shop.status, shop.subscription_ends_at);
    if (effectiveStatus !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        error: `Shop is currently ${effectiveStatus}. Activate or extend the shop first before opening Support Workspace.`,
      });
      return;
    }

    const client = getClient();
    const requestedUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';

    const userRes = requestedUserId
      ? await client.execute({
          sql: `
            SELECT u.*, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ? AND u.shop_id = ?
            LIMIT 1
          `,
          args: [requestedUserId, shopId],
        })
      : await client.execute({
          sql: `
            SELECT u.*, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.shop_id = ?
            ORDER BY u.is_active DESC, CASE WHEN u.role_id = 'ROLE_OWNER' THEN 0 ELSE 1 END ASC, u.created_at ASC
            LIMIT 1
          `,
          args: [shopId],
        });

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No user account found in this shop for support login.' });
      return;
    }

    const targetUser = userRes.rows[0] as Record<string, unknown>;
    if (!Boolean(targetUser.is_active)) {
      res.status(400).json({
        success: false,
        error: `User @${targetUser.username} is disabled. Activate the account first to launch support mode.`,
      });
      return;
    }

    const permRes = await client.execute({
      sql: `
        SELECT p.code
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
      `,
      args: [String(targetUser.role_id)],
    });
    const permissions = permRes.rows.map((r) => String((r as Record<string, unknown>).code));

    const token = generateToken(
      {
        userId: String(targetUser.id),
        shopId,
        username: String(targetUser.username),
        fullName: String(targetUser.full_name),
        roleId: String(targetUser.role_id),
        permissions,
        isSuperAdmin: false,
      },
      '2h'
    );

    await recordAdminAudit(
      req.user!.userId,
      'SUPERADMIN_SUPPORT_IMPERSONATION',
      'SHOP',
      shopId,
      {
        shopSlug: shop.slug,
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetRoleId: targetUser.role_id,
      },
      req.ip
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: String(targetUser.id),
          shopId,
          shopSlug: String(shop.slug),
          shopName: String(shop.name),
          username: String(targetUser.username),
          fullName: String(targetUser.full_name),
          roleId: String(targetUser.role_id),
          roleName: String(targetUser.role_name || targetUser.role_id),
          isSuperAdmin: false,
          permissions,
        },
        shop: {
          id: shopId,
          name: String(shop.name),
          slug: String(shop.slug),
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 14. Global Customers Directory across ALL Shops
adminRouter.get('/customers', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const shopId = typeof req.query.shopId === 'string' ? req.query.shopId.trim() : '';
    const customerType = typeof req.query.customerType === 'string' ? req.query.customerType.trim().toUpperCase() : '';
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));

    const client = getClient();
    const conditions: string[] = [];
    const args: Array<string | number> = [];

    if (shopId && shopId !== 'ALL') {
      conditions.push('(c.shop_id = ? OR s.slug = ?)');
      args.push(shopId, shopId);
    }

    if (customerType && customerType !== 'ALL') {
      conditions.push('UPPER(c.customer_type) = ?');
      args.push(customerType);
    }

    const defaultAddressJoin = `
      LEFT JOIN customer_addresses ca ON ca.id = (
        SELECT ca2.id FROM customer_addresses ca2
        WHERE ca2.customer_id = c.id
        ORDER BY ca2.is_default DESC, ca2.id ASC
        LIMIT 1
      )
    `;

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(`(
        LOWER(c.full_name) LIKE ?
        OR COALESCE(c.primary_phone, '') LIKE ?
        OR COALESCE(c.secondary_phone, '') LIKE ?
        OR LOWER(c.customer_code) LIKE ?
        OR LOWER(COALESCE(c.email, '')) LIKE ?
        OR LOWER(COALESCE(ca.city, '')) LIKE ?
        OR LOWER(s.name) LIKE ?
      )`);
      args.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRes, rowsRes] = await Promise.all([
      client.execute({
        sql: `
          SELECT COUNT(*) AS total
          FROM customers c
          INNER JOIN shops s ON c.shop_id = s.id
          ${defaultAddressJoin}
          ${whereClause}
        `,
        args,
      }),
      client.execute({
        sql: `
          SELECT
            c.id, c.shop_id, c.customer_code, c.full_name, c.primary_phone, c.secondary_phone,
            c.email, c.gstin, c.customer_type, c.notes, c.created_at,
            s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status, s.subscription_ends_at AS shop_subscription_ends_at,
            ca.address_line1, ca.city, ca.state, ca.pincode,
            COALESCE(dev_agg.devices_count, 0) AS devices_count,
            COALESCE(job_agg.jobs_count, 0) AS jobs_count,
            job_agg.last_visit_at AS last_visit_at,
            COALESCE(inv_agg.total_invoiced_inr, 0) AS total_invoiced_inr,
            COALESCE(inv_agg.total_paid_inr, 0) AS total_paid_inr
          FROM customers c
          INNER JOIN shops s ON c.shop_id = s.id
          ${defaultAddressJoin}
          LEFT JOIN (SELECT customer_id, COUNT(*) AS devices_count FROM devices GROUP BY customer_id) dev_agg ON dev_agg.customer_id = c.id
          LEFT JOIN (SELECT customer_id, COUNT(*) AS jobs_count, MAX(created_at) AS last_visit_at FROM service_jobs GROUP BY customer_id) job_agg ON job_agg.customer_id = c.id
          LEFT JOIN (
            SELECT customer_id, COALESCE(SUM(total_amount), 0) AS total_invoiced_inr, COALESCE(SUM(amount_paid), 0) AS total_paid_inr
            FROM invoices
            WHERE is_void = 0
            GROUP BY customer_id
          ) inv_agg ON inv_agg.customer_id = c.id
          ${whereClause}
          ORDER BY COALESCE(job_agg.last_visit_at, c.created_at) DESC, c.created_at DESC
          LIMIT ?
        `,
        args: [...args, limit],
      }),
    ]);

    res.json({
      success: true,
      totalCount: Number((countRes.rows[0] as Record<string, unknown>)?.total || 0),
      data: rowsRes.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: String(row.id),
          shopId: String(row.shop_id),
          shopName: String(row.shop_name),
          shopSlug: String(row.shop_slug),
          shopStatus: resolveEffectiveShopStatus(row.shop_status, row.shop_subscription_ends_at),
          customerCode: String(row.customer_code),
          fullName: String(row.full_name),
          primaryPhone: String(row.primary_phone),
          secondaryPhone: row.secondary_phone ? String(row.secondary_phone) : null,
          email: row.email ? String(row.email) : null,
          gstin: row.gstin ? String(row.gstin) : null,
          customerType: String(row.customer_type),
          notes: row.notes ? String(row.notes) : null,
          addressLine1: row.address_line1 ? String(row.address_line1) : null,
          city: row.city ? String(row.city) : null,
          state: row.state ? String(row.state) : null,
          pincode: row.pincode ? String(row.pincode) : null,
          devicesCount: Number(row.devices_count || 0),
          jobsCount: Number(row.jobs_count || 0),
          totalInvoicedInr: Number(row.total_invoiced_inr || 0),
          totalPaidInr: Number(row.total_paid_inr || 0),
          lastVisitAt: row.last_visit_at ? String(row.last_visit_at) : null,
          createdAt: String(row.created_at),
        };
      }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 15. Complete 360° Customer Dossier across Any Shop
adminRouter.get('/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    const client = getClient();

    const custRes = await client.execute({
      sql: `
        SELECT c.*, s.name AS shop_name, s.slug AS shop_slug, s.phone AS shop_phone
        FROM customers c
        INNER JOIN shops s ON c.shop_id = s.id
        WHERE c.id = ?
        LIMIT 1
      `,
      args: [customerId],
    });

    if (custRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found.' });
      return;
    }

    const c = custRes.rows[0] as Record<string, unknown>;

    const [addressesRes, devicesRes, jobsRes, invoicesRes] = await Promise.all([
      client.execute({
        sql: `
          SELECT id, address_line1, address_line2, landmark, city, state, pincode, is_default
          FROM customer_addresses
          WHERE customer_id = ?
          ORDER BY is_default DESC, id ASC
        `,
        args: [customerId],
      }),
      client.execute({
        sql: `
          SELECT d.id, d.equipment_type, d.brand, d.model_name, d.serial_number, d.color_finish,
                 d.specs_summary, d.encrypted_security_passcode, d.created_at,
                 (SELECT COUNT(*) FROM service_jobs j WHERE j.device_id = d.id) AS jobs_count
          FROM devices d
          WHERE d.customer_id = ?
          ORDER BY d.created_at DESC
        `,
        args: [customerId],
      }),
      client.execute({
        sql: `
          SELECT j.id, j.job_number, j.service_category, j.current_status, j.priority,
                 j.reported_issue, j.estimated_cost, j.advance_deposit, j.created_at,
                 d.brand AS device_brand, d.model_name AS device_model, d.equipment_type
          FROM service_jobs j
          INNER JOIN devices d ON j.device_id = d.id
          WHERE j.customer_id = ?
          ORDER BY j.created_at DESC
        `,
        args: [customerId],
      }),
      client.execute({
        sql: `
          SELECT id, invoice_number, invoice_type, total_amount, amount_paid, balance_due, payment_status, created_at
          FROM invoices
          WHERE customer_id = ? AND is_void = 0
          ORDER BY created_at DESC
        `,
        args: [customerId],
      }),
    ]);

    let totalInvoicedInr = 0;
    let totalPaidInr = 0;
    let balanceDueInr = 0;

    const invoices = invoicesRes.rows.map((invRow) => {
      const inv = invRow as Record<string, unknown>;
      const totalAmount = Number(inv.total_amount || 0);
      const amountPaid = Number(inv.amount_paid || 0);
      const balanceDue = Number(inv.balance_due || 0);
      totalInvoicedInr += totalAmount;
      totalPaidInr += amountPaid;
      balanceDueInr += balanceDue;
      return {
        id: String(inv.id),
        invoiceNumber: String(inv.invoice_number),
        invoiceType: String(inv.invoice_type),
        totalAmount,
        amountPaid,
        balanceDue,
        paymentStatus: String(inv.payment_status),
        createdAt: String(inv.created_at),
      };
    });

    res.json({
      success: true,
      data: {
        customer: {
          id: String(c.id),
          shopId: String(c.shop_id),
          shopName: String(c.shop_name),
          shopSlug: String(c.shop_slug),
          shopPhone: c.shop_phone ? String(c.shop_phone) : null,
          customerCode: String(c.customer_code),
          fullName: String(c.full_name),
          primaryPhone: String(c.primary_phone),
          secondaryPhone: c.secondary_phone ? String(c.secondary_phone) : null,
          email: c.email ? String(c.email) : null,
          gstin: c.gstin ? String(c.gstin) : null,
          customerType: String(c.customer_type),
          notes: c.notes ? String(c.notes) : null,
          createdAt: String(c.created_at),
        },
        addresses: addressesRes.rows.map((addrRow) => {
          const a = addrRow as Record<string, unknown>;
          return {
            id: String(a.id),
            addressLine1: String(a.address_line1),
            addressLine2: a.address_line2 ? String(a.address_line2) : null,
            landmark: a.landmark ? String(a.landmark) : null,
            city: String(a.city),
            state: String(a.state),
            pincode: a.pincode ? String(a.pincode) : null,
            isDefault: Boolean(a.is_default),
          };
        }),
        devices: devicesRes.rows.map((devRow) => {
          const d = devRow as Record<string, unknown>;
          return {
            id: String(d.id),
            equipmentType: String(d.equipment_type),
            brand: String(d.brand),
            modelName: String(d.model_name),
            serialNumber: d.serial_number ? String(d.serial_number) : null,
            colorFinish: d.color_finish ? String(d.color_finish) : null,
            specsSummary: d.specs_summary ? String(d.specs_summary) : null,
            hasPasscode: Boolean(d.encrypted_security_passcode),
            jobsCount: Number(d.jobs_count || 0),
            createdAt: String(d.created_at),
          };
        }),
        jobs: jobsRes.rows.map((jobRow) => {
          const j = jobRow as Record<string, unknown>;
          return {
            id: String(j.id),
            jobNumber: String(j.job_number),
            serviceCategory: String(j.service_category),
            currentStatus: String(j.current_status),
            priority: String(j.priority),
            reportedIssue: String(j.reported_issue),
            estimatedCost: Number(j.estimated_cost || 0),
            advanceDeposit: Number(j.advance_deposit || 0),
            deviceLabel: `${j.device_brand} ${j.device_model} (${j.equipment_type})`,
            createdAt: String(j.created_at),
          };
        }),
        invoices,
        financialSummary: {
          totalInvoicedInr,
          totalPaidInr,
          balanceDueInr,
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 16. Full Live Platform Analytics (Synced 1:1 with Metrics & Database State)
adminRouter.get('/analytics', async (_req, res) => {
  try {
    const client = getClient();
    const [
      shopsDetailedRes,
      claimsAggRes,
      usersAggRes,
      windowCountsRes,
      jobsByStatusRes,
      customersByTypeRes,
      devicesByCategoryRes,
      cityStatsRes,
      snapshotCountsRes,
    ] = await Promise.all([
      client.execute(`
        SELECT
          s.id, s.name, s.slug, s.owner_name, s.phone, s.city, s.status,
          s.subscription_ends_at, s.max_seats, s.created_at,
          sub.status AS subscription_status, sub.trial_ends_at, sub.current_period_ends_at,
          COALESCE(sub.is_complimentary, 0) AS is_complimentary,
          (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id AND u.is_active = 1) AS active_users,
          (SELECT COUNT(*) FROM customers c WHERE c.shop_id = s.id) AS customers_count,
          (SELECT COUNT(*) FROM devices d WHERE d.shop_id = s.id) AS devices_count,
          (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id) AS jobs_count,
          (SELECT COUNT(*) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) AS invoices_count,
          (SELECT COALESCE(SUM(inv.total_amount), 0) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) AS workshop_gmv_inr,
          (SELECT COALESCE(SUM(inv.amount_paid), 0) FROM invoices inv WHERE inv.shop_id = s.id AND inv.is_void = 0) AS collected_inr,
          (SELECT COALESCE(SUM(pc.amount_inr), 0) FROM saas_payment_claims pc WHERE pc.shop_id = s.id AND pc.status = 'APPROVED') AS saas_paid_inr,
          (SELECT MAX(j.created_at) FROM service_jobs j WHERE j.shop_id = s.id) AS last_job_at
        FROM shops s
        LEFT JOIN saas_subscriptions sub ON s.id = sub.shop_id
        ORDER BY jobs_count DESC, customers_count DESC, s.created_at DESC
      `),
      client.execute(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount_inr ELSE 0 END), 0) AS total_saas_rev,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount_inr ELSE 0 END), 0) AS pending_saas_inr,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_claims,
          COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved_claims
        FROM saas_payment_claims
      `),
      client.execute(`
        SELECT
          COUNT(*) AS total_users,
          COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS active_users
        FROM users
      `),
      client.execute(`
        SELECT
          (SELECT COUNT(*) FROM shops WHERE datetime(created_at) >= datetime('now', '-7 days')) AS shops_7d,
          (SELECT COUNT(*) FROM shops WHERE datetime(created_at) >= datetime('now', '-30 days')) AS shops_30d,
          (SELECT COUNT(*) FROM customers WHERE datetime(created_at) >= datetime('now', '-7 days')) AS customers_7d,
          (SELECT COUNT(*) FROM customers WHERE datetime(created_at) >= datetime('now', '-30 days')) AS customers_30d,
          (SELECT COUNT(*) FROM service_jobs WHERE datetime(created_at) >= datetime('now', '-7 days')) AS jobs_7d,
          (SELECT COUNT(*) FROM service_jobs WHERE datetime(created_at) >= datetime('now', '-30 days')) AS jobs_30d
      `),
      client.execute(`
        SELECT current_status AS status, COUNT(*) AS count
        FROM service_jobs
        GROUP BY current_status
        ORDER BY count DESC
      `),
      client.execute(`
        SELECT COALESCE(customer_type, 'INDIVIDUAL') AS type, COUNT(*) AS count
        FROM customers
        GROUP BY customer_type
        ORDER BY count DESC
      `),
      client.execute(`
        SELECT COALESCE(equipment_type, 'OTHER') AS category, COUNT(*) AS count
        FROM devices
        GROUP BY equipment_type
        ORDER BY count DESC
      `),
      client.execute(`
        SELECT
          COALESCE(NULLIF(TRIM(s.city), ''), 'Unspecified') AS city,
          COUNT(*) AS shops_count,
          COALESCE(SUM((SELECT COUNT(*) FROM customers c WHERE c.shop_id = s.id)), 0) AS customers_count,
          COALESCE(SUM((SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id)), 0) AS jobs_count
        FROM shops s
        GROUP BY COALESCE(NULLIF(TRIM(s.city), ''), 'Unspecified')
        ORDER BY shops_count DESC, jobs_count DESC
      `),
      client.execute(`
        SELECT
          (SELECT COUNT(*) FROM shops) AS shops_cnt,
          (SELECT COUNT(*) FROM users) AS users_cnt,
          (SELECT COUNT(*) FROM customers) AS customers_cnt,
          (SELECT COUNT(*) FROM devices) AS devices_cnt,
          (SELECT COUNT(*) FROM service_jobs) AS jobs_cnt,
          (SELECT COUNT(*) FROM service_jobs WHERE current_status NOT IN ('DELIVERED', 'CANCELLED')) AS active_jobs_cnt,
          (SELECT COUNT(*) FROM service_jobs WHERE current_status = 'DELIVERED') AS delivered_jobs_cnt,
          (SELECT COUNT(*) FROM invoices) AS invoices_cnt,
          (SELECT COUNT(*) FROM saas_payment_claims) AS claims_cnt,
          (SELECT COUNT(*) FROM saas_notifications) AS notifications_cnt,
          (SELECT COUNT(*) FROM saas_admin_audit_logs) AS audits_cnt
      `),
    ]);

    let activeShops = 0;
    let frozenShops = 0;
    let expiredShops = 0;
    let trialingShops = 0;
    let activeSubscriptions = 0;
    let totalShopGmvInr = 0;
    let totalShopCollectedInr = 0;
    let payingShopsCount = 0;

    const nowMs = Date.now();
    const shopLeaderboard = shopsDetailedRes.rows.map((r) => {
      const row = r as Record<string, unknown>;
      const effectiveStatus = resolveEffectiveShopStatus(row.status, row.subscription_ends_at);
      if (effectiveStatus === 'FROZEN') frozenShops++;
      else if (effectiveStatus === 'EXPIRED') expiredShops++;
      else activeShops++;

      const rawSubStatus = String(row.subscription_status || 'ACTIVE');
      let effectiveSubStatus = rawSubStatus;
      if (effectiveStatus === 'FROZEN') {
        effectiveSubStatus = 'SUSPENDED';
      } else if (effectiveStatus === 'EXPIRED') {
        effectiveSubStatus = 'EXPIRED';
      } else if (rawSubStatus === 'TRIALING' && !isTimestampPastDue(row.trial_ends_at)) {
        trialingShops++;
      } else if (rawSubStatus === 'ACTIVE' && !isTimestampPastDue(row.current_period_ends_at)) {
        activeSubscriptions++;
      }

      const endIso = row.subscription_ends_at ? String(row.subscription_ends_at) : '';
      const endMs = endIso ? new Date(endIso).getTime() : NaN;
      const daysRemaining = Number.isFinite(endMs) ? Math.ceil((endMs - nowMs) / (24 * 60 * 60 * 1000)) : 0;

      const workshopGmvInr = Number(row.workshop_gmv_inr || 0);
      const collectedInr = Number(row.collected_inr || 0);
      const saasPaidInr = Number(row.saas_paid_inr || 0);

      totalShopGmvInr += workshopGmvInr;
      totalShopCollectedInr += collectedInr;
      if (saasPaidInr > 0) payingShopsCount++;

      return {
        shopId: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        ownerName: String(row.owner_name),
        phone: String(row.phone),
        city: String(row.city || ''),
        status: effectiveStatus,
        subscriptionStatus: effectiveSubStatus,
        isComplimentary: Boolean(row.is_complimentary),
        subscriptionEndsAt: endIso,
        daysRemaining,
        activeUsers: Number(row.active_users || 0),
        maxSeats: Number(row.max_seats || 5),
        customersCount: Number(row.customers_count || 0),
        devicesCount: Number(row.devices_count || 0),
        jobsCount: Number(row.jobs_count || 0),
        invoicesCount: Number(row.invoices_count || 0),
        workshopGmvInr,
        collectedInr,
        saasPaidInr,
        lastActivityAt: String(row.last_job_at || row.created_at),
      };
    });

    const expiringSoon = shopLeaderboard
      .filter((s) => !s.isComplimentary && s.status !== 'FROZEN' && s.daysRemaining <= 14)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .map((s) => ({
        shopId: s.shopId,
        name: s.name,
        slug: s.slug,
        ownerName: s.ownerName,
        phone: s.phone,
        subscriptionStatus: s.subscriptionStatus,
        subscriptionEndsAt: s.subscriptionEndsAt,
        daysRemaining: s.daysRemaining,
      }));

    const claimsAgg = (claimsAggRes.rows[0] || {}) as Record<string, unknown>;
    const usersAgg = (usersAggRes.rows[0] || {}) as Record<string, unknown>;
    const windowAgg = (windowCountsRes.rows[0] || {}) as Record<string, unknown>;
    const snapAgg = (snapshotCountsRes.rows[0] || {}) as Record<string, unknown>;

    const totalShops = shopLeaderboard.length;
    const totalSaasRevenueInr = Number(claimsAgg.total_saas_rev || 0);
    const conversionRatePct = totalShops > 0 ? Math.round((activeSubscriptions / totalShops) * 1000) / 10 : 0;
    const avgRevenuePerPayingShopInr =
      payingShopsCount > 0 ? Math.round(totalSaasRevenueInr / payingShopsCount) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalShops,
          activeShops,
          trialingShops,
          activeSubscriptions,
          frozenShops,
          expiredShops,
          totalUsers: Number(usersAgg.total_users || 0),
          activeUsers: Number(usersAgg.active_users || 0),
          totalCustomers: Number(snapAgg.customers_cnt || 0),
          totalDevices: Number(snapAgg.devices_cnt || 0),
          totalJobs: Number(snapAgg.jobs_cnt || 0),
          activeJobs: Number(snapAgg.active_jobs_cnt || 0),
          deliveredJobs: Number(snapAgg.delivered_jobs_cnt || 0),
          totalSaasRevenueInr,
          pendingSaasClaimsInr: Number(claimsAgg.pending_saas_inr || 0),
          pendingPaymentClaims: Number(claimsAgg.pending_claims || 0),
          approvedPaymentClaims: Number(claimsAgg.approved_claims || 0),
          totalShopGmvInr,
          totalShopCollectedInr,
          conversionRatePct,
          avgRevenuePerPayingShopInr,
        },
        signupsByWindow: {
          shopsLast7d: Number(windowAgg.shops_7d || 0),
          shopsLast30d: Number(windowAgg.shops_30d || 0),
          customersLast7d: Number(windowAgg.customers_7d || 0),
          customersLast30d: Number(windowAgg.customers_30d || 0),
          jobsLast7d: Number(windowAgg.jobs_7d || 0),
          jobsLast30d: Number(windowAgg.jobs_30d || 0),
        },
        jobsByStatus: jobsByStatusRes.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return { status: String(row.status), count: Number(row.count || 0) };
        }),
        customersByType: customersByTypeRes.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return { type: String(row.type), count: Number(row.count || 0) };
        }),
        devicesByCategory: devicesByCategoryRes.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return { category: String(row.category), count: Number(row.count || 0) };
        }),
        shopsByCity: cityStatsRes.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            city: String(row.city),
            shopsCount: Number(row.shops_count || 0),
            customersCount: Number(row.customers_count || 0),
            jobsCount: Number(row.jobs_count || 0),
          };
        }),
        shopLeaderboard,
        expiringSoon,
        databaseSnapshot: {
          databaseProvider: getDatabaseProviderLabel(),
          generatedAt: new Date().toISOString(),
          counts: {
            shops: Number(snapAgg.shops_cnt || 0),
            users: Number(snapAgg.users_cnt || 0),
            customers: Number(snapAgg.customers_cnt || 0),
            devices: Number(snapAgg.devices_cnt || 0),
            jobs: Number(snapAgg.jobs_cnt || 0),
            invoices: Number(snapAgg.invoices_cnt || 0),
            paymentClaims: Number(snapAgg.claims_cnt || 0),
            notifications: Number(snapAgg.notifications_cnt || 0),
            auditLogs: Number(snapAgg.audits_cnt || 0),
          },
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 17. Update Super-Admin Own Credentials / Profile
adminRouter.put('/profile/password', async (req, res) => {
  try {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : undefined;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : undefined;

    if (!currentPassword) {
      res.status(400).json({ success: false, error: 'Current password is required for verification.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
      return;
    }

    const client = getClient();
    const adminRes = await client.execute({
      sql: `SELECT id, username, password_hash, full_name, email FROM vendor_admins WHERE id = ? LIMIT 1`,
      args: [req.user!.userId],
    });

    if (adminRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Super-Admin account not found.' });
      return;
    }

    const adminRow = adminRes.rows[0] as Record<string, unknown>;
    const valid = verifyPassword(currentPassword, String(adminRow.password_hash));
    if (!valid) {
      res.status(401).json({ success: false, error: 'Current password is incorrect.' });
      return;
    }

    const nextHash = hashPassword(newPassword);
    const nextFullName = fullName && fullName.length >= 2 ? fullName : String(adminRow.full_name);
    const nextEmail = email !== undefined ? (email || null) : (adminRow.email ? String(adminRow.email) : null);

    await client.execute({
      sql: `UPDATE vendor_admins SET password_hash = ?, full_name = ?, email = ? WHERE id = ?`,
      args: [nextHash, nextFullName, nextEmail, req.user!.userId],
    });

    await recordAdminAudit(
      req.user!.userId,
      'SUPERADMIN_PASSWORD_UPDATED',
      'VENDOR_ADMIN',
      req.user!.userId,
      { username: adminRow.username, fullNameUpdated: Boolean(fullName) },
      req.ip
    );

    res.json({
      success: true,
      message: 'Super-Admin password updated successfully.',
      data: {
        username: String(adminRow.username),
        fullName: nextFullName,
        email: nextEmail,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 19. Password Reset Requests Queue (Decrypts live 6-digit OTP & direct reset links for Super-Admin support)
adminRouter.get('/password-reset-requests', async (req, res) => {
  try {
    const client = getClient();
    const publicBase = resolvePublicAppUrl(req);
    const includeHistory = req.query.includeHistory === 'true';

    const whereClause = includeHistory
      ? `1 = 1`
      : `prt.status = 'PENDING' AND datetime(prt.expires_at) > datetime('now')`;

    const result = await client.execute({
      sql: `
        SELECT prt.id, prt.account_type, prt.user_id, prt.shop_id, prt.username,
               prt.requested_identifier, prt.encrypted_otp, prt.encrypted_token,
               prt.delivery_channel, prt.status, prt.attempts, prt.expires_at, prt.created_at,
               s.name AS shop_name, s.slug AS shop_slug, s.phone AS shop_phone,
               u.full_name AS user_full_name, u.role_id AS user_role_id, u.phone AS user_phone
        FROM password_reset_tokens prt
        LEFT JOIN shops s ON s.id = prt.shop_id
        LEFT JOIN users u ON u.id = prt.user_id AND prt.account_type = 'SHOP_USER'
        WHERE ${whereClause}
        ORDER BY prt.created_at DESC
        LIMIT 50
      `,
      args: [],
    });

    const data = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const accountType = String(r.account_type) === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SHOP_USER';
      const otp = r.encrypted_otp ? decryptSecret(String(r.encrypted_otp)) : '';
      const rawToken = r.encrypted_token ? decryptSecret(String(r.encrypted_token)) : '';
      return {
        id: String(r.id),
        accountType,
        userId: String(r.user_id),
        shopId: r.shop_id ? String(r.shop_id) : null,
        shopName: r.shop_name ? String(r.shop_name) : (accountType === 'SUPER_ADMIN' ? 'K-Connect Super-Admin' : 'Unknown Shop'),
        shopSlug: r.shop_slug ? String(r.shop_slug) : null,
        shopPhone: r.shop_phone ? String(r.shop_phone) : null,
        username: String(r.username),
        fullName: r.user_full_name ? String(r.user_full_name) : String(r.username),
        roleId: r.user_role_id ? String(r.user_role_id) : (accountType === 'SUPER_ADMIN' ? 'ROLE_SUPER_ADMIN' : 'ROLE_TECHNICIAN'),
        phone: r.user_phone ? String(r.user_phone) : (r.shop_phone ? String(r.shop_phone) : null),
        requestedIdentifier: r.requested_identifier ? String(r.requested_identifier) : null,
        otp: String(r.status) === 'PENDING' ? otp : '',
        resetUrl: String(r.status) === 'PENDING' && rawToken ? buildResetUrl(publicBase, rawToken, accountType) : '',
        deliveryChannel: String(r.delivery_channel || 'SUPPORT_QUEUE'),
        status: String(r.status),
        attempts: Number(r.attempts || 0),
        expiresAt: String(r.expires_at),
        createdAt: String(r.created_at),
      };
    });

    res.json({ success: true, data });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Dismiss / Cancel a Pending Password Reset Request
adminRouter.post('/password-reset-requests/:requestId/dismiss', async (req, res) => {
  try {
    const client = getClient();
    const { requestId } = req.params;

    const existing = await client.execute({
      sql: `SELECT id, username, shop_id FROM password_reset_tokens WHERE id = ? LIMIT 1`,
      args: [requestId],
    });
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Password reset request not found.' });
      return;
    }

    await client.execute({
      sql: `UPDATE password_reset_tokens SET status = 'CANCELLED' WHERE id = ?`,
      args: [requestId],
    });

    await recordAdminAudit(
      req.user!.userId,
      'PASSWORD_RESET_DISMISSED',
      'PASSWORD_RESET',
      requestId,
      { username: existing.rows[0].username, shopId: existing.rows[0].shop_id },
      req.ip
    );

    res.json({ success: true, message: 'Password reset request dismissed.' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
