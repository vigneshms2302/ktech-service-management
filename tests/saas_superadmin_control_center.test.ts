import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.ts';
import { getClient, initializeMultiTenantSchema } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';
import { generateToken, hashPassword } from '../server/middleware/auth.ts';

describe('K-Connect Super-Admin Control Center A-to-Z Suite', () => {
  let superAdminToken: string;
  let regularShopToken: string;

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testSlug = `ccshop${uniqueSuffix}`;
  let provisionedShopId = '';
  let provisionedOwnerId = '';
  let createdTechUserId = '';
  let seededCustomerId = '';
  const legacyUserId = `usr_legacy_${uniqueSuffix}`;

  beforeAll(async () => {
    await initializeMultiTenantSchema();
    await seedInitialPlatform();

    const client = getClient();

    superAdminToken = generateToken({
      userId: 'VND-ROOT-01',
      shopId: 'VENDOR_PLATFORM',
      username: 'superadmin',
      fullName: 'K-Connect Vendor Owner',
      roleId: 'ROLE_SUPER_ADMIN',
      permissions: ['*'],
      isSuperAdmin: true,
    });

    regularShopToken = generateToken({
      userId: 'usr_ktech_owner',
      shopId: 'shop_ktech',
      username: 'admin',
      fullName: 'K-Tech Shop Owner',
      roleId: 'ROLE_OWNER',
      permissions: ['jobs.view', 'customers.view'],
      isSuperAdmin: false,
    });

    // Provision a dedicated test shop via the official Super-Admin API
    const provRes = await request(app)
      .post('/api/admin/shops')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `Control Center Shop ${uniqueSuffix}`,
        slug: testSlug,
        ownerName: 'Arjun Mehta',
        phone: `98940${uniqueSuffix.slice(-5).padStart(5, '0')}`,
        city: 'Chennai',
        maxSeats: 6,
        subscriptionPlan: 'PRO_ANNUAL',
        ownerUsername: 'arjun_owner',
        ownerPassword: 'OwnerPass!99',
        ownerPin: '5678',
      });

    expect([200, 201]).toContain(provRes.status);
    provisionedShopId = String(provRes.body.data.shopId);
    expect(provisionedShopId).toBeTruthy();

    // Insert a legacy user WITHOUT encrypted_recovery_password to test legacy handling + lazy capture
    await client.execute({
      sql: `
        INSERT OR REPLACE INTO users (id, shop_id, username, password_hash, encrypted_recovery_password, pin_code, full_name, role_id, phone, is_active)
        VALUES (?, ?, 'legacy_tech', ?, NULL, '4321', 'Legacy Tech', 'ROLE_TECHNICIAN', '9000011111', 1)
      `,
      args: [legacyUserId, provisionedShopId, hashPassword('LegacyPass!42')],
    });

    // Seed Customer + Address + Device + Repair Job + Invoice for Global Customers & Analytics verification
    seededCustomerId = `cust_cc_${uniqueSuffix}`;
    const addressId = `addr_cc_${uniqueSuffix}`;
    const deviceId = `dev_cc_${uniqueSuffix}`;
    const jobId = `job_cc_${uniqueSuffix}`;
    const invoiceId = `inv_cc_${uniqueSuffix}`;

    await client.execute({
      sql: `
        INSERT INTO customers (id, shop_id, customer_code, full_name, primary_phone, email, customer_type, notes)
        VALUES (?, ?, ?, 'Karthik Subramanian', '9842200112', 'karthik@example.com', 'CORPORATE', 'Priority AMC client')
      `,
      args: [seededCustomerId, provisionedShopId, `CUST-${uniqueSuffix}`],
    });

    await client.execute({
      sql: `
        INSERT INTO customer_addresses (id, shop_id, customer_id, address_line1, city, state, pincode, is_default)
        VALUES (?, ?, ?, '42 Anna Salai', 'Chennai', 'Tamil Nadu', '600002', 1)
      `,
      args: [addressId, provisionedShopId, seededCustomerId],
    });

    await client.execute({
      sql: `
        INSERT INTO devices (id, shop_id, customer_id, equipment_type, brand, model_name, serial_number, encrypted_security_passcode, specs_summary)
        VALUES (?, ?, ?, 'LAPTOP', 'Apple', 'MacBook Pro M3', ?, 'enc:demo', '16GB RAM / 512GB SSD')
      `,
      args: [deviceId, provisionedShopId, seededCustomerId, `SN-${uniqueSuffix}`],
    });

    await client.execute({
      sql: `
        INSERT INTO service_jobs (
          id, shop_id, job_number, customer_id, device_id, service_category,
          current_status, priority, reported_issue, estimated_cost, advance_deposit, created_by
        )
        VALUES (?, ?, ?, ?, ?, 'CHIP_LEVEL_REPAIR', 'IN_REPAIR', 'HIGH', 'No display after spill', 8500, 2000, ?)
      `,
      args: [jobId, provisionedShopId, `JOB-CC-${uniqueSuffix}`, seededCustomerId, deviceId, legacyUserId],
    });

    await client.execute({
      sql: `
        INSERT INTO invoices (
          id, shop_id, invoice_number, invoice_type, customer_id, service_job_id,
          total_amount, amount_paid, balance_due, payment_status, is_void, created_by
        )
        VALUES (?, ?, ?, 'SERVICE_REPAIR', ?, ?, 8500, 5000, 3500, 'PARTIAL', 0, ?)
      `,
      args: [invoiceId, provisionedShopId, `INV-CC-${uniqueSuffix}`, seededCustomerId, jobId, legacyUserId],
    });
  });

  it('enforces Super-Admin authorization across all new control center routes & keeps /api/auth/users redacted', async () => {
    const endpoints = [
      { method: 'get', url: '/api/admin/logins' },
      { method: 'post', url: `/api/admin/shops/${provisionedShopId}/users` },
      { method: 'post', url: `/api/admin/users/${legacyUserId}/reveal-password` },
      { method: 'put', url: `/api/admin/users/${legacyUserId}/status` },
      { method: 'post', url: `/api/admin/shops/${provisionedShopId}/impersonate` },
      { method: 'get', url: '/api/admin/customers' },
      { method: 'get', url: `/api/admin/customers/${seededCustomerId}` },
      { method: 'get', url: '/api/admin/analytics' },
      { method: 'put', url: '/api/admin/profile/password' },
    ] as const;

    for (const ep of endpoints) {
      const res = await (request(app) as any)[ep.method](ep.url)
        .set('Authorization', `Bearer ${regularShopToken}`)
        .send({});
      expect(res.status).toBe(403);
    }

    const authUsersRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${regularShopToken}`);
    expect(authUsersRes.status).toBe(200);
    for (const u of authUsersRes.body.data || []) {
      expect(u.pinCode).toBeUndefined();
      expect(u.passwordHash).toBeUndefined();
      expect(u.encryptedRecoveryPassword).toBeUndefined();
    }
  });

  it('lists cross-tenant logins & supports revealing provisioned passwords, legacy errors, and lazy capture on login', async () => {
    const loginsRes = await request(app)
      .get(`/api/admin/logins?shopId=${provisionedShopId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(loginsRes.status).toBe(200);
    expect(loginsRes.body.success).toBe(true);
    const ownerRow = loginsRes.body.data.find((u: any) => u.username === 'arjun_owner');
    const legacyRow = loginsRes.body.data.find((u: any) => u.id === legacyUserId);
    expect(ownerRow).toBeDefined();
    expect(ownerRow.hasRecoverablePassword).toBe(true);
    expect(ownerRow.pinCode).toBe('5678');
    expect(ownerRow.password).toBeUndefined();
    expect(legacyRow).toBeDefined();
    expect(legacyRow.hasRecoverablePassword).toBe(false);
    provisionedOwnerId = ownerRow.id;

    // Reveal provisioned owner password
    const revealOwnerRes = await request(app)
      .post(`/api/admin/users/${provisionedOwnerId}/reveal-password`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(revealOwnerRes.status).toBe(200);
    expect(revealOwnerRes.body.data.password).toBe('OwnerPass!99');
    expect(revealOwnerRes.body.data.username).toBe('arjun_owner');

    // Legacy user without recovery ciphertext returns LEGACY_HASH_NO_RECOVERY
    const revealLegacyBefore = await request(app)
      .post(`/api/admin/users/${legacyUserId}/reveal-password`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(revealLegacyBefore.status).toBe(400);
    expect(revealLegacyBefore.body.code).toBe('LEGACY_HASH_NO_RECOVERY');

    // Lazy backfill when legacy user signs in normally
    const legacyLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'legacy_tech', password: 'LegacyPass!42', shopSlug: testSlug });
    expect(legacyLoginRes.status).toBe(200);

    // Reveal succeeds immediately after lazy capture
    const revealLegacyAfter = await request(app)
      .post(`/api/admin/users/${legacyUserId}/reveal-password`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(revealLegacyAfter.status).toBe(200);
    expect(revealLegacyAfter.body.data.password).toBe('LegacyPass!42');
  });

  it('creates shop logins, toggles user active status, updates shop details, and blocks duplicate usernames', async () => {
    const createRes = await request(app)
      .post(`/api/admin/shops/${provisionedShopId}/users`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        username: 'tech_cc',
        fullName: 'Vikram Bench Tech',
        roleId: 'ROLE_TECHNICIAN',
        phone: '9888877777',
        password: 'TechPass!88',
        pinCode: '8899',
      });

    expect(createRes.status).toBe(201);
    createdTechUserId = createRes.body.data.id;
    expect(createRes.body.data.hasRecoverablePassword).toBe(true);

    // Duplicate username conflict
    const dupRes = await request(app)
      .post(`/api/admin/shops/${provisionedShopId}/users`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        username: 'tech_cc',
        fullName: 'Duplicate Tech',
        roleId: 'ROLE_TECHNICIAN',
        password: 'TechPass!88',
      });
    expect(dupRes.status).toBe(409);

    // Disable created tech user and verify login fails
    const disableRes = await request(app)
      .put(`/api/admin/users/${createdTechUserId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: false });
    expect(disableRes.status).toBe(200);

    const disabledLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tech_cc', password: 'TechPass!88', shopSlug: testSlug });
    expect([401, 403]).toContain(disabledLoginRes.status);

    // Re-enable user and update shop profile
    const enableRes = await request(app)
      .put(`/api/admin/users/${createdTechUserId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: true });
    expect(enableRes.status).toBe(200);

    const editShopRes = await request(app)
      .put(`/api/admin/shops/${provisionedShopId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        maxSeats: 12,
        city: 'Madurai',
        subscriptionPlan: 'ENTERPRISE',
      });
    expect(editShopRes.status).toBe(200);

    const dossierRes = await request(app)
      .get(`/api/admin/shops/${provisionedShopId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(dossierRes.status).toBe(200);
    expect(dossierRes.body.data.maxSeats).toBe(12);
    expect(dossierRes.body.data.city).toBe('Madurai');
    expect(dossierRes.body.data.workshopGmvInr).toBeGreaterThanOrEqual(8500);
    expect(dossierRes.body.data.collectedInr).toBeGreaterThanOrEqual(5000);
  });

  it('supports audited support impersonation isolated from /api/admin/* and blocks frozen impersonation', async () => {
    const impRes = await request(app)
      .post(`/api/admin/shops/${provisionedShopId}/impersonate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});

    expect(impRes.status).toBe(200);
    const supportToken = impRes.body.data.token;
    expect(impRes.body.data.user.shopId).toBe(provisionedShopId);
    expect(impRes.body.data.user.isSuperAdmin).toBe(false);

    // Works on shop /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.shopId).toBe(provisionedShopId);

    // Blocked on admin routes
    const adminRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(adminRes.status).toBe(403);

    // Frozen shop blocks impersonation with 400
    await request(app)
      .put(`/api/admin/shops/${provisionedShopId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'FROZEN' });

    const frozenImpRes = await request(app)
      .post(`/api/admin/shops/${provisionedShopId}/impersonate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});
    expect(frozenImpRes.status).toBe(400);

    // Unfreeze back to ACTIVE
    await request(app)
      .put(`/api/admin/shops/${provisionedShopId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'ACTIVE' });
  });

  it('returns consistent cross-tenant customer directory, 360 customer dossier, and metrics-aligned analytics', async () => {
    const listCustRes = await request(app)
      .get(`/api/admin/customers?search=Karthik&shopId=${provisionedShopId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listCustRes.status).toBe(200);
    expect(listCustRes.body.totalCount).toBe(1);
    expect(listCustRes.body.data[0].devicesCount).toBe(1);
    expect(listCustRes.body.data[0].jobsCount).toBe(1);
    expect(listCustRes.body.data[0].totalInvoicedInr).toBe(8500);
    expect(listCustRes.body.data[0].totalPaidInr).toBe(5000);

    const custDossierRes = await request(app)
      .get(`/api/admin/customers/${seededCustomerId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(custDossierRes.status).toBe(200);
    expect(custDossierRes.body.data.addresses).toHaveLength(1);
    expect(custDossierRes.body.data.devices).toHaveLength(1);
    expect(custDossierRes.body.data.devices[0].hasPasscode).toBe(true);
    expect(custDossierRes.body.data.jobs).toHaveLength(1);
    expect(custDossierRes.body.data.invoices).toHaveLength(1);
    expect(custDossierRes.body.data.financialSummary).toEqual({
      totalInvoicedInr: 8500,
      totalPaidInr: 5000,
      balanceDueInr: 3500,
    });

    const [metricsRes, analyticsRes] = await Promise.all([
      request(app).get('/api/admin/metrics').set('Authorization', `Bearer ${superAdminToken}`),
      request(app).get('/api/admin/analytics').set('Authorization', `Bearer ${superAdminToken}`),
    ]);

    expect(metricsRes.status).toBe(200);
    expect(analyticsRes.status).toBe(200);

    const m = metricsRes.body.data;
    const o = analyticsRes.body.data.overview;
    expect(o.totalShops).toBe(m.totalShops);
    expect(o.activeShops).toBe(m.activeShops);
    expect(o.totalCustomers).toBe(m.totalCustomers);
    expect(o.totalDevices).toBe(m.totalDevices);
    expect(o.totalJobs).toBe(m.totalJobs);
    expect(o.totalUsers).toBe(m.totalUsers);
    expect(o.totalSaasRevenueInr).toBe(m.totalVerifiedRevenueInr);
    expect(o.totalShopGmvInr).toBe(m.totalShopGmvInr);
    expect(o.totalShopCollectedInr).toBe(m.totalShopCollectedInr);
    expect(analyticsRes.body.data.databaseSnapshot.counts.jobs).toBe(m.totalJobs);
  });

  it('updates Super-Admin password safely and validates current password', async () => {
    const initialPassword = process.env.SUPERADMIN_PASSWORD || 'admin@ktech2026';

    const wrongPassRes = await request(app)
      .put('/api/admin/profile/password')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        currentPassword: 'wrong_password',
        newPassword: 'NewSuperPassword!1',
      });
    expect(wrongPassRes.status).toBe(401);

    const changeRes = await request(app)
      .put('/api/admin/profile/password')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        currentPassword: initialPassword,
        newPassword: 'TempSuperPass!2026',
        fullName: 'K-Connect Owner QA',
      });
    expect(changeRes.status).toBe(200);

    const restoreRes = await request(app)
      .put('/api/admin/profile/password')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        currentPassword: 'TempSuperPass!2026',
        newPassword: initialPassword,
        fullName: 'Platform Administrator',
      });
    expect(restoreRes.status).toBe(200);
  });
});

