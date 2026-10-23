import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken, requireSuperAdmin, hashPassword } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { provisionShopSchema } from '../validation/schemas.ts';

export const adminRouter = Router();

// Protect all admin routes strictly for Vendor Super-Admin
adminRouter.use(authenticateToken, requireSuperAdmin);

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

// 1. Platform System Metrics (Real data from database)
adminRouter.get('/metrics', async (_req, res) => {
  try {
    const client = getClient();
    const shopsRes = await client.execute(`SELECT COUNT(*) as count FROM shops`);
    const activeShopsRes = await client.execute(`SELECT COUNT(*) as count FROM shops WHERE status = 'ACTIVE'`);
    const frozenShopsRes = await client.execute(`SELECT COUNT(*) as count FROM shops WHERE status = 'FROZEN'`);
    const expiredShopsRes = await client.execute(`SELECT COUNT(*) as count FROM shops WHERE status = 'EXPIRED'`);

    const jobsRes = await client.execute(`SELECT COUNT(*) as count FROM service_jobs`);
    const usersRes = await client.execute(`SELECT COUNT(*) as count FROM users`);

    // Subscriptions count
    const trialRes = await client.execute(`SELECT COUNT(*) as count FROM saas_subscriptions WHERE status = 'TRIALING'`);
    const activeSubRes = await client.execute(`SELECT COUNT(*) as count FROM saas_subscriptions WHERE status = 'ACTIVE'`);

    // Payment claims
    const pendingClaimsRes = await client.execute(`SELECT COUNT(*) as count FROM saas_payment_claims WHERE status = 'PENDING'`);
    const approvedClaimsRes = await client.execute(`SELECT COUNT(*) as count FROM saas_payment_claims WHERE status = 'APPROVED'`);
    const revRes = await client.execute(`SELECT SUM(amount_inr) as total FROM saas_payment_claims WHERE status = 'APPROVED'`);
    const totalVerifiedRevenue = Number((revRes.rows[0] as Record<string, unknown>)?.total || 0);

    res.json({
      success: true,
      data: {
        totalShops: Number((shopsRes.rows[0] as Record<string, unknown>).count),
        activeShops: Number((activeShopsRes.rows[0] as Record<string, unknown>).count),
        frozenShops: Number((frozenShopsRes.rows[0] as Record<string, unknown>).count),
        expiredShops: Number((expiredShopsRes.rows[0] as Record<string, unknown>).count),
        trialingShops: Number((trialRes.rows[0] as Record<string, unknown>).count),
        activeSubscriptions: Number((activeSubRes.rows[0] as Record<string, unknown>).count),
        pendingPaymentClaims: Number((pendingClaimsRes.rows[0] as Record<string, unknown>).count),
        approvedPaymentClaims: Number((approvedClaimsRes.rows[0] as Record<string, unknown>).count),
        totalVerifiedRevenueInr: totalVerifiedRevenue,
        totalJobs: Number((jobsRes.rows[0] as Record<string, unknown>).count),
        totalUsers: Number((usersRes.rows[0] as Record<string, unknown>).count),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. List All Tenant Shops (Search & Filter)
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
        (SELECT COUNT(*) FROM users u WHERE u.shop_id = s.id AND u.is_active = 1) as active_users_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.shop_id = s.id) as total_jobs_count
      FROM shops s 
      LEFT JOIN saas_subscriptions sub ON s.id = sub.shop_id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (status && status !== 'ALL') {
      query += ` AND s.status = ?`;
      args.push(String(status));
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (s.name LIKE ? OR s.slug LIKE ? OR s.owner_name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)`;
      args.push(q, q, q, q, q);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await client.execute({ sql: query, args });

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        ownerName: row.owner_name,
        phone: row.phone,
        email: row.email,
        gstin: row.gstin,
        city: row.city,
        state: row.state,
        status: row.status,
        subscriptionStatus: row.subscription_status || 'ACTIVE',
        trialEndsAt: row.trial_ends_at,
        currentPeriodEndsAt: row.current_period_ends_at,
        isComplimentary: Boolean(row.is_complimentary),
        maxSeats: Number(row.max_seats),
        activeUsersCount: Number(row.active_users_count),
        totalJobsCount: Number(row.total_jobs_count),
        subscriptionPlan: row.subscription_plan,
        subscriptionEndsAt: row.subscription_ends_at,
        createdAt: row.created_at,
      })),
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


// 3. Provision a New Tenant Shop Manually (Admin Rapid Provision)
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

// 5. Extend Free Trial (+7 or +14 Days)
adminRouter.post('/shops/:id/extend-trial', async (req, res) => {
  try {
    const { id } = req.params;
    const { additionalDays = 7, reason } = req.body;
    const client = getClient();

    const subRes = await client.execute({
      sql: `SELECT id, trial_ends_at, status FROM saas_subscriptions WHERE shop_id = ?`,
      args: [id],
    });

    if (subRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Subscription not found for this shop.' });
      return;
    }

    const sub = subRes.rows[0] as Record<string, unknown>;
    const currentEnd = sub.trial_ends_at ? new Date(String(sub.trial_ends_at)) : new Date();
    const base = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(base.getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000).toISOString();

    await client.execute({
      sql: `
        UPDATE saas_subscriptions
        SET trial_ends_at = ?, current_period_ends_at = ?, status = 'TRIALING', updated_at = CURRENT_TIMESTAMP
        WHERE shop_id = ?
      `,
      args: [newEnd, newEnd, id],
    });

    await client.execute({
      sql: `UPDATE shops SET status = 'ACTIVE', subscription_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [newEnd, id],
    });

    await recordAdminAudit(
      req.user!.userId,
      'TRIAL_EXTENDED',
      'SHOP',
      id,
      { additionalDays, newEnd, reason: reason || 'Super Admin extended trial' },
      req.ip
    );

    res.json({
      success: true,
      message: `Trial extended by ${additionalDays} days. New trial end date: ${newEnd}`,
      data: { trialEndsAt: newEnd },
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

    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        const canonicalKey = SETTINGS_ALIAS_MAP[item.key] || item.key;
        await client.execute({
          sql: `
            INSERT INTO saas_platform_settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
          `,
          args: [String(canonicalKey), String(item.value)],
        });
      }
    }

    await recordAdminAudit(
      req.user!.userId,
      'PLATFORM_SETTINGS_UPDATED',
      'SETTINGS',
      'GLOBAL',
      { updatedKeys: settings.map((s) => s.key) },
      req.ip
    );

    res.json({ success: true, message: 'Platform settings saved successfully.' });
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
