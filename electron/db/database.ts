import path from 'node:path';
import fs from 'node:fs';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema/index.ts';

let clientInstance: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let resolvedDbPath = '';

/**
 * Returns the resolved file path for the SQLite database.
 * Uses OS application data in production / Electron or local data directory in tests / dev.
 */
export function getDatabasePath(): string {
  if (resolvedDbPath) return resolvedDbPath;

  if (process.env.KTECH_DB_PATH) {
    resolvedDbPath = path.resolve(process.env.KTECH_DB_PATH);
  } else {
    // In dev / standalone node mode, store in ./data/ktech.sqlite
    const baseDir = process.env.NODE_ENV === 'test' 
      ? path.join(process.cwd(), 'data', 'test')
      : path.join(process.cwd(), 'data');
    resolvedDbPath = path.join(baseDir, 'ktech.sqlite');
  }

  return resolvedDbPath;
}

/**
 * Sets an explicit database path (e.g. for Electron app.getPath('userData')).
 */
export function setDatabasePath(customPath: string): void {
  resolvedDbPath = customPath;
  clientInstance = null;
  dbInstance = null;
}

/**
 * Ensures all required local directory trees exist.
 */
export function ensureDirectories(): {
  dbDir: string;
  photosDir: string;
  attachmentsDir: string;
  pdfsDir: string;
  backupsAutoDir: string;
  backupsManualDir: string;
  backupsPreRestoreDir: string;
} {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  const baseAppDir = path.dirname(dbDir);

  const photosDir = path.join(baseAppDir, 'storage', 'photos');
  const attachmentsDir = path.join(baseAppDir, 'storage', 'attachments');
  const pdfsDir = path.join(baseAppDir, 'storage', 'generated_pdfs');
  const backupsAutoDir = path.join(baseAppDir, 'backups', 'auto');
  const backupsManualDir = path.join(baseAppDir, 'backups', 'manual');
  const backupsPreRestoreDir = path.join(baseAppDir, 'backups', 'pre_restore');

  [dbDir, photosDir, attachmentsDir, pdfsDir, backupsAutoDir, backupsManualDir, backupsPreRestoreDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return {
    dbDir,
    photosDir,
    attachmentsDir,
    pdfsDir,
    backupsAutoDir,
    backupsManualDir,
    backupsPreRestoreDir,
  };
}

/**
 * Initializes and returns the SQLite database connection.
 */
export function getDb(): LibSQLDatabase<typeof schema> {
  if (dbInstance) return dbInstance;

  ensureDirectories();
  const dbPath = getDatabasePath();
  
  // Format as file URL for LibSQL
  const normalizedPath = dbPath.replace(/\\/g, '/');
  const fileUrl = normalizedPath.startsWith('/') ? `file:${normalizedPath}` : `file:/${normalizedPath}`;

  clientInstance = createClient({
    url: fileUrl,
  });

  dbInstance = drizzle(clientInstance, { schema });
  return dbInstance;
}

export function getClient(): Client {
  if (!clientInstance) {
    getDb();
  }
  return clientInstance!;
}

/**
 * Executes raw SQL DDL to create all 45 tables and indexes if they do not exist.
 */
export async function initializeSchema(): Promise<void> {
  const client = getClient();

  // Pragmas
  await client.execute('PRAGMA foreign_keys = ON;');
  await client.execute('PRAGMA busy_timeout = 5000;');

  // DDL Script for all 45 tables
  const ddlStatements = [
    // 1. roles
    `CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );`,

    // 2. permissions
    `CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      description TEXT
    );`,

    // 3. role_permissions
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
    );`,

    // 4. users
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      pin_code TEXT,
      full_name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      commission_pct REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 5. audit_logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_state TEXT,
      after_state TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 6. settings
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      is_encrypted INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 7. backups
    `CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      backup_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      backup_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 8. customers
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      primary_phone TEXT NOT NULL,
      secondary_phone TEXT,
      email TEXT,
      gstin TEXT,
      customer_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 9. customer_addresses
    `CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      landmark TEXT,
      city TEXT NOT NULL DEFAULT 'Coimbatore',
      state TEXT NOT NULL DEFAULT 'Tamil Nadu',
      pincode TEXT,
      is_default INTEGER NOT NULL DEFAULT 1
    );`,

    // 10. devices
    `CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
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

    // 11. device_photos
    `CREATE TABLE IF NOT EXISTS device_photos (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      job_id TEXT,
      photo_type TEXT NOT NULL DEFAULT 'INTAKE_CONDITION',
      file_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 12. service_jobs
    `CREATE TABLE IF NOT EXISTS service_jobs (
      id TEXT PRIMARY KEY,
      job_number TEXT NOT NULL UNIQUE,
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
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 13. job_status_history
    `CREATE TABLE IF NOT EXISTS job_status_history (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT NOT NULL REFERENCES users(id),
      reason_or_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 14. job_inspections
    `CREATE TABLE IF NOT EXISTS job_inspections (
      id TEXT PRIMARY KEY,
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

    // 15. job_diagnosis
    `CREATE TABLE IF NOT EXISTS job_diagnosis (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      technician_id TEXT NOT NULL REFERENCES users(id),
      root_cause_analysis TEXT NOT NULL,
      voltage_rails_checked TEXT,
      faulty_components_identified TEXT,
      recommended_action TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 16. job_services
    `CREATE TABLE IF NOT EXISTS job_services (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      service_name TEXT NOT NULL,
      sac_code TEXT,
      labor_charge REAL NOT NULL DEFAULT 0.0,
      discount REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 17. job_parts
    `CREATE TABLE IF NOT EXISTS job_parts (
      id TEXT PRIMARY KEY,
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

    // 18. job_repair_activities
    `CREATE TABLE IF NOT EXISTS job_repair_activities (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      technician_id TEXT NOT NULL REFERENCES users(id),
      activity_title TEXT NOT NULL,
      description TEXT,
      time_spent_minutes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 19. job_notes
    `CREATE TABLE IF NOT EXISTS job_notes (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      note_type TEXT NOT NULL DEFAULT 'INTERNAL',
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 20. job_attachments
    `CREATE TABLE IF NOT EXISTS job_attachments (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 21. job_checklists
    `CREATE TABLE IF NOT EXISTS job_checklists (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      checklist_item_name TEXT NOT NULL,
      is_checked INTEGER NOT NULL DEFAULT 0,
      checked_by TEXT REFERENCES users(id),
      checked_at TEXT
    );`,

    // 22. job_tests
    `CREATE TABLE IF NOT EXISTS job_tests (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      tested_by TEXT NOT NULL REFERENCES users(id),
      test_type TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT 'PASSED',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 23. quotations
    `CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotation_number TEXT NOT NULL UNIQUE,
      job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      parts_subtotal REAL NOT NULL DEFAULT 0.0,
      labor_subtotal REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      validity_days INTEGER NOT NULL DEFAULT 7,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 24. quotation_items
    `CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      inventory_item_id TEXT,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      total_price REAL NOT NULL DEFAULT 0.0
    );`,

    // 25. quotation_approvals
    `CREATE TABLE IF NOT EXISTS quotation_approvals (
      id TEXT PRIMARY KEY,
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

    // 26. data_recovery_jobs
    `CREATE TABLE IF NOT EXISTS data_recovery_jobs (
      id TEXT PRIMARY KEY,
      service_job_id TEXT NOT NULL UNIQUE REFERENCES service_jobs(id) ON DELETE CASCADE,
      storage_type TEXT NOT NULL,
      capacity_gb INTEGER NOT NULL,
      file_system TEXT,
      detection_status TEXT NOT NULL,
      damage_type TEXT NOT NULL,
      recovery_complexity TEXT NOT NULL,
      target_data_description TEXT,
      destination_media_type TEXT NOT NULL DEFAULT 'CUSTOMER_PROVIDED_DRIVE',
      destination_media_details TEXT,
      recovered_size_gb REAL NOT NULL DEFAULT 0.0,
      recovery_outcome TEXT NOT NULL DEFAULT 'ASSESSMENT',
      disclaimer_acknowledged INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 27. inventory_categories
    `CREATE TABLE IF NOT EXISTS inventory_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT
    );`,

    // 28. inventory_locations
    `CREATE TABLE IF NOT EXISTS inventory_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );`,

    // 29. suppliers
    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 30. salvage_devices
    `CREATE TABLE IF NOT EXISTS salvage_devices (
      id TEXT PRIMARY KEY,
      salvage_code TEXT NOT NULL UNIQUE,
      original_service_job_id TEXT,
      equipment_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model_name TEXT NOT NULL,
      serial_number TEXT,
      acquisition_type TEXT NOT NULL DEFAULT 'CUSTOMER_SCRAP_DONATION',
      acquisition_cost REAL NOT NULL DEFAULT 0.0,
      dismantled_by TEXT REFERENCES users(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 31. inventory_items
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
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
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 32. salvage_parts
    `CREATE TABLE IF NOT EXISTS salvage_parts (
      id TEXT PRIMARY KEY,
      salvage_device_id TEXT NOT NULL REFERENCES salvage_devices(id) ON DELETE CASCADE,
      inventory_item_id TEXT REFERENCES inventory_items(id),
      part_name TEXT NOT NULL,
      serial_number TEXT,
      tested_condition TEXT NOT NULL DEFAULT 'GRADE_A_WORKING',
      estimated_value REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 33. inventory_transactions
    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
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

    // 34. products
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      product_code TEXT NOT NULL UNIQUE,
      product_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model_name TEXT NOT NULL,
      serial_number TEXT,
      specs TEXT NOT NULL,
      cosmetic_grade TEXT NOT NULL DEFAULT 'GRADE_A',
      acquisition_cost REAL NOT NULL DEFAULT 0.0,
      refurb_cost_spent REAL NOT NULL DEFAULT 0.0,
      selling_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_STOCK',
      warranty_months INTEGER NOT NULL DEFAULT 3,
      sold_to_customer_id TEXT REFERENCES customers(id),
      sales_invoice_id TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 35. product_sales
    `CREATE TABLE IF NOT EXISTS product_sales (
      id TEXT PRIMARY KEY,
      sale_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      invoice_id TEXT,
      total_amount REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 36. product_sale_items
    `CREATE TABLE IF NOT EXISTS product_sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES product_sales(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      inventory_item_id TEXT REFERENCES inventory_items(id),
      unit_price REAL NOT NULL DEFAULT 0.0,
      quantity INTEGER NOT NULL DEFAULT 1,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      total_amount REAL NOT NULL DEFAULT 0.0
    );`,

    // 37. pc_builds
    `CREATE TABLE IF NOT EXISTS pc_builds (
      id TEXT PRIMARY KEY,
      build_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      build_name TEXT NOT NULL,
      target_budget REAL NOT NULL DEFAULT 0.0,
      parts_cost REAL NOT NULL DEFAULT 0.0,
      parts_price REAL NOT NULL DEFAULT 0.0,
      assembly_labor_fee REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      final_quoted_price REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 38. pc_build_items
    `CREATE TABLE IF NOT EXISTS pc_build_items (
      id TEXT PRIMARY KEY,
      pc_build_id TEXT NOT NULL REFERENCES pc_builds(id) ON DELETE CASCADE,
      component_slot TEXT NOT NULL,
      inventory_item_id TEXT REFERENCES inventory_items(id),
      item_name TEXT NOT NULL,
      specs TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost REAL NOT NULL DEFAULT 0.0,
      unit_price REAL NOT NULL DEFAULT 0.0,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 39. invoices
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
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
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 40. invoice_items
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
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

    // 41. payments
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL UNIQUE,
      invoice_id TEXT REFERENCES invoices(id),
      service_job_id TEXT REFERENCES service_jobs(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      payment_type TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_reference TEXT,
      amount REAL NOT NULL,
      received_by TEXT NOT NULL REFERENCES users(id),
      payment_date TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 42. warranties
    `CREATE TABLE IF NOT EXISTS warranties (
      id TEXT PRIMARY KEY,
      warranty_code TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      device_id TEXT REFERENCES devices(id),
      original_job_id TEXT REFERENCES service_jobs(id),
      original_invoice_id TEXT REFERENCES invoices(id),
      product_id TEXT REFERENCES products(id),
      warranty_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      covered_scope TEXT NOT NULL,
      terms_and_exclusions TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 43. warranty_jobs
    `CREATE TABLE IF NOT EXISTS warranty_jobs (
      id TEXT PRIMARY KEY,
      warranty_id TEXT NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
      warranty_claim_job_id TEXT NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
      claim_date TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      claim_issue_reported TEXT NOT NULL,
      resolution_type TEXT NOT NULL DEFAULT 'FREE_RE_REPAIR',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,

    // 44. communication_templates
    `CREATE TABLE IF NOT EXISTS communication_templates (
      id TEXT PRIMARY KEY,
      template_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      template_body TEXT NOT NULL,
      variables_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );`,

    // 45. communication_messages
    `CREATE TABLE IF NOT EXISTS communication_messages (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      service_job_id TEXT REFERENCES service_jobs(id),
      channel TEXT NOT NULL DEFAULT 'WHATSAPP_API',
      recipient_phone TEXT NOT NULL,
      template_key TEXT NOT NULL,
      message_payload TEXT NOT NULL,
      dispatch_status TEXT NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`
  ];

  for (const statement of ddlStatements) {
    await client.execute(statement);
  }
}

/**
 * Creates an immutable audit log entry.
 */
export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  beforeState?: Record<string, unknown> | null,
  afterState?: Record<string, unknown> | null,
  ipAddress?: string
): Promise<void> {
  const client = getClient();
  const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  await client.execute({
    sql: `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, before_state, after_state, ip_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      action,
      entityType,
      entityId,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      ipAddress || 'LOCAL_DESKTOP',
    ],
  });
}

/**
 * Creates a standalone database snapshot.
 */
export async function createDatabaseBackup(
  backupType: 'AUTO' | 'MANUAL' | 'PRE_RESTORE',
  customTargetDir?: string
): Promise<{ backupId: string; backupPath: string; fileSizeBytes: number }> {
  const { backupsAutoDir, backupsManualDir, backupsPreRestoreDir } = ensureDirectories();
  const dbPath = getDatabasePath();

  let targetDir = backupsManualDir;
  if (backupType === 'AUTO') targetDir = backupsAutoDir;
  if (backupType === 'PRE_RESTORE') targetDir = backupsPreRestoreDir;
  if (customTargetDir && fs.existsSync(customTargetDir)) targetDir = customTargetDir;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `ktech_backup_${backupType.toLowerCase()}_${timestamp}.sqlite`;
  const backupPath = path.join(targetDir, backupName);

  fs.copyFileSync(dbPath, backupPath);
  const stats = fs.statSync(backupPath);
  const backupId = `BAK-${Date.now()}`;

  const client = getClient();
  await client.execute({
    sql: `INSERT INTO backups (id, backup_name, file_path, file_size_bytes, backup_type, status)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [backupId, backupName, backupPath, stats.size, backupType, 'COMPLETED'],
  });

  return { backupId, backupPath, fileSizeBytes: stats.size };
}
