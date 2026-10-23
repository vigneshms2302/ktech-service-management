import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.ts';
import { initializeMultiTenantSchema } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';

describe('K-Connect SaaS Commercial Subscription & GPay Payment Lifecycle', () => {
  let superAdminToken: string;
  let shopToken: string;
  let testShopSlug: string;
  let testClaimId: string;

  beforeAll(async () => {
    await initializeMultiTenantSchema();
    await seedInitialPlatform();

    // Authenticate Super-Admin
    const saLogin = await request(app).post('/api/auth/login').send({
      username: 'superadmin',
      password: 'admin@ktech2026',
      isSuperAdmin: true,
    });
    expect(saLogin.status).toBe(200);
    expect(saLogin.body.success).toBe(true);
    superAdminToken = saLogin.body.token;
  });

  it('1. should provide public pricing plans and payment configuration', async () => {
    const plansRes = await request(app).get('/api/public/plans');
    expect(plansRes.status).toBe(200);
    expect(plansRes.body.success).toBe(true);
    expect(Array.isArray(plansRes.body.data)).toBe(true);
    expect(plansRes.body.data.length).toBeGreaterThan(0);
    expect(plansRes.body.data[0].trialDays).toBe(14);
    expect(plansRes.body.data[0].billingCycle).toBe('ANNUAL');

    const settingsRes = await request(app).get('/api/public/settings');
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.success).toBe(true);
    expect(settingsRes.body.data.upiId).toBeDefined();
    expect(settingsRes.body.data.annualPriceInr).toBeGreaterThan(0);
  });

  it('2. should reject duplicate shop slug during registration', async () => {
    const dupRes = await request(app).post('/api/public/register').send({
      shopName: 'Duplicate Test',
      slug: 'ktech', // existing flagship slug
      ownerName: 'Owner Duplicate',
      phone: '9840012345',
      password: 'password123',
    });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.success).toBe(false);
  });

  it('3. should self-register a new shop with an exact 14-day free trial', async () => {
    testShopSlug = `lab_${Date.now()}`;
    const regRes = await request(app).post('/api/public/register').send({
      shopName: 'Apex Computer Care',
      slug: testShopSlug,
      ownerName: 'Karthik Raja',
      phone: '9842233445',
      email: 'karthik@apexcare.in',
      username: 'apexowner',
      password: 'securepassword123',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
    });

    expect(regRes.status).toBe(200);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.token).toBeDefined();
    expect(regRes.body.shop.daysRemaining).toBe(14);
    shopToken = regRes.body.token;

    // Verify trial status
    const statusRes = await request(app)
      .get('/api/subscription/status')
      .set('Authorization', `Bearer ${shopToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.subscription.status).toBe('TRIALING');
    expect(statusRes.body.data.subscription.trialDaysRemaining).toBe(14);
    expect(statusRes.body.data.shop.status).toBe('ACTIVE');
  });

  it('4. should prevent duplicate UPI transaction submissions', async () => {
    const uniqueUtr = `UTR${Date.now()}`;

    // First submission
    const claimRes1 = await request(app)
      .post('/api/subscription/claim')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        upiTransactionId: uniqueUtr,
        customerNotes: 'Transferred via Google Pay',
      });
    expect(claimRes1.status).toBe(200);
    expect(claimRes1.body.success).toBe(true);
    expect(claimRes1.body.data.status).toBe('PENDING');
    testClaimId = claimRes1.body.data.claimId;

    // Second submission with same UTR
    const claimRes2 = await request(app)
      .post('/api/subscription/claim')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        upiTransactionId: uniqueUtr,
        customerNotes: 'Trying to reuse same transaction ID',
      });
    expect(claimRes2.status).toBe(400);
    expect(claimRes2.body.success).toBe(false);
  });

  it('5. should reject unauthorized non-superadmin approval attempts', async () => {
    const fraudApprove = await request(app)
      .post(`/api/admin/payments/${testClaimId}/approve`)
      .set('Authorization', `Bearer ${shopToken}`); // normal shop token
    expect(fraudApprove.status).toBe(403);
  });

  it('6. should allow Super-Admin to manually verify payment and activate annual subscription', async () => {
    // Super-Admin approves
    const approveRes = await request(app)
      .post(`/api/admin/payments/${testClaimId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Customer workspace verifies ACTIVE status with 365 days
    const statusRes = await request(app)
      .get('/api/subscription/status')
      .set('Authorization', `Bearer ${shopToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.subscription.status).toBe('ACTIVE');
    expect(statusRes.body.data.subscription.daysRemaining).toBeGreaterThanOrEqual(364);

    // Repeated approval must be rejected as already approved
    const repeated = await request(app)
      .post(`/api/admin/payments/${testClaimId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(repeated.status).toBe(400);
    expect(repeated.body.success).toBe(false);
  });

  it('7. should allow Super-Admin to reject invalid claims with mandatory reason', async () => {
    const invalidUtr = `FAKE_UTR_${Date.now()}`;
    const newClaim = await request(app)
      .post('/api/subscription/claim')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        upiTransactionId: invalidUtr,
        customerNotes: 'Invalid test claim',
      });
    expect(newClaim.status).toBe(200);
    const fakeClaimId = newClaim.body.data.claimId;

    // Reject without reason should fail
    const noReason = await request(app)
      .post(`/api/admin/payments/${fakeClaimId}/reject`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});
    expect(noReason.status).toBe(400);

    // Reject with reason
    const rejectRes = await request(app)
      .post(`/api/admin/payments/${fakeClaimId}/reject`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Transaction reference not found in ICICI GPay bank statement.' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');
  });

  it('8. should allow Super-Admin to extend a trial by 7 days', async () => {
    const extendRes = await request(app)
      .post(`/api/admin/shops/shop_${testShopSlug}/extend-trial`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ additionalDays: 7, reason: 'Customer requested more time to test' });
    expect(extendRes.status).toBe(200);
    expect(extendRes.body.success).toBe(true);
  });

  it('9. should allow Super-Admin to update platform settings and record audit log', async () => {
    const updateRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        settings: [{ key: 'payment.upi_id', value: 'kconnect@icici' }],
      });
    expect(updateRes.status).toBe(200);

    const auditRes = await request(app)
      .get('/api/admin/audit-logs?limit=5')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
  });
});
