import crypto from 'node:crypto';
import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken, requireSuperAdmin, hashPassword } from '../middleware/auth.ts';
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

// 1. Platform System Metrics (Real live data from database)
adminRouter.get('/metrics', async (_req, res) => {
  try {
    const client = getClient();
    const [
      shopsRes,
      jobsRes,
      usersRes,
      customersRes,
      subRes,
      pendingClaimsRes,
      approvedClaimsRes,
      revRes,
      unreadAlertsRes,
    ] = await Promise.all([
      client.execute(`SELECT id, status, subscription_ends_at FROM shops`),
      client.execute(`SELECT COUNT(*) as count FROM service_jobs`),
      client.execute(`SELECT COUNT(*) as count FROM users`),
      client.execute(`SELECT COUNT(*) as count FROM customers`),
      client.execute(`SELECT shop_id, status, trial_ends_at, current_period_ends_at FROM saas_subscriptions`),
      client.execute(`SELECT COUNT(*) as count FROM saas_payment_claims WHERE status = 'PENDING'`),
      client.execute(`SELECT COUNT(*) as count FROM saas_payment_claims WHERE status = 'APPROVED'`),
      client.execute(`SELECT SUM(amount_inr) as total FROM saas_payment_claims WHERE status = 'APPROVED'`),
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

    const dbUrl = process.env.DATABASE_URL || '';
    const isTurso = dbUrl.startsWith('libsql:') || dbUrl.includes('.turso.io');
    const databaseProvider = isTurso ? 'TURSO_LIBSQL_CLOUD' : dbUrl ? 'REMOTE_DATABASE' : 'LOCAL_SQLITE';

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
        totalUsers: Number((usersRes.rows[0] as Record<string, unknown>).count),
        totalCustomers: Number((customersRes.rows[0] as Record<string, unknown>).count),
        unreadNotifications: Number((unreadAlertsRes.rows[0] as Record<string, unknown>).count),
        databaseProvider,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. List All Tenant Shops (Search & Filter with Live Statuses & Owner Username)
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
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id) as total_jobs_count,
        (SELECT COUNT(*) FROM customers c WHERE c.shop_id = s.id) as total_customers_count
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
          city: row.city,
          state: row.state,
          status: effectiveStatus,
          subscriptionStatus: effectiveSubStatus,
          trialEndsAt: row.trial_ends_at,
          currentPeriodEndsAt: row.current_period_ends_at,
          isComplimentary: Boolean(row.is_complimentary),
          maxSeats: Number(row.max_seats),
          activeUsersCount: Number(row.active_users_count),
          totalJobsCount: Number(row.total_jobs_count),
          totalCustomersCount: Number(row.total_customers_count),
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

// 2b. Get Single Tenant Shop Details
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
        (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id AND u.is_active = 1) as active_users_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id) as total_jobs_count
      FROM shops s 
      LEFT JOIN saas_subscriptions sub ON s.id = sub.shop_id
      WHERE s.id = ? OR s.slug = ?
    `;

    const result = await client.execute({ sql: query, args: [id, id] });
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const row = result.rows[0] as Record<string, unknown>;
    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        ownerName: row.owner_name,
        phone: row.phone,
        email: row.email,
        gstin: row.gstin,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        upiId: row.upi_id,
        logoUrl: row.logo_url,
        status: row.status,
        subscriptionStatus: row.subscription_status || 'ACTIVE',
        subscriptionPlan: row.subscription_plan,
        subscriptionEndsAt: row.subscription_ends_at,
        trialEndsAt: row.trial_ends_at,
        currentPeriodStartsAt: row.current_period_starts_at,
        currentPeriodEndsAt: row.current_period_ends_at,
        isComplimentary: Boolean(row.is_complimentary),
        maxSeats: Number(row.max_seats),
        activeUsersCount: Number(row.active_users_count),
        totalJobsCount: Number(row.total_jobs_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2c. List Shop Staff & Owner Accounts (Usernames, Phones, Roles, PIN status — never password hashes)
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
        SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.phone, u.pin_code, u.is_active, u.created_at
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
            username: row.username,
            fullName: row.full_name,
            roleId: row.role_id,
            roleName: row.role_name,
            phone: row.phone,
            pinCode: row.pin_code,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
          };
        }),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

function generateReadableTempPassword(length = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

// 2d. Reset Shop Owner / Staff Credentials (Issues Temporary Password + Optional PIN)
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
      res.status(400).json({ success: false, error: 'Temporary password must be at least 6 characters long.' });
      return;
    }
    const plainTempPassword = trimmedPass || generateReadableTempPassword(10);
    const passwordHash = hashPassword(plainTempPassword);

    const trimmedPin = typeof newPin === 'string' ? newPin.trim() : '';
    if (trimmedPin && !/^\d{4,6}$/.test(trimmedPin)) {
      res.status(400).json({ success: false, error: 'Quick PIN must be 4 to 6 numeric digits.' });
      return;
    }

    const nextPin = trimmedPin || String(targetUser.pin_code || '1234');

    await client.execute({
      sql: `UPDATE users SET password_hash = ?, pin_code = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?`,
      args: [passwordHash, nextPin, String(targetUser.id), shopId],
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
      message: `Temporary credentials generated for @${targetUser.username}.`,
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
    const passwordHash = hashPassword(ownerPassword && ownerPassword.trim() ? ownerPassword.trim() : 'shop123');
    const pin = ownerPin && ownerPin.trim() ? ownerPin.trim() : '1234';

    await client.execute({
      sql: `INSERT INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 'ROLE_OWNER', ?, 1)`,
      args: [
        ownerUserId,
        shopId,
        ownerUsername ? ownerUsername.trim().toLowerCase() : 'admin',
        passwordHash,
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

    res.json({ success: true, message: 'Platform settings saved successfully.', data: updatedMap });
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
