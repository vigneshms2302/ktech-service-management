import path from 'node:path';
import fs from 'node:fs';
import type { Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema/index.ts';

let clientInstance: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let resolvedDbPath = '';

/**
 * Creates a LibSQL client instance.
 * For cloud/remote URLs (libsql:// or https://), uses pure-JS '@libsql/client/web'
 * to completely eliminate native C++ binary requirements on Vercel Serverless.
 * For local file: URLs, dynamically uses '@libsql/client' (Node/desktop/vitest).
 */
export function createLibsqlClient(url: string, authToken?: string): Client {
  const isRemote =
    url.startsWith('libsql:') ||
    url.startsWith('https:') ||
    url.startsWith('http:') ||
    url.startsWith('wss:') ||
    url.startsWith('ws:');

  if (isRemote) {
    // Pure JS Web client - uses fetch(), 100% serverless safe!
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client/web');
    return createClient({ url, authToken });
  }

  // Local file SQLite (used for local development, desktop app, and automated tests)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@libsql/client');
  return createClient({ url, authToken });
}

/**
 * Returns the resolved database path.
 * In development, uses ./data/ktech-saas.sqlite for 100% free local execution.
 * In cloud production, can connect to remote LibSQL/Turso/PostgreSQL.
 */
export function getDatabasePath(): string {
  if (resolvedDbPath) return resolvedDbPath;

  if (process.env.KTECH_SAAS_DB_PATH) {
    resolvedDbPath = path.resolve(process.env.KTECH_SAAS_DB_PATH);
  } else {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const dataDir = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.warn('[Database] Could not create local data directory:', err);
      }
    }
    resolvedDbPath = path.join(dataDir, 'ktech-saas.sqlite');
  }

  return resolvedDbPath;
}

export function ensureStorageDirectories(): {
  photosDir: string;
  attachmentsDir: string;
  pdfsDir: string;
} {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const baseDir = isServerless
    ? path.join('/tmp', 'storage')
    : path.join(process.cwd(), 'storage');

  const photosDir = path.join(baseDir, 'photos');
  const attachmentsDir = path.join(baseDir, 'attachments');
  const pdfsDir = path.join(baseDir, 'pdfs');

  try {
    [baseDir, photosDir, attachmentsDir, pdfsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (err) {
    console.warn('[Storage] Could not create local storage directory (running in read-only environment):', err);
  }

  return { photosDir, attachmentsDir, pdfsDir };
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (dbInstance) return dbInstance;

  ensureStorageDirectories();
  const dbUrl = process.env.DATABASE_URL;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless && (!dbUrl || dbUrl.trim() === '')) {
    throw new Error(
      'DATABASE_NOT_CONFIGURED: DATABASE_URL environment variable is required in Vercel serverless environment. ' +
      'Please configure DATABASE_URL (e.g. libsql://your-db.turso.io) and DATABASE_AUTH_TOKEN in Vercel Project Settings.'
    );
  }

  const dbPath = getDatabasePath();
  const normalizedPath = dbPath.replace(/\\/g, '/');
  const fileUrl = normalizedPath.startsWith('/') ? `file:${normalizedPath}` : `file:/${normalizedPath}`;

  clientInstance = createLibsqlClient(
    dbUrl || fileUrl,
    process.env.DATABASE_AUTH_TOKEN || undefined
  );

  dbInstance = drizzle(clientInstance, { schema });
  return dbInstance;
}

export function resetDb(): void {
  clientInstance = null;
  dbInstance = null;
}

export function getClient(): Client {
  if (!clientInstance) {
    getDb();
  }
  return clientInstance!;
}

/**
 * Executes multi-tenant DDL script to create all SaaS tables.
 */
export async function initializeMultiTenantSchema(): Promise<void> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless && (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '')) {
    console.warn('[Database] Skipping schema bootstrap: DATABASE_URL is not configured.');
    return;
  }

  const client = getClient();

  await client.execute('PRAGMA foreign_keys = ON;');
  await client.execute('PRAGMA busy_timeout = 5000;');

  const ddlStatements = [
    // 1. Super-Admin & Vendor Console
    `CREATE TABLE IF NOT EXISTS vendor_admins (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 2. Tenant Shops (Each customer shop)
    `CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      gstin TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Coimbatore',
      state TEXT NOT NULL DEFAULT 'Tamil Nadu',
      pincode TEXT,
      upi_id TEXT,
      logo_url TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'FROZEN' | 'EXPIRED'
      max_seats INTEGER NOT NULL DEFAULT 5,
      subscription_plan TEXT NOT NULL DEFAULT 'PRO_ANNUAL',
      subscription_ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 3. Roles & Permissions (Platform-wide)
    `CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      description TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
    );`,

    // 4. Shop Staff Users (Scoped to shop_id)
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      pin_code TEXT,
      full_name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      commission_pct REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, username)
    );`,

    // 5. Audit Logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_state TEXT,
      after_state TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 6. Shop-Level Settings
    `CREATE TABLE IF NOT EXISTS shop_settings (
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      PRIMARY KEY(shop_id, key)
    );`,

    // 7. Customers
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      customer_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      primary_phone TEXT NOT NULL,
      secondary_phone TEXT,
      email TEXT,
      gstin TEXT,
      customer_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, customer_code)
    );`,

    // 8. Customer Addresses
    `CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      landmark TEXT,
      city TEXT NOT NULL DEFAULT 'Coimbatore',
      state TEXT NOT NULL DEFAULT 'Tamil Nadu',
      pincode TEXT,
      is_default INTEGER NOT NULL DEFAULT 1
    );`,

    // 9. Devices & Hardware Passcode Vault
    `CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      equipment_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model_name TEXT NOT NULL,
      serial_number TEXT,
      color_finish TEXT,
      encrypted_security_passcode TEXT,
      specs_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 10. Device Photos
    `CREATE TABLE IF NOT EXISTS device_photos (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      job_id TEXT,
      photo_type TEXT NOT NULL DEFAULT 'INTAKE_CONDITION',
      file_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 11. Service Jobs (The 13-Stage State Machine)
    `CREATE TABLE IF NOT EXISTS service_jobs (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_number TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      device_id TEXT NOT NULL REFERENCES devices(id),
      service_category TEXT NOT NULL,
      current_status TEXT NOT NULL DEFAULT 'RECEIVED',
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      assigned_technician_id TEXT REFERENCES users(id),
      reported_issue TEXT NOT NULL,
      accessories_received TEXT,
      physical_condition_notes TEXT,
      estimated_cost REAL NOT NULL DEFAULT 0.0,
      advance_deposit REAL NOT NULL DEFAULT 0.0,
      promised_delivery_date TEXT,
      actual_delivery_date TEXT,
      is_warranty_job INTEGER NOT NULL DEFAULT 0,
      parent_warranty_id TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, job_number)
    );`,

    // 12. Job Status History
    `CREATE TABLE IF NOT EXISTS job_status_history (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT NOT NULL REFERENCES users(id),
      reason_or_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 13. Technical Hardware Inspection
    `CREATE TABLE IF NOT EXISTS job_inspections (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      inspected_by TEXT NOT NULL REFERENCES users(id),
      power_status TEXT NOT NULL DEFAULT 'NORMAL_POWER',
      display_status TEXT,
      motherboard_status TEXT,
      body_condition TEXT,
      water_damage_detected INTEGER NOT NULL DEFAULT 0,
      short_circuit_detected INTEGER NOT NULL DEFAULT 0,
      inspection_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 14. Technician Diagnosis & Voltage Rail Checks
    `CREATE TABLE IF NOT EXISTS job_diagnosis (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      technician_id TEXT NOT NULL REFERENCES users(id),
      root_cause_analysis TEXT NOT NULL,
      voltage_rails_checked TEXT,
      faulty_components_identified TEXT,
      recommended_action TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 15. Job Services & Labor
    `CREATE TABLE IF NOT EXISTS job_services (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      service_name TEXT NOT NULL,
      sac_code TEXT,
      labor_charge REAL NOT NULL DEFAULT 0.0,
      discount REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 16. Job Parts Used
    `CREATE TABLE IF NOT EXISTS job_parts (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      inventory_item_id TEXT,
      part_name TEXT NOT NULL,
      serial_number TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost_price REAL NOT NULL DEFAULT 0.0,
      unit_selling_price REAL NOT NULL DEFAULT 0.0,
      hsn_code TEXT,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      warranty_months INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 17. Job Repair Activities & Timers
    `CREATE TABLE IF NOT EXISTS job_repair_activities (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      technician_id TEXT NOT NULL REFERENCES users(id),
      activity_title TEXT NOT NULL,
      description TEXT,
      time_spent_minutes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 18. Job Internal Notes
    `CREATE TABLE IF NOT EXISTS job_notes (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      note_type TEXT NOT NULL DEFAULT 'INTERNAL',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 19. Job Checklists
    `CREATE TABLE IF NOT EXISTS job_checklists (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      checklist_item_name TEXT NOT NULL,
      is_checked INTEGER NOT NULL DEFAULT 0,
      checked_by TEXT REFERENCES users(id),
      checked_at TEXT
    );`,

    // 20. Quotations & Line Items
    `CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      quotation_number TEXT NOT NULL,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      parts_subtotal REAL NOT NULL DEFAULT 0.0,
      labor_subtotal REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      validity_days INTEGER NOT NULL DEFAULT 7,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, quotation_number)
    );`,

    `CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      inventory_item_id TEXT,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      total_price REAL NOT NULL DEFAULT 0.0
    );`,

    `CREATE TABLE IF NOT EXISTS quotation_approvals (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      approved_amount REAL NOT NULL,
      approval_status TEXT NOT NULL,
      approval_method TEXT NOT NULL,
      customer_contact_used TEXT NOT NULL,
      recorded_by_user_id TEXT NOT NULL REFERENCES users(id),
      approval_timestamp TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 21. Multi-Tier Inventory & Salvage Lineage
    `CREATE TABLE IF NOT EXISTS inventory_categories (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      UNIQUE(shop_id, code)
    );`,

    `CREATE TABLE IF NOT EXISTS inventory_locations (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      UNIQUE(shop_id, name)
    );`,

    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    `CREATE TABLE IF NOT EXISTS salvage_devices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      salvage_code TEXT NOT NULL,
      original_service_job_id TEXT,
      equipment_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model_name TEXT NOT NULL,
      serial_number TEXT,
      acquisition_type TEXT NOT NULL DEFAULT 'CUSTOMER_SCRAP_DONATION',
      acquisition_cost REAL NOT NULL DEFAULT 0.0,
      dismantled_by TEXT REFERENCES users(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, salvage_code)
    );`,

    `CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES inventory_categories(id),
      item_type TEXT NOT NULL,
      serial_number TEXT,
      cost_price REAL NOT NULL DEFAULT 0.0,
      selling_price REAL NOT NULL DEFAULT 0.0,
      hsn_code TEXT,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      quantity_on_hand INTEGER NOT NULL DEFAULT 0,
      min_reorder_level INTEGER NOT NULL DEFAULT 2,
      location_id TEXT REFERENCES inventory_locations(id),
      supplier_id TEXT REFERENCES suppliers(id),
      salvage_source_id TEXT REFERENCES salvage_devices(id),
      warranty_months INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, sku)
    );`,

    `CREATE TABLE IF NOT EXISTS salvage_parts (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      salvage_device_id TEXT NOT NULL REFERENCES salvage_devices(id) ON DELETE CASCADE,
      inventory_item_id TEXT REFERENCES inventory_items(id),
      part_name TEXT NOT NULL,
      serial_number TEXT,
      tested_condition TEXT NOT NULL DEFAULT 'GRADE_A_WORKING',
      estimated_value REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES inventory_items(id),
      transaction_type TEXT NOT NULL,
      quantity_delta INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 22. Invoices & Indian GST Engine
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      invoice_type TEXT NOT NULL DEFAULT 'SERVICE_REPAIR',
      customer_id TEXT NOT NULL REFERENCES customers(id),
      service_job_id TEXT REFERENCES service_jobs(id),
      is_gst_invoice INTEGER NOT NULL DEFAULT 1,
      customer_gstin TEXT,
      subtotal_parts REAL NOT NULL DEFAULT 0.0,
      subtotal_labor REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      cgst_amount REAL NOT NULL DEFAULT 0.0,
      sgst_amount REAL NOT NULL DEFAULT 0.0,
      igst_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      advance_adjusted REAL NOT NULL DEFAULT 0.0,
      amount_paid REAL NOT NULL DEFAULT 0.0,
      balance_due REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      is_void INTEGER NOT NULL DEFAULT 0,
      void_reason TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, invoice_number)
    );`,

    `CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_ref_id TEXT,
      description TEXT NOT NULL,
      hsn_sac_code TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0.0,
      discount REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0
    );`,

    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      receipt_number TEXT NOT NULL,
      invoice_id TEXT REFERENCES invoices(id),
      service_job_id TEXT REFERENCES service_jobs(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      payment_type TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_reference TEXT,
      amount REAL NOT NULL,
      received_by TEXT NOT NULL REFERENCES users(id),
      payment_date TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, receipt_number)
    );`,

    // 23. Post-Repair Warranties
    `CREATE TABLE IF NOT EXISTS warranties (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      warranty_code TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      device_id TEXT REFERENCES devices(id),
      original_job_id TEXT REFERENCES service_jobs(id),
      original_invoice_id TEXT REFERENCES invoices(id),
      warranty_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      covered_scope TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, warranty_code)
    );`,

    // 24. Specialized Business Modules
    `CREATE TABLE IF NOT EXISTS data_recovery_jobs (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      service_job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      storage_type TEXT NOT NULL,
      capacity_gb INTEGER NOT NULL,
      detection_status TEXT NOT NULL,
      damage_type TEXT NOT NULL,
      recovery_complexity TEXT NOT NULL,
      recovered_size_gb REAL NOT NULL DEFAULT 0.0,
      recovery_outcome TEXT NOT NULL DEFAULT 'ASSESSMENT',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, service_job_id)
    );`,

    `CREATE TABLE IF NOT EXISTS pc_builds (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      build_number TEXT NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      build_name TEXT NOT NULL,
      target_budget REAL NOT NULL DEFAULT 0.0,
      parts_cost REAL NOT NULL DEFAULT 0.0,
      parts_price REAL NOT NULL DEFAULT 0.0,
      assembly_labor_fee REAL NOT NULL DEFAULT 0.0,
      final_quoted_price REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, build_number)
    );`,

    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      product_code TEXT NOT NULL,
      product_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model_name TEXT NOT NULL,
      specs TEXT NOT NULL,
      cosmetic_grade TEXT NOT NULL DEFAULT 'GRADE_A',
      selling_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_STOCK',
      warranty_months INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id, product_code)
    );`,

    // 25. SaaS Commercial Plans & Pricing
    `CREATE TABLE IF NOT EXISTS saas_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      price_inr REAL NOT NULL,
      billing_cycle TEXT NOT NULL DEFAULT 'ANNUAL',
      trial_days INTEGER NOT NULL DEFAULT 14,
      max_seats INTEGER NOT NULL DEFAULT 5,
      features_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 26. SaaS Subscriptions & 14-Day Free Trial
    `CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES saas_plans(id),
      status TEXT NOT NULL DEFAULT 'TRIALING', -- 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
      trial_starts_at TEXT,
      trial_ends_at TEXT,
      current_period_starts_at TEXT,
      current_period_ends_at TEXT,
      is_complimentary INTEGER NOT NULL DEFAULT 0,
      complimentary_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(shop_id)
    );`,

    // 27. SaaS Payment Claims (Manual GPay QR & UPI Claims Queue)
    `CREATE TABLE IF NOT EXISTS saas_payment_claims (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      plan_id TEXT NOT NULL REFERENCES saas_plans(id),
      amount_inr REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_method TEXT NOT NULL DEFAULT 'GPAY_UPI',
      upi_transaction_id TEXT NOT NULL UNIQUE,
      evidence_file_path TEXT,
      customer_notes TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'APPROVED' | 'REJECTED'
      reviewed_by TEXT REFERENCES vendor_admins(id),
      reviewed_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 28. Platform Configuration & Payment Settings
    `CREATE TABLE IF NOT EXISTS saas_platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'PAYMENT',
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 29. Super-Admin Administrative Audit Trail
    `CREATE TABLE IF NOT EXISTS saas_admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES vendor_admins(id),
      action TEXT NOT NULL,
      target_entity_type TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 30. SaaS Customer Notification Queue
    `CREATE TABLE IF NOT EXISTS saas_notifications (
      id TEXT PRIMARY KEY,
      recipient_type TEXT NOT NULL, -- 'SHOP_OWNER' | 'VENDOR_ADMIN'
      recipient_id TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'IN_APP', -- 'IN_APP' | 'EMAIL' | 'WHATSAPP'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`
  ];

  for (const statement of ddlStatements) {
    await client.execute(statement);
  }
}
