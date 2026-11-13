import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.ts';
import { initializeMultiTenantSchema, getClient } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';

describe('Shop Registration Verification & Unique Credentials Suite', () => {
  const runId = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const shopSlug = `verify_shop_${runId}`;
  // Generate random 10-digit phone
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const shopPhone = `984${randomSuffix}1`;
  const shopEmail = `owner_${runId}@ktechlab.com`;

  let verificationId: string;
  let devEmailOtp: string;
  let devPhoneOtp: string;
  let ownerToken: string;
  let shopId: string;

  beforeAll(async () => {
    await initializeMultiTenantSchema();
    await seedInitialPlatform();
  });

  it('1. Rejects registration when email is missing or empty', async () => {
    const res = await request(app).post('/api/public/register').send({
      shopName: 'No Email Shop',
      slug: `noemail_${runId}`,
      ownerName: 'No Email Owner',
      phone: `984${Math.floor(100000 + Math.random() * 900000)}2`,
      username: 'admin',
      password: 'Password123!',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('2. Dispatches verification codes via POST /api/public/send-verification', async () => {
    const res = await request(app).post('/api/public/send-verification').send({
      email: shopEmail,
      phone: shopPhone,
      shopName: 'Alpha Micro Systems',
      ownerName: 'Alpha Owner',
      slug: shopSlug,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationId).toBeDefined();
    expect(res.body.data.maskedEmail).toContain('***');
    expect(res.body.data.maskedPhone).toContain('***');
    expect(res.body.data.devEmailOtp).toBeDefined();
    expect(res.body.data.devPhoneOtp).toBeDefined();

    verificationId = res.body.data.verificationId;
    devEmailOtp = res.body.data.devEmailOtp;
    devPhoneOtp = res.body.data.devPhoneOtp;
  });

  it('3. Rejects invalid OTP in POST /api/public/verify-code', async () => {
    const res = await request(app).post('/api/public/verify-code').send({
      verificationId,
      emailOtp: '000000',
      phoneOtp: '111111',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. Rejects registration with wrong OTP codes in POST /api/public/register', async () => {
    const res = await request(app).post('/api/public/register').send({
      shopName: 'Alpha Micro Systems',
      slug: shopSlug,
      ownerName: 'Alpha Owner',
      phone: shopPhone,
      email: shopEmail,
      username: 'admin',
      password: 'SecureAdminPass2026!',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      verificationId,
      emailOtp: '999999',
      phoneOtp: '888888',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. Successfully registers shop with valid OTP codes and starts 14-day trial', async () => {
    const res = await request(app).post('/api/public/register').send({
      shopName: 'Alpha Micro Systems',
      slug: shopSlug,
      ownerName: 'Alpha Owner',
      phone: shopPhone,
      email: shopEmail,
      username: 'alphaadmin',
      password: 'SecureAdminPass2026!',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
      verificationId,
      emailOtp: devEmailOtp,
      phoneOtp: devPhoneOtp,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.shop).toBeDefined();
    expect(res.body.shop.slug).toBe(shopSlug);

    ownerToken = res.body.token;
    shopId = res.body.shop.id;

    // Verify shop record in database has mandatory email & phone
    const client = getClient();
    const shopRow = await client.execute({
      sql: `SELECT id, name, email, phone, status, subscription_plan FROM shops WHERE id = ?`,
      args: [shopId],
    });
    expect(shopRow.rows.length).toBe(1);
    expect(shopRow.rows[0].email).toBe(shopEmail.toLowerCase());
    expect(shopRow.rows[0].status).toBe('ACTIVE');

    // Verify owner user has email bound
    const userRow = await client.execute({
      sql: `SELECT id, username, email, phone, role_id FROM users WHERE shop_id = ? AND role_id = 'ROLE_OWNER'`,
      args: [shopId],
    });
    expect(userRow.rows.length).toBe(1);
    expect(userRow.rows[0].username).toBe('alphaadmin');
    expect(userRow.rows[0].email).toBe(shopEmail.toLowerCase());
    expect(userRow.rows[0].phone).toBe(shopPhone);
  });

  it('6. Blocks duplicate shop registration using the same mobile number (409 Conflict)', async () => {
    const res = await request(app).post('/api/public/send-verification').send({
      email: `other_owner_${runId}@ktechlab.com`,
      phone: shopPhone, // Same phone as registered shop
      shopName: 'Duplicate Phone Shop',
      ownerName: 'Another Owner',
      slug: `dup_phone_${runId}`,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.field).toBe('phone');
    expect(res.body.error).toContain('Mobile number is already registered');
  });

  it('7. Blocks duplicate shop registration using the same email address (409 Conflict)', async () => {
    const res = await request(app).post('/api/public/send-verification').send({
      email: shopEmail, // Same email as registered shop
      phone: `984${Math.floor(100000 + Math.random() * 900000)}9`,
      shopName: 'Duplicate Email Shop',
      ownerName: 'Another Owner',
      slug: `dup_email_${runId}`,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.field).toBe('email');
    expect(res.body.error).toContain('already registered');
  });

  it('8. Shop owner can create an employee login (Technician) with employee Gmail & PIN', async () => {
    const techEmail = `tech.suresh_${runId}@gmail.com`;
    const techPhone = `984${Math.floor(100000 + Math.random() * 900000)}8`;

    const createRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        username: `tech_suresh_${runId}`,
        fullName: 'Suresh Technician',
        roleId: 'ROLE_TECHNICIAN',
        password: 'TechPassword2026!',
        pinCode: '4321',
        email: techEmail,
        phone: techPhone,
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    // Verify employee user in database
    const client = getClient();
    const techRow = await client.execute({
      sql: `SELECT id, username, email, phone, role_id, pin_code, is_active FROM users WHERE shop_id = ? AND username = ?`,
      args: [shopId, `tech_suresh_${runId}`],
    });
    expect(techRow.rows.length).toBe(1);
    expect(techRow.rows[0].role_id).toBe('ROLE_TECHNICIAN');
    expect(techRow.rows[0].email).toBe(techEmail);
    expect(techRow.rows[0].pin_code).toBe('4321');
    expect(techRow.rows[0].is_active).toBe(1);

    // Verify employee can log in
    const loginRes = await request(app).post('/api/auth/login').send({
      shopSlug,
      username: `tech_suresh_${runId}`,
      password: 'TechPassword2026!',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.user.roleId).toBe('ROLE_TECHNICIAN');
    expect(loginRes.body.user.email).toBe(techEmail);
  });
});
