import { getClient } from './database.ts';
import { hashPassword } from '../middleware/auth.ts';

export async function seedInitialPlatform(): Promise<void> {
  const client = getClient();

  // 1. Seed Roles & Permissions
  const roles = [
    { id: 'ROLE_OWNER', name: 'Shop Owner / Admin', description: 'Full business & financial ownership' },
    { id: 'ROLE_RECEPTION', name: 'Front Desk / Reception', description: 'Customer intake, tickets & billing' },
    { id: 'ROLE_TECHNICIAN', name: 'Service Technician', description: 'Hardware diagnosis & repairs' },
    { id: 'ROLE_ACCOUNTS', name: 'Accountant', description: 'GST reports & financial audits' },
  ];

  for (const role of roles) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?);`,
      args: [role.id, role.name, role.description],
    });
  }

  const permissions = [
    { id: 'p1', code: 'jobs.view', module: 'JOBS', description: 'View service jobs' },
    { id: 'p2', code: 'jobs.create', module: 'JOBS', description: 'Create new service tickets' },
    { id: 'p3', code: 'jobs.edit', module: 'JOBS', description: 'Edit job details & status' },
    { id: 'p4', code: 'jobs.delete', module: 'JOBS', description: 'Delete service jobs' },
    { id: 'p5', code: 'billing.create', module: 'BILLING', description: 'Generate invoices & payments' },
    { id: 'p6', code: 'billing.view', module: 'BILLING', description: 'View financial ledgers' },
    { id: 'p7', code: 'inventory.manage', module: 'INVENTORY', description: 'Manage spare parts' },
    { id: 'p8', code: 'credentials.view', module: 'SECURITY', description: 'View device passcodes' },
    { id: 'p9', code: 'settings.edit', module: 'SETTINGS', description: 'Modify shop configurations' },
  ];

  for (const perm of permissions) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO permissions (id, code, module, description) VALUES (?, ?, ?, ?);`,
      args: [perm.id, perm.code, perm.module, perm.description],
    });
    // Grant all to ROLE_OWNER
    await client.execute({
      sql: `INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES (?, 'ROLE_OWNER', ?);`,
      args: [`rp-owner-${perm.id}`, perm.id],
    });
  }

  // 2. Seed Vendor Super-Admin (Vendor Portal)
  const rawAdminPassword = process.env.SUPERADMIN_PASSWORD || 'admin@ktech2026';
  const adminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
  const superAdminPasswordHash = hashPassword(rawAdminPassword);

  if (process.env.NODE_ENV === 'production' && !process.env.SUPERADMIN_PASSWORD) {
    console.warn(
      '[SECURITY WARNING] SUPERADMIN_PASSWORD environment variable is not configured! ' +
      'Please supply SUPERADMIN_PASSWORD in production environment settings.'
    );
  }

  await client.execute({
    sql: `INSERT OR IGNORE INTO vendor_admins (id, username, password_hash, full_name, email)
          VALUES ('VND-ROOT-01', ?, ?, 'Platform Administrator', 'vendor@ktech.com');`,
    args: [adminUsername, superAdminPasswordHash],
  });

  // 3. Seed Flagship Customer Shop: K-Tech Computers
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await client.execute({
    sql: `INSERT OR IGNORE INTO shops (id, name, slug, owner_name, phone, email, gstin, address, city, state, pincode, status, max_seats, subscription_plan, subscription_ends_at)
          VALUES ('shop_ktech', 'K-Tech Computers', 'ktech', 'K-Tech Owner', '9842200000', 'support@ktech.com', '33AAAAA0000A1Z5', 'Cross Cut Road, Gandhipuram', 'Coimbatore', 'Tamil Nadu', '641012', 'ACTIVE', 5, 'ENTERPRISE_LIFETIME', ?);`,
    args: [oneYearFromNow],
  });

  // 4. Seed Shop Owner Account for K-Tech
  const ownerPasswordHash = hashPassword('admin123');
  await client.execute({
    sql: `INSERT OR IGNORE INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, phone, is_active)
          VALUES ('usr_ktech_owner', 'shop_ktech', 'admin', ?, '1234', 'K-Tech Shop Administrator', 'ROLE_OWNER', '9842200000', 1);`,
    args: [ownerPasswordHash],
  });

  // Seed sample technician
  const techPasswordHash = hashPassword('tech123');
  await client.execute({
    sql: `INSERT OR IGNORE INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, phone, is_active)
          VALUES ('usr_ktech_tech1', 'shop_ktech', 'tech1', ?, '2222', 'Suresh Kumar (Chip-Level Tech)', 'ROLE_TECHNICIAN', '9842211111', 1);`,
    args: [techPasswordHash],
  });

  // 5. Seed SaaS Commercial Plan (Default Annual Plan)
  const featuresJson = JSON.stringify([
    'Complete 13-Stage Hardware Repair Workflow',
    'GST Invoicing, Estimates & Thermal Receipts',
    'Spare Parts Inventory & Salvage Teardown Tracking',
    'Instant Customer WhatsApp Updates & QR Tracker',
    'Multi-Technician Performance & Commission Metrics',
    'Encrypted Device Passcode Vault (AES-256)',
    'Real-time Multi-Device Cloud Sync',
    '5 Staff Workstation Seats Included',
    'Automated Daily Cloud Backups',
    'Priority Support & Annual Software Updates'
  ]);

  await client.execute({
    sql: `INSERT OR IGNORE INTO saas_plans (id, name, code, description, price_inr, billing_cycle, trial_days, max_seats, features_json, is_active)
          VALUES ('plan_pro_annual', 'K-Connect Professional Annual', 'PRO_ANNUAL', 'Complete repair lab operating system with unlimited service tickets', 14999.0, 'ANNUAL', 14, 5, ?, 1);`,
    args: [featuresJson],
  });

  // 6. Seed Platform Settings (Super-Admin configurable)
  const defaultSettings = [
    { key: 'payment.upi_id', value: process.env.DEFAULT_UPI_ID || 'ktech@upi', category: 'PAYMENT', description: 'Vendor UPI VPA for subscription payments' },
    { key: 'payment.payee_name', value: process.env.DEFAULT_PAYEE_NAME || 'K-Connect Cloud SaaS Technologies', category: 'PAYMENT', description: 'Merchant / Payee display name on UPI apps' },
    { key: 'payment.annual_price_inr', value: process.env.DEFAULT_ANNUAL_PRICE_INR || '14999', category: 'PAYMENT', description: 'Active annual subscription price in INR' },
    { key: 'payment.qr_image_url', value: process.env.DEFAULT_QR_IMAGE_URL || '/storage/gpay_qr_code.png', category: 'PAYMENT', description: 'GPay / UPI QR code image asset' },
    { key: 'payment.instructions', value: '1. Scan the GPay QR code or send payment to the official UPI ID. 2. Copy the 12-digit UTR/UPI Transaction ID. 3. Submit below for manual verification. Your licence will be approved within 2-4 hours.', category: 'PAYMENT', description: 'Payment instructions displayed to shop owners' },
    { key: 'trial.duration_days', value: process.env.DEFAULT_TRIAL_DAYS || '14', category: 'TRIAL', description: 'Free trial duration in calendar days' },
    { key: 'support.phone', value: process.env.SUPPORT_PHONE || '+91 98422 00000', category: 'SUPPORT', description: 'Vendor WhatsApp / Phone support' },
    { key: 'support.email', value: process.env.SUPPORT_EMAIL || 'billing@kconnect.cloud', category: 'SUPPORT', description: 'Vendor billing support email' },
  ];

  for (const s of defaultSettings) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO saas_platform_settings (key, value, category, description)
            VALUES (?, ?, ?, ?);`,
      args: [s.key, s.value, s.category, s.description],
    });
  }

  // 7. Seed Flagship Shop Subscription
  await client.execute({
    sql: `INSERT OR IGNORE INTO saas_subscriptions (id, shop_id, plan_id, status, trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at, is_complimentary, complimentary_reason)
          VALUES ('sub_ktech', 'shop_ktech', 'plan_pro_annual', 'ACTIVE', NULL, NULL, CURRENT_TIMESTAMP, ?, 1, 'Flagship Demonstration Lab');`,
    args: [oneYearFromNow],
  });
}
