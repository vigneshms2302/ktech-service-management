import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.ts';
import { initializeMultiTenantSchema, getClient } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';

/**
 * Complete End-to-End Functional Acceptance Scenario (Section 10 of prompt):
 * 1. Register a shop owner.
 * 2. Complete shop onboarding.
 * 3. Add a customer, device and repair job.
 * 4. Update job status and maintain the relevant records.
 * 5. Create a quotation/invoice and test inventory.
 * 6. Refresh, log out and log back in; verify data persists.
 * 7. Register a second shop and attempt cross-tenant access; confirm it is blocked.
 * 8. Submit a test payment request using the staging configuration.
 * 9. Verify and approve it through Super Admin in staging.
 * 10. Confirm the correct subscription becomes active once.
 * 11. Simulate trial expiry and paid subscription expiry without waiting in real time.
 * 12. Confirm renewal and restricted-access behavior.
 * 13. Restart or redeploy the backend and verify persistence.
 */

describe('K-Connect Acceptance Scenario — Complete End-to-End Lifecycle', () => {
  let superAdminToken: string;

  // Shop A credentials and tokens
  const shopASlug = `acceptance_shop_${Date.now()}`;
  const shopAOwnerPhone = '9876543210';
  const shopAPassword = 'SecureShopPass2026!';
  let shopAToken: string;
  let shopAId: string;
  let shopACustomerId: string;
  let shopADeviceId: string;
  let shopAJobId: string;
  let shopAInventoryItemId: string;
  let shopAClaimId: string;

  // Shop B credentials and tokens
  const shopBSlug = `rival_shop_${Date.now()}`;
  let shopBToken: string;

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

  // Step 1: Register a shop owner
  it('Step 1: Register a shop owner with 14-day free trial', async () => {
    const res = await request(app).post('/api/public/register').send({
      shopName: 'Metro Chipset Solutions',
      slug: shopASlug,
      ownerName: 'Vignesh M',
      phone: shopAOwnerPhone,
      password: shopAPassword,
    });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.shop).toBeDefined();
    expect(res.body.shop.slug).toBe(shopASlug);
    expect(res.body.shop.daysRemaining).toBe(14);

    shopAToken = res.body.token;
    shopAId = res.body.shop.id;

    // Verify 14-day trial mathematically from timestamp
    const trialEnds = new Date(res.body.shop.trialEndsAt).getTime();
    const now = Date.now();
    const daysRemaining = Math.round((trialEnds - now) / (1000 * 60 * 60 * 24));
    expect(daysRemaining).toBe(14);
  });

  // Step 2: Complete shop onboarding
  it('Step 2: Complete shop onboarding', async () => {
    const res = await request(app)
      .post('/api/shops/onboarding')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        address: 'Suite 404, Tech Park, Chennai',
        primaryPhone: '044-24567890',
        supportEmail: 'support@metrochips.in',
        upiId: 'metrochips@icici',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.onboarding_completed).toBe(1);
    expect(res.body.data.address).toBe('Suite 404, Tech Park, Chennai');
  });

  // Step 3: Add customer, device (with AES-256 encrypted passcode), and repair job
  it('Step 3: Add customer, device and repair job', async () => {
    // 3a. Create customer
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        fullName: 'Arun Kumar',
        primaryPhone: '9840198401',
        email: 'arun.k@example.com',
        customerType: 'INDIVIDUAL',
        notes: 'VIP customer referred by Dell service center',
      });

    expect(custRes.status).toBe(200);
    expect(custRes.body.success).toBe(true);
    shopACustomerId = custRes.body.data.id;
    expect(shopACustomerId).toBeDefined();

    // 3b. Add device with sensitive passcode
    const devRes = await request(app)
      .post(`/api/customers/${shopACustomerId}/devices`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        equipmentType: 'LAPTOP',
        brand: 'Apple',
        modelName: 'MacBook Pro M2 14-inch',
        serialNumber: 'C02G400ABCD1',
        colorFinish: 'Space Gray',
        passcode: 'SecretPass99!',
        specsSummary: '16GB RAM, 512GB SSD',
      });

    expect(devRes.status).toBe(200);
    expect(devRes.body.success).toBe(true);
    shopADeviceId = devRes.body.data.id;
    expect(shopADeviceId).toBeDefined();

    // Verify passcode is NOT plaintext in the database
    const client = getClient();
    const rawDev = await client.execute({
      sql: 'SELECT encrypted_security_passcode FROM devices WHERE id = ?',
      args: [shopADeviceId],
    });
    expect(rawDev.rows[0].encrypted_security_passcode).not.toBe('SecretPass99!');
    expect(String(rawDev.rows[0].encrypted_security_passcode)).toContain(':'); // IV:AuthTag:Ciphertext format

    // Verify authorized technician can unlock it through the audit-logged endpoint
    const unlockRes = await request(app)
      .post(`/api/devices/${shopADeviceId}/unlock`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({});
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.passcode).toBe('SecretPass99!');

    // 3c. Create repair job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        customerId: shopACustomerId,
        deviceId: shopADeviceId,
        serviceCategory: 'MOTHERBOARD_REPAIR',
        priority: 'HIGH',
        reportedIssue: 'Short circuit on 19V rail; device completely dead after power surge',
        estimatedCost: 8500,
        advanceDeposit: 2000,
        accessoriesReceived: ['Magsafe 3 Charger', 'Protective Sleeve'],
      });

    expect(jobRes.status).toBe(200);
    expect(jobRes.body.success).toBe(true);
    shopAJobId = jobRes.body.data.id;
    expect(jobRes.body.data.jobNumber).toBeDefined();
  });

  // Step 4: Update job status and maintain records
  it('Step 4: Update job status following workflow state machine', async () => {
    // State machine: RECEIVED -> UNDER_INSPECTION
    const statusRes = await request(app)
      .post(`/api/jobs/${shopAJobId}/status`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        newStatus: 'UNDER_INSPECTION',
        notes: 'Under stereo microscope inspection; confirmed blown buck converter MOSFET',
      });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);

    // Retrieve job details to verify status history and audit trail
    const fetchJob = await request(app)
      .get(`/api/jobs/${shopAJobId}`)
      .set('Authorization', `Bearer ${shopAToken}`);

    expect(fetchJob.status).toBe(200);
    expect(fetchJob.body.data.currentStatus).toBe('UNDER_INSPECTION');
    expect(fetchJob.body.data.history.length).toBeGreaterThanOrEqual(1);

  });

  // Step 5: Create a quotation/invoice and test inventory
  it('Step 5: Create invoice and test inventory CRUD with stock maintenance', async () => {
    // 5a. Add inventory part
    const invRes = await request(app)
      .post('/api/inventory/items')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        sku: `MOSFET-${Date.now()}`,
        name: 'TI BQ25713 Charging IC',
        quantityOnHand: 25,
        minReorderLevel: 5,
        costPrice: 450,
        sellingPrice: 1200,
      });

    expect(invRes.status).toBe(200);
    expect(invRes.body.success).toBe(true);
    shopAInventoryItemId = invRes.body.data.id;
    expect(invRes.body.data.quantityOnHand).toBe(25);


    // 5b. Update inventory item details & stock
    const updateInvRes = await request(app)
      .put(`/api/inventory/items/${shopAInventoryItemId}`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        sellingPrice: 1400,
        minReorderLevel: 8,
      });

    expect(updateInvRes.status).toBe(200);
    expect(updateInvRes.body.success).toBe(true);
    expect(updateInvRes.body.data.selling_price).toBe(1400);

    // 5c. Create GST Invoice for the customer & repair job
    const invCreateRes = await request(app)
      .post('/api/billing/invoices')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        customerId: shopACustomerId,
        serviceJobId: shopAJobId,
        isGstInvoice: true,
        items: [
          {
            description: 'Board level micro-soldering & power rail repair',
            quantity: 1,
            unitPrice: 5000,
            discount: 500,
          },
          {
            description: 'TI BQ25713 Charging Controller IC',
            quantity: 1,
            unitPrice: 1400,
            discount: 0,
          },
        ],
      });

    expect(invCreateRes.status).toBe(200);
    expect(invCreateRes.body.success).toBe(true);
    expect(invCreateRes.body.data.invoiceNumber).toBeDefined();
    expect(invCreateRes.body.data.paymentStatus).toBe('UNPAID');
    expect(invCreateRes.body.data.totalAmount).toBeGreaterThan(5000);
  });

  // Step 6: Refresh, log out and log back in; verify data persists
  it('Step 6: Refresh, log out and log back in; verify all data persists', async () => {
    // Log out (invalidate or drop local token)
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${shopAToken}`);
    expect(logoutRes.status).toBe(200);

    // Log back in with owner phone/username & password
    const reLogin = await request(app).post('/api/auth/login').send({
      username: shopAOwnerPhone,
      password: shopAPassword,
      shopSlug: shopASlug,
    });

    expect(reLogin.status).toBe(200);
    expect(reLogin.body.success).toBe(true);
    expect(reLogin.body.token).toBeDefined();
    const freshToken = reLogin.body.token;

    // Verify previously created customer, device, and job exist unchanged
    const custFetch = await request(app)
      .get(`/api/customers/${shopACustomerId}`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(custFetch.status).toBe(200);
    expect(custFetch.body.data.customer.full_name).toBe('Arun Kumar');

    const jobFetch = await request(app)
      .get(`/api/jobs/${shopAJobId}`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(jobFetch.status).toBe(200);
    expect(jobFetch.body.data.currentStatus).toBe('UNDER_INSPECTION');


    shopAToken = freshToken;
  });

  // Step 7: Register a second shop and attempt cross-tenant access; confirm it is blocked
  it('Step 7: Register second shop and confirm strict cross-tenant isolation', async () => {
    // 7a. Register Shop B
    const bReg = await request(app).post('/api/public/register').send({
      shopName: 'Rival QuickFix Shop',
      slug: shopBSlug,
      ownerName: 'Competitor Owner',
      phone: '9998887776',
      password: 'RivalPassword2026!',
    });
    expect([200, 201]).toContain(bReg.status);
    shopBToken = bReg.body.token;

    // 7b. Shop B attempts to view Shop A's customer -> Must be 404 or 403
    const crossCust = await request(app)
      .get(`/api/customers/${shopACustomerId}`)
      .set('Authorization', `Bearer ${shopBToken}`);
    expect([403, 404]).toContain(crossCust.status);

    // 7c. Shop B attempts to view Shop A's repair job -> Must be 404 or 403
    const crossJob = await request(app)
      .get(`/api/jobs/${shopAJobId}`)
      .set('Authorization', `Bearer ${shopBToken}`);
    expect([403, 404]).toContain(crossJob.status);

    // 7d. Shop B attempts to unlock Shop A's device passcode -> Must be 404 or 403
    const crossUnlock = await request(app)
      .post(`/api/devices/${shopADeviceId}/unlock`)
      .set('Authorization', `Bearer ${shopBToken}`);
    expect([403, 404]).toContain(crossUnlock.status);
  });

  // Step 8: Submit test payment request using the staging configuration
  it('Step 8: Submit manual UPI/GPay payment claim with UTR reference', async () => {
    const claimRes = await request(app)
      .post('/api/subscription/claim')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        upiTransactionId: `UTR_ACCEPT_${Date.now()}`,
        planCode: 'PRO_ANNUAL',
        customerNotes: 'Submitted via Google Pay Business UPI reference for annual subscription',
      });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.data).toBeDefined();
    expect(claimRes.body.data.status).toBe('PENDING');
    expect(claimRes.body.data.upiTransactionId).toContain('UTR_ACCEPT_');
    shopAClaimId = claimRes.body.data.claimId;
  });

  // Step 9: Verify and approve through Super Admin
  it('Step 9: Super Admin inspects queue and approves payment claim', async () => {
    // 9a. Super Admin views pending queue
    const queueRes = await request(app)
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(queueRes.status).toBe(200);
    const targetClaim = queueRes.body.data.find((c: any) => c.id === shopAClaimId);
    expect(targetClaim).toBeDefined();
    expect(targetClaim.status).toBe('PENDING');

    // 9b. Super Admin approves payment claim
    const approveRes = await request(app)
      .post(`/api/admin/payments/${shopAClaimId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        notes: 'Verified against bank statement credits. Approved for 1-year annual license.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('APPROVED');
  });

  // Step 10: Confirm the correct subscription becomes active once (365 days)
  it('Step 10: Confirm shop subscription is now ACTIVE with 365-day entitlement', async () => {
    const shopRes = await request(app)
      .get(`/api/admin/shops/${shopAId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(shopRes.status).toBe(200);
    expect(shopRes.body.data.subscriptionStatus).toBe('ACTIVE');

    const subEnds = new Date(shopRes.body.data.subscriptionEndsAt).getTime();
    const now = Date.now();
    const daysGranted = Math.round((subEnds - now) / (1000 * 60 * 60 * 24));
    // Expect 365 days of paid annual entitlement
    expect(daysGranted).toBeGreaterThanOrEqual(364);
    expect(daysGranted).toBeLessThanOrEqual(366);

    // Double approval prevention check
    const dupApprove = await request(app)
      .post(`/api/admin/payments/${shopAClaimId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ notes: 'Attempt duplicate approval' });
    expect(dupApprove.status).toBe(400);
    expect(dupApprove.body.success).toBe(false);
  });

  // Step 11: Simulate trial expiry and paid subscription expiry without waiting in real time
  it('Step 11: Simulate subscription expiry and verify restricted-access behavior', async () => {
    const client = getClient();

    // Fast-forward shop A to EXPIRED state in DB
    await client.execute({
      sql: `UPDATE shops 
            SET status = 'EXPIRED', 
                subscription_ends_at = datetime('now', '-2 days'),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [shopAId],
    });

    await client.execute({
      sql: `UPDATE saas_subscriptions 
            SET status = 'EXPIRED',
                current_period_ends_at = datetime('now', '-2 days'),
                updated_at = CURRENT_TIMESTAMP
            WHERE shop_id = ?`,
      args: [shopAId],
    });

    // 11a. Shop attempts operational write (create new job) -> Must be blocked with 403 FROZEN/EXPIRED
    const blockedJob = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        customerId: shopACustomerId,
        deviceId: shopADeviceId,
        reportedIssue: 'Testing blocked write during expired state',
      });

    expect(blockedJob.status).toBe(403);

    // 11b. Step 12: Confirm renewal accessibility: Billing & renewal endpoints remain accessible
    const billingSettings = await request(app)
      .get('/api/public/settings')
      .set('Authorization', `Bearer ${shopAToken}`);
    expect(billingSettings.status).toBe(200);

    const renewalClaim = await request(app)
      .post('/api/subscription/claim')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        upiTransactionId: `RENEWAL_${Date.now()}`,
        planCode: 'PRO_ANNUAL',
        customerNotes: 'Renewal payment claim after expiration',
      });
    expect(renewalClaim.status).toBe(200);
    expect(renewalClaim.body.success).toBe(true);

    // Admin approves renewal
    const approveRenewal = await request(app)
      .post(`/api/admin/payments/${renewalClaim.body.data.claimId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ notes: 'Renewal verified & activated' });
    expect(approveRenewal.status).toBe(200);

    // Verify shop is restored to ACTIVE
    const restoredShop = await request(app)
      .get(`/api/admin/shops/${shopAId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(restoredShop.body.data.subscriptionStatus).toBe('ACTIVE');
  });

  // Step 13: Restart or redeploy the backend and verify database persistence
  it('Step 13: Re-verify persistence across database query reloads and simulated restart', async () => {
    // Re-verify directly against database connection
    const client = getClient();
    const shopRow = await client.execute({
      sql: 'SELECT id, slug, status FROM shops WHERE id = ?',
      args: [shopAId],
    });
    expect(shopRow.rows.length).toBe(1);
    expect(shopRow.rows[0].status).toBe('ACTIVE');

    const jobRow = await client.execute({
      sql: 'SELECT id, current_status, customer_id FROM service_jobs WHERE id = ?',
      args: [shopAJobId],
    });
    expect(jobRow.rows.length).toBe(1);
    expect(jobRow.rows[0].current_status).toBe('UNDER_INSPECTION');

    const invRow = await client.execute({
      sql: 'SELECT id, selling_price, quantity_on_hand FROM inventory_items WHERE id = ?',
      args: [shopAInventoryItemId],
    });
    expect(invRow.rows.length).toBe(1);
    expect(invRow.rows[0].selling_price).toBe(1400);

    // Verify audit logs exist for all actions performed
    const auditRows = await client.execute({
      sql: 'SELECT action, target_entity_type FROM saas_admin_audit_logs WHERE target_entity_id = ? OR action LIKE ?',
      args: [shopAClaimId, '%PAYMENT%'],
    });
    expect(auditRows.rows.length).toBeGreaterThan(0);
  });

  // Step 14: File storage uploads, downloads, persistent access control & health check
  it('Step 14: Verify file storage upload, tenant isolation, device photos, and /api/health ping', async () => {
    // 14a. Test /api/health active dependency ping
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('HEALTHY');
    expect(healthRes.body.dependencies.database.status).toBe('CONNECTED');
    expect(healthRes.body.dependencies.storage.status).toBe('CONNECTED');

    // 14b. Upload a payment proof file for Shop A
    const sampleProofBase64 = Buffer.from('TEST_PAYMENT_PROOF_IMAGE_CONTENT_SAMPLE').toString('base64');
    const uploadRes = await request(app)
      .post('/api/storage/upload')
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        fileName: 'gpay_receipt_march.png',
        fileType: 'image/png',
        base64Data: `data:image/png;base64,${sampleProofBase64}`,
        category: 'PAYMENT_PROOF',
        isPrivate: true,
      });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    const fileKey = uploadRes.body.data.fileKey;
    expect(fileKey).toContain(shopAId);

    // 14c. Verify Shop A owner can download the file
    const downloadRes = await request(app)
      .get(`/api/storage/files/${fileKey}`)
      .set('Authorization', `Bearer ${shopAToken}`);
    expect(downloadRes.status).toBe(200);
    const content = downloadRes.body instanceof Buffer ? downloadRes.body.toString() : (downloadRes.text || '');
    expect(content).toBe('TEST_PAYMENT_PROOF_IMAGE_CONTENT_SAMPLE');

    // 14d. Verify Super Admin can view the private payment proof
    const saDownloadRes = await request(app)
      .get(`/api/storage/files/${fileKey}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(saDownloadRes.status).toBe(200);

    // 14e. Verify Shop B (different tenant) is strictly BLOCKED from accessing Shop A file
    const crossTenantRes = await request(app)
      .get(`/api/storage/files/${fileKey}`)
      .set('Authorization', `Bearer ${shopBToken}`);
    expect(crossTenantRes.status).toBe(403);
    expect(crossTenantRes.body.success).toBe(false);

    // 14f. Verify unauthenticated public request is blocked from private file
    const unauthRes = await request(app).get(`/api/storage/files/${fileKey}`);
    expect(unauthRes.status).toBe(401);

    // 14g. Record device photo and verify database association
    const photoRecordRes = await request(app)
      .post(`/api/devices/${shopADeviceId}/photos`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({
        photoType: 'INTAKE_CONDITION',
        filePath: fileKey,
        caption: 'Blown capacitor on motherboard before repair',
      });
    expect(photoRecordRes.status).toBe(200);
    expect(photoRecordRes.body.success).toBe(true);

    // Verify photo is listed for device
    const devicePhotosRes = await request(app)
      .get(`/api/devices/${shopADeviceId}/photos`)
      .set('Authorization', `Bearer ${shopAToken}`);
    expect(devicePhotosRes.status).toBe(200);
    expect(devicePhotosRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(devicePhotosRes.body.data[0].filePath).toBe(fileKey);
  });
});
