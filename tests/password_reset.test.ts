import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.ts';
import { getClient, initializeMultiTenantSchema } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';
import { generateToken, hashPassword } from '../server/middleware/auth.ts';
import { decryptSecret } from '../server/security/crypto.ts';

describe('Password Reset & Forgot Password Full Verification Suite', () => {
  let superAdminToken: string;
  let shopOwnerToken: string;
  let techStaffToken: string;

  const testSuffix = Date.now().toString().slice(-6);
  const testShopSlug = `shop_${testSuffix}`;
  const testShopId = `shop_id_${testSuffix}`;
  const ownerUserId = `usr_owner_${testSuffix}`;
  const techUserId = `usr_tech_${testSuffix}`;
  const testOwnerPhone = `97${Date.now().toString().slice(-8)}`;
  const testOwnerEmail = `owner_${testSuffix}@repairlab.in`;
  const testTechEmail = `tech_${testSuffix}@gmail.com`;

  beforeAll(async () => {
    await initializeMultiTenantSchema();
    await seedInitialPlatform();

    const client = getClient();

    // Ensure baseline superadmin password is clean for concurrent test suites
    await client.execute({
      sql: `UPDATE vendor_admins SET password_hash = ? WHERE username = 'superadmin'`,
      args: [hashPassword(process.env.SUPERADMIN_PASSWORD || 'admin@ktech2026')],
    });

    // Create isolated Super-Admin for recovery key tests to prevent cross-suite concurrency collisions
    await client.execute({
      sql: `INSERT INTO vendor_admins (id, username, password_hash, full_name, email)
            VALUES ('VND-TEST-RESET', 'qa_superadmin', ?, 'QA Reset Admin', 'qa@kconnect.cloud')
            ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash`,
      args: [hashPassword('QAPassword123!')],
    });

    // Create isolated test shop with owner and staff technician
    await client.execute({
      sql: `INSERT INTO shops (id, name, slug, owner_name, phone, email, address, city, state, status, subscription_ends_at)
            VALUES (?, 'Alpha Repair Hub', ?, 'Alpha Owner', ?, ?, '123 Cross Cut Rd', 'Coimbatore', 'Tamil Nadu', 'ACTIVE', datetime('now', '+365 days'))`,
      args: [testShopId, testShopSlug, testOwnerPhone, testOwnerEmail],
    });

    await client.execute({
      sql: `INSERT INTO users (id, shop_id, username, password_hash, full_name, role_id, phone, pin_code, is_active)
            VALUES (?, ?, 'alphaowner', ?, 'Alpha Hub Owner', 'ROLE_OWNER', ?, '1234', 1)`,
      args: [ownerUserId, testShopId, hashPassword('InitialPass123'), testOwnerPhone],
    });

    await client.execute({
      sql: `INSERT INTO users (id, shop_id, username, password_hash, full_name, role_id, phone, email, pin_code, is_active)
            VALUES (?, ?, 'alphatech', ?, 'Mano Tech', 'ROLE_TECHNICIAN', '9876500099', ?, '5555', 1)`,
      args: [techUserId, testShopId, hashPassword('TechSecret456'), testTechEmail],
    });

    superAdminToken = generateToken({
      userId: 'VND-ROOT-01',
      shopId: 'VENDOR_PLATFORM',
      username: 'superadmin',
      fullName: 'K-Connect Super Admin',
      roleId: 'ROLE_SUPER_ADMIN',
      permissions: ['*'],
      isSuperAdmin: true,
    });

    shopOwnerToken = generateToken({
      userId: ownerUserId,
      shopId: testShopId,
      username: 'alphaowner',
      fullName: 'Alpha Hub Owner',
      roleId: 'ROLE_OWNER',
      permissions: ['*'],
      isSuperAdmin: false,
    });

    techStaffToken = generateToken({
      userId: techUserId,
      shopId: testShopId,
      username: 'alphatech',
      fullName: 'Mano Tech',
      roleId: 'ROLE_TECHNICIAN',
      permissions: ['jobs.view'],
      isSuperAdmin: false,
    });
  });

  it('1. Forgot-password request creation by shop slug + username (never leaks OTP unauthenticated)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphatech',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestSubmitted).toBe(true);
    // Crucial: unauthenticated public response must NEVER leak plaintext OTP or reset token!
    expect(res.body.data.otp).toBeUndefined();
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.resetUrl).toBeUndefined();

    // Verify record exists in DB with encrypted OTP and token
    const client = getClient();
    const tokenRes = await client.execute({
      sql: `SELECT * FROM password_reset_tokens WHERE user_id = ? AND status = 'PENDING'`,
      args: [techUserId],
    });
    expect(tokenRes.rows.length).toBe(1);
    const row = tokenRes.rows[0];
    expect(row.encrypted_otp).toBeTruthy();
    const decryptedOtp = decryptSecret(String(row.encrypted_otp));
    expect(/^\d{6}$/.test(decryptedOtp)).toBe(true);
  });

  it('2. Forgot-password request creation by registered phone/email without knowing username or slug', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        mode: 'SHOP_USER',
        contact: testOwnerPhone,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestSubmitted).toBe(true);

    const client = getClient();
    const tokenRes = await client.execute({
      sql: `SELECT * FROM password_reset_tokens WHERE user_id = ? AND status = 'PENDING'`,
      args: [ownerUserId],
    });
    expect(tokenRes.rows.length).toBe(1);
  });

  it('2b. Forgot-password request creation by staff Gmail ID without knowing shop ID or username', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({
        mode: 'SHOP_USER',
        contact: testTechEmail,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestSubmitted).toBe(true);

    const client = getClient();
    const tokenRes = await client.execute({
      sql: `SELECT * FROM password_reset_tokens WHERE user_id = ? AND status = 'PENDING'`,
      args: [techUserId],
    });
    expect(tokenRes.rows.length).toBe(1);
    expect(tokenRes.rows[0].username).toBe('alphatech');
  });

  it('3. Brute force protection: rejects wrong OTP and locks request after 5 attempts', async () => {
    // 4 failed attempts with wrong OTP
    for (let i = 1; i <= 4; i++) {
      const failRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          mode: 'SHOP_USER',
          shopSlug: testShopSlug,
          username: 'alphatech',
          otp: '000000',
          newPassword: 'BrandNewPassword1',
        });
      expect(failRes.status).toBe(400);
      expect(failRes.body.error).toContain('remaining');
    }

    // 5th failed attempt triggers lockout
    const lockRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphatech',
        otp: '000000',
        newPassword: 'BrandNewPassword1',
      });
    expect(lockRes.status).toBe(429);
    expect(lockRes.body.error).toContain('locked');

    // Confirm status was marked CANCELLED in DB
    const client = getClient();
    const checkRes = await client.execute({
      sql: `SELECT status FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [techUserId],
    });
    expect(checkRes.rows[0].status).toBe('CANCELLED');
  });

  it('4. Successful OTP verification & password reset syncs login & encrypted recovery vault', async () => {
    // Initiate fresh request
    await request(app)
      .post('/api/auth/forgot-password')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphatech',
      });

    const client = getClient();
    const tokenRes = await client.execute({
      sql: `SELECT encrypted_otp FROM password_reset_tokens WHERE user_id = ? AND status = 'PENDING'`,
      args: [techUserId],
    });
    const validOtp = decryptSecret(String(tokenRes.rows[0].encrypted_otp));

    // Verify OTP without consuming
    const verifyRes = await request(app)
      .post('/api/auth/reset-password/verify')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphatech',
        otp: validOtp,
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.valid).toBe(true);

    // Complete reset with valid OTP
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphatech',
        otp: validOtp,
        newPassword: 'SuperStrongPassword2026',
        newPin: '9999',
      });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Log in with new credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        shopSlug: testShopSlug,
        username: 'alphatech',
        password: 'SuperStrongPassword2026',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeTruthy();

    // Verify encrypted recovery vault in users table was synced
    const userRes = await client.execute({
      sql: `SELECT encrypted_recovery_password, pin_code FROM users WHERE id = ?`,
      args: [techUserId],
    });
    const decryptedVault = decryptSecret(String(userRes.rows[0].encrypted_recovery_password));
    expect(decryptedVault).toBe('SuperStrongPassword2026');
    expect(userRes.rows[0].pin_code).toBe('9999');
  });

  it('5. Direct reset link token verification, completion & replay protection', async () => {
    // Initiate request for owner
    await request(app)
      .post('/api/auth/forgot-password')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphaowner',
      });

    const client = getClient();
    const tokenRes = await client.execute({
      sql: `SELECT encrypted_token FROM password_reset_tokens WHERE user_id = ? AND status = 'PENDING'`,
      args: [ownerUserId],
    });
    const rawToken = decryptSecret(String(tokenRes.rows[0].encrypted_token));

    // Verify direct token on page load
    const verifyRes = await request(app)
      .post('/api/auth/reset-password/verify')
      .send({ token: rawToken });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.valid).toBe(true);
    expect(verifyRes.body.data.username).toBe('alphaowner');

    // Reset password via token
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'OwnerNewPassword2026!',
      });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Token replay rejection: using the same token again must fail
    const replayRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'AnotherPassword999',
      });
    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error).toContain('invalid or has already been used');
  });

  it('6. Authenticated self-service password change (/api/auth/change-password)', async () => {
    // Owner changing own password with valid current password
    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${shopOwnerToken}`)
      .send({
        currentPassword: 'OwnerNewPassword2026!',
        newPassword: 'OwnerFinalPassword888',
        newPin: '4321',
      });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Reject wrong current password
    const failRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${shopOwnerToken}`)
      .send({
        currentPassword: 'WrongCurrentPassword',
        newPassword: 'SomeOtherPassword123',
      });
    expect(failRes.status).toBe(401);
  });

  it('7. Shop Owner staff management: views pending reset requests & resets staff password', async () => {
    // Create pending reset request for technician
    await request(app)
      .post('/api/auth/forgot-password')
      .send({
        mode: 'SHOP_USER',
        shopSlug: testShopSlug,
        username: 'alphatech',
      });

    // Shop Owner lists reset requests for their shop
    const listRes = await request(app)
      .get('/api/auth/password-reset-requests')
      .set('Authorization', `Bearer ${shopOwnerToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0].otp).toBeTruthy();
    expect(listRes.body.data[0].username).toBe('alphatech');

    // Non-owner staff (technician) cannot view reset requests
    const techDeniedRes = await request(app)
      .get('/api/auth/password-reset-requests')
      .set('Authorization', `Bearer ${techStaffToken}`);
    expect(techDeniedRes.status).toBe(403);

    // Shop Owner issues new credentials for staff member
    const resetStaffRes = await request(app)
      .post(`/api/auth/users/${techUserId}/reset-password`)
      .set('Authorization', `Bearer ${shopOwnerToken}`)
      .send({
        newPassword: 'StaffTemporaryPass99',
        newPin: '7777',
      });
    expect(resetStaffRes.status).toBe(200);
    expect(resetStaffRes.body.data.temporaryPassword).toBe('StaffTemporaryPass99');
    expect(resetStaffRes.body.data.pinCode).toBe('7777');
  });

  it('8. Super-Admin password reset queue & dismissal', async () => {
    const listRes = await request(app)
      .get('/api/admin/password-reset-requests')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    if (listRes.body.data.length > 0) {
      const targetReqId = listRes.body.data[0].id;
      const dismissRes = await request(app)
        .post(`/api/admin/password-reset-requests/${targetReqId}/dismiss`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(dismissRes.status).toBe(200);
      expect(dismissRes.body.success).toBe(true);
    }
  });

  it('9. Super-Admin recovery key flow', async () => {
    process.env.SUPERADMIN_RECOVERY_KEY = 'emergency-recovery-key-xyz-2026';

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        mode: 'SUPER_ADMIN',
        username: 'qa_superadmin',
        recoveryKey: 'emergency-recovery-key-xyz-2026',
        newPassword: 'NewAdminSecretPass2026!',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Test cold-start seedInitialPlatform() preserving changed password
    await seedInitialPlatform();

    const client = getClient();
    const adminRes = await client.execute(`SELECT password_hash FROM vendor_admins WHERE username = 'qa_superadmin'`);
    expect(adminRes.rows.length).toBe(1);

    // Logging in with the new password succeeds even after seedInitialPlatform() re-ran!
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        isSuperAdmin: true,
        username: 'qa_superadmin',
        password: 'NewAdminSecretPass2026!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeTruthy();

    delete process.env.SUPERADMIN_RECOVERY_KEY;
  }, 15000);
});
