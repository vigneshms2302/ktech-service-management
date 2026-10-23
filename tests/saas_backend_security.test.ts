import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, isOriginAllowed } from '../server/index.ts';
import { config, validateConfig } from '../server/config.ts';
import { getClient, initializeMultiTenantSchema } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';
import { generateToken, hashPassword } from '../server/middleware/auth.ts';

describe('K-Connect SaaS — Production Backend Security & Multi-Tenant Hardening', () => {
  let shopAToken: string;
  let shopBToken: string;
  let superAdminToken: string;
  let frozenShopToken: string;

  const testShopA = 'shop_test_alpha';
  const testShopB = 'shop_test_beta';
  const testShopFrozen = 'shop_test_frozen';

  let jobAId: string;
  let customerAId: string;

  beforeAll(async () => {
    // Initialize database schema and base seed
    await initializeMultiTenantSchema();
    await seedInitialPlatform();

    const client = getClient();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Setup Shop Alpha (ACTIVE)
    await client.execute({
      sql: `INSERT OR REPLACE INTO shops (id, name, slug, owner_name, phone, address, status, subscription_ends_at)
            VALUES (?, 'Alpha Shop', 'alpha', 'Alpha Owner', '9876543210', 'Alpha St', 'ACTIVE', ?)`,
      args: [testShopA, expiryDate],
    });

    // 2. Setup Shop Beta (ACTIVE)
    await client.execute({
      sql: `INSERT OR REPLACE INTO shops (id, name, slug, owner_name, phone, address, status, subscription_ends_at)
            VALUES (?, 'Beta Shop', 'beta', 'Beta Owner', '9876543211', 'Beta St', 'ACTIVE', ?)`,
      args: [testShopB, expiryDate],
    });

    // 3. Setup Shop Frozen (FROZEN)
    await client.execute({
      sql: `INSERT OR REPLACE INTO shops (id, name, slug, owner_name, phone, address, status, subscription_ends_at)
            VALUES (?, 'Frozen Shop', 'frozen', 'Frozen Owner', '9876543212', 'Cold St', 'FROZEN', ?)`,
      args: [testShopFrozen, expiryDate],
    });

    // Setup Users
    const passwordHash = hashPassword('password123');

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, is_active)
            VALUES ('usr_alpha_1', ?, 'alpha_user', ?, '1111', 'Alpha Tech', 'ROLE_OWNER', 1)`,
      args: [testShopA, passwordHash],
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, is_active)
            VALUES ('usr_beta_1', ?, 'beta_user', ?, '2222', 'Beta Tech', 'ROLE_OWNER', 1)`,
      args: [testShopB, passwordHash],
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, is_active)
            VALUES ('usr_frozen_1', ?, 'frozen_user', ?, '3333', 'Frozen Tech', 'ROLE_OWNER', 1)`,
      args: [testShopFrozen, passwordHash],
    });

    // Generate verified test tokens
    shopAToken = generateToken({
      userId: 'usr_alpha_1',
      shopId: testShopA,
      username: 'alpha_user',
      fullName: 'Alpha Tech',
      roleId: 'ROLE_OWNER',
      permissions: ['jobs.view', 'jobs.create', 'jobs.edit', 'billing.view'],
    });

    shopBToken = generateToken({
      userId: 'usr_beta_1',
      shopId: testShopB,
      username: 'beta_user',
      fullName: 'Beta Tech',
      roleId: 'ROLE_OWNER',
      permissions: ['jobs.view', 'jobs.create', 'jobs.edit', 'billing.view'],
    });

    superAdminToken = generateToken({
      userId: 'VND-ROOT-01',
      shopId: 'VENDOR_PLATFORM',
      username: 'superadmin',
      fullName: 'Super Admin',
      roleId: 'ROLE_SUPER_ADMIN',
      permissions: ['*'],
      isSuperAdmin: true,
    });

    frozenShopToken = generateToken({
      userId: 'usr_frozen_1',
      shopId: testShopFrozen,
      username: 'frozen_user',
      fullName: 'Frozen Tech',
      roleId: 'ROLE_OWNER',
      permissions: ['*'],
    });

    // Seed a customer, device, and job in Shop Alpha
    customerAId = `CUST-ALPHA-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO customers (id, shop_id, customer_code, full_name, primary_phone, email)
            VALUES (?, ?, 'CUST-A1', 'John Doe', '9842211111', 'john@alpha.com')`,
      args: [customerAId, testShopA],
    });

    const deviceAId = `DEV-ALPHA-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO devices (id, shop_id, customer_id, equipment_type, brand, model_name)
            VALUES (?, ?, ?, 'LAPTOP', 'Dell', 'Inspiron 15')`,
      args: [deviceAId, testShopA, customerAId],
    });

    jobAId = `JOB-ALPHA-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO service_jobs (id, shop_id, job_number, customer_id, device_id, service_category, current_status, reported_issue, created_by)
            VALUES (?, ?, 'JOB-2026-90001', ?, ?, 'HARDWARE_REPAIR', 'RECEIVED', 'Display black screen', 'usr_alpha_1')`,
      args: [jobAId, testShopA, customerAId, deviceAId],
    });
  });

  // ── 1. Environment & Startup Hardening ──────────────────────────────
  describe('1. Environment Configuration & Startup Fail-Fast', () => {
    it('should fail fast in production if JWT_SECRET is missing or empty', () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.JWT_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = '';

        expect(() => validateConfig()).toThrow(/JWT_SECRET environment variable is required in production/i);
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.JWT_SECRET = origSecret;
      }
    });

    it('should allow valid configuration when JWT_SECRET is properly set', () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.JWT_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'strong-random-production-secret-min32chars';

        const conf = validateConfig();
        expect(conf.JWT_SECRET).toBe('strong-random-production-secret-min32chars');
        expect(conf.NODE_ENV).toBe('production');
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.JWT_SECRET = origSecret;
      }
    });
  });

  // ── 2. JWT Verification & Expiration ───────────────────────────────
  describe('2. JWT Verification & Expiration Enforcement', () => {
    it('should reject requests without authorization header with 401', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Authentication required/i);
    });

    it('should reject malformed or tampered JWTs with 401', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid or expired session token/i);
    });

    it('should explicitly reject expired JWT tokens with 401', async () => {
      // Create a token expired 1 hour ago
      const expiredToken = jwt.sign(
        {
          userId: 'usr_alpha_1',
          shopId: testShopA,
          username: 'alpha_user',
          fullName: 'Alpha Tech',
          roleId: 'ROLE_OWNER',
          permissions: ['jobs.view'],
        },
        config.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Session token has expired/i);
    });
  });

  // ── 3. HTTP Security & CORS Allowlist ───────────────────────────────
  describe('3. HTTP Security & CORS Allowlist', () => {
    it('should include Helmet security headers in responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should block unauthorized browser origins when production CORS origin is disallowed', async () => {
      const allowedOrigins = ['http://localhost:5173', 'https://app.kconnectsaas.com'];

      // Production mode must disallow unauthorized external origin
      expect(isOriginAllowed('https://malicious-phishing-site.com', 'production', allowedOrigins)).toBe(false);

      // Production mode must permit whitelisted origin
      expect(isOriginAllowed('https://app.kconnectsaas.com', 'production', allowedOrigins)).toBe(true);

      // Mobile apps, electron shell, and curl (no Origin header) must be permitted
      expect(isOriginAllowed(undefined, 'production', allowedOrigins)).toBe(true);
    });
  });

  // ── 4. Input Validation (Zod) ──────────────────────────────────────
  describe('4. Input Validation with Zod', () => {
    it('should reject login request with missing credentials with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should reject customer creation with missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${shopAToken}`)
        .send({ email: 'not-a-valid-email' }); // Missing fullName and primaryPhone
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeDefined();
    });

    it('should reject job creation with missing device/customer with 400', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${shopAToken}`)
        .send({ reportedIssue: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 5. Multi-Tenant Isolation ──────────────────────────────────────
  describe('5. Multi-Tenant Authorization & Isolation', () => {
    it('Shop A can access its own job', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(jobAId);
    });

    it('Shop B CANNOT read Shop A job (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${shopBToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Job record not found/i);
    });

    it('Shop B CANNOT update Shop A job (returns 404)', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${shopBToken}`)
        .send({ reportedIssue: 'Hacked by Shop B' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Shop B CANNOT update Shop A job status (returns 404)', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobAId}/status`)
        .set('Authorization', `Bearer ${shopBToken}`)
        .send({ newStatus: 'UNDER_INSPECTION' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Shop B CANNOT view Shop A customer profile (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/customers/${customerAId}`)
        .set('Authorization', `Bearer ${shopBToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Shop B CANNOT update Shop A customer profile (returns 404)', async () => {
      const res = await request(app)
        .put(`/api/customers/${customerAId}`)
        .set('Authorization', `Bearer ${shopBToken}`)
        .send({ fullName: 'Hijacked Customer' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 6. Super-Admin Access Control ──────────────────────────────────
  describe('6. Super-Admin Authorization Controls', () => {
    it('should deny regular shop staff access to super-admin metrics with 403', async () => {
      const res = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Vendor Super-Admin access required/i);
    });

    it('should grant verified Super-Admin access to super-admin metrics with 200', async () => {
      const res = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalShops).toBeGreaterThan(0);
    });
  });

  // ── 7. FROZEN / EXPIRED Shop Restrictions ──────────────────────────
  describe('7. FROZEN & EXPIRED Shop Subscription Enforcement', () => {
    it('should reject requests from FROZEN shop users with 403', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${frozenShopToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/subscription is frozen/i);
    });
  });

  // ── 8. Missing Endpoints Verification ───────────────────────────────
  describe('8. Implementation of Step 3 Missing Endpoints', () => {
    it('GET /api/reports/overview returns 200 with structured KPI metrics', async () => {
      const res = await request(app)
        .get('/api/reports/overview')
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobs).toBeDefined();
      expect(res.body.data.finances).toBeDefined();
      expect(res.body.data.inventory).toBeDefined();
      expect(res.body.data.crm).toBeDefined();
    });

    it('GET /api/reports/executive-summary returns 200 with executive stats', async () => {
      const res = await request(app)
        .get('/api/reports/executive-summary')
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalJobs).toBe('number');
      expect(typeof res.body.data.totalRevenue).toBe('number');
    });

    it('GET /api/billing/quotations returns 200 with quotations array', async () => {
      const res = await request(app)
        .get('/api/billing/quotations')
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('PUT /api/jobs/:id updates job fields successfully in current shop', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${shopAToken}`)
        .send({
          priority: 'URGENT',
          reportedIssue: 'Display black screen + overheating fan',
          estimatedCost: 3500,
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify update in DB
      const verifyRes = await request(app)
        .get(`/api/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(verifyRes.body.data.priority).toBe('URGENT');
      expect(verifyRes.body.data.estimatedCost).toBe(3500);
    });

    it('PUT /api/customers/:id updates customer details successfully', async () => {
      const res = await request(app)
        .put(`/api/customers/${customerAId}`)
        .set('Authorization', `Bearer ${shopAToken}`)
        .send({
          fullName: 'Johnathan Doe Updated',
          customerType: 'VIP',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify update in DB
      const verifyRes = await request(app)
        .get(`/api/customers/${customerAId}`)
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(verifyRes.body.data.customer.full_name).toBe('Johnathan Doe Updated');
      expect(verifyRes.body.data.customer.customer_type).toBe('VIP');
    });
  });

  // ── 9. Credential Protection ───────────────────────────────────────
  describe('9. Credential Safety & PIN Redaction', () => {
    it('GET /api/auth/users must never leak cleartext PIN codes', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${shopAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const u of res.body.data) {
        expect(u.pinCode).toBeUndefined();
        expect(u.pin_code).toBeUndefined();
        expect(u.password_hash).toBeUndefined();
        expect(typeof u.hasPin).toBe('boolean');
      }
    });
  });

  // ── 10. Existing Core Functionality ────────────────────────────────
  describe('10. Health Check & Core API Health', () => {
    it('GET /api/health returns HEALTHY status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.service).toBe('K-Connect Cloud SaaS Engine');
    });
  });

  // ── 11. Rate Limiting ──────────────────────────────────────────────
  describe('11. Authentication Rate Limiting', () => {
    it('should enforce rate limits and respond with 429 when threshold exceeded', async () => {
      let lastResponse: any;
      for (let i = 0; i < 22; i++) {
        lastResponse = await request(app)
          .post('/api/auth/pin')
          .send({ shopId: testShopA, pinCode: '9999' });
      }

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.success).toBe(false);
      expect(lastResponse.body.error).toMatch(/Too many authentication attempts/i);
    });
  });
});
