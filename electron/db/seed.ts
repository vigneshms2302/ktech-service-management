import { getClient } from './database.ts';
import { hashPassword, encryptSecret } from '../security/crypto.ts';

export async function seedDatabase(): Promise<void> {
  const client = getClient();

  // Check if roles already exist
  const existingRoles = await client.execute('SELECT COUNT(*) as count FROM roles;');
  const roleCount = Number((existingRoles.rows[0] as unknown as { count: number }).count);
  if (roleCount > 0) {
    return; // Already seeded
  }

  // 1. Roles
  const rolesList = [
    { id: 'ROLE_OWNER', name: 'Owner / Administrator', description: 'Full unrestricted access to all business operations, financials, settings, and backups' },
    { id: 'ROLE_RECEPTION', name: 'Reception / Front Desk', description: 'Customer admission, equipment intake, quotation dispatch, approvals, billing, and deliveries' },
    { id: 'ROLE_TECHNICIAN', name: 'Technician', description: 'Device inspection, chip-level diagnosis, repair activity logging, parts usage, and QC testing' },
    { id: 'ROLE_ACCOUNTS', name: 'Accounts Staff', description: 'Invoicing, payment settlements, tax/GST reporting, and customer ledger management' },
  ];

  for (const r of rolesList) {
    await client.execute({
      sql: 'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)',
      args: [r.id, r.name, r.description],
    });
  }

  // 2. Permissions
  const permissionsList = [
    // Customers
    { id: 'perm_cust_read', code: 'customers.read', module: 'CUSTOMERS', description: 'View customer directory' },
    { id: 'perm_cust_write', code: 'customers.write', module: 'CUSTOMERS', description: 'Create and update customers' },
    // Jobs
    { id: 'perm_jobs_read', code: 'jobs.read', module: 'JOBS', description: 'View service jobs' },
    { id: 'perm_jobs_intake', code: 'jobs.intake', module: 'JOBS', description: 'Create new equipment intake and admission' },
    { id: 'perm_jobs_diagnose', code: 'jobs.diagnose', module: 'JOBS', description: 'Record inspection and diagnostic findings' },
    { id: 'perm_jobs_repair', code: 'jobs.repair', module: 'JOBS', description: 'Perform repairs, log activities, and allocate parts' },
    { id: 'perm_jobs_qc', code: 'jobs.qc', module: 'JOBS', description: 'Conduct quality check testing' },
    { id: 'perm_jobs_deliver', code: 'jobs.deliver', module: 'JOBS', description: 'Handover equipment and finalize delivery' },
    // Quotations & Approvals
    { id: 'perm_quotes_create', code: 'quotes.create', module: 'QUOTATIONS', description: 'Create repair estimates' },
    { id: 'perm_quotes_approve', code: 'quotes.approve', module: 'QUOTATIONS', description: 'Record formal customer approvals' },
    // Inventory
    { id: 'perm_inv_read', code: 'inventory.read', module: 'INVENTORY', description: 'View spare parts and stock levels' },
    { id: 'perm_inv_cost_view', code: 'inventory.cost_view', module: 'INVENTORY', description: 'View purchase cost prices and profit margins' },
    { id: 'perm_inv_adjust', code: 'inventory.adjust', module: 'INVENTORY', description: 'Adjust stock, record purchases, and write-offs' },
    { id: 'perm_salvage', code: 'inventory.salvage', module: 'SALVAGE', description: 'Dismantle salvage equipment and restock components' },
    // Billing & Financials
    { id: 'perm_billing_create', code: 'billing.create', module: 'BILLING', description: 'Generate invoices and collect payments' },
    { id: 'perm_billing_void', code: 'billing.void', module: 'BILLING', description: 'Void or cancel invoices and issue refunds' },
    { id: 'perm_reports_view', code: 'reports.view', module: 'REPORTS', description: 'View financial revenue and GST reports' },
    // Warranties
    { id: 'perm_warranty_read', code: 'warranty.read', module: 'WARRANTY', description: 'View active warranties' },
    { id: 'perm_warranty_claim', code: 'warranty.claim', module: 'WARRANTY', description: 'Create linked warranty claim jobs' },
    // Special Modules
    { id: 'perm_data_recovery', code: 'data_recovery.manage', module: 'DATA_RECOVERY', description: 'Manage data recovery triage and extraction' },
    { id: 'perm_pc_builder', code: 'pc_builder.manage', module: 'PC_BUILDER', description: 'Create custom PC builds and proposals' },
    { id: 'perm_refurb_manage', code: 'refurb.manage', module: 'REFURBISHED', description: 'Manage refurbished product acquisitions and sales' },
    // System & Audit
    { id: 'perm_audit_view', code: 'audit.view', module: 'SYSTEM', description: 'View complete system audit logs' },
    { id: 'perm_backup_manage', code: 'backup.manage', module: 'SYSTEM', description: 'Create backups and execute database restores' },
    { id: 'perm_settings_edit', code: 'settings.edit', module: 'SYSTEM', description: 'Edit shop settings and tax configurations' },
    { id: 'perm_credentials_view', code: 'credentials.view', module: 'SYSTEM', description: 'Unlock and view encrypted device passcodes' },
  ];

  for (const p of permissionsList) {
    await client.execute({
      sql: 'INSERT INTO permissions (id, code, module, description) VALUES (?, ?, ?, ?)',
      args: [p.id, p.code, p.module, p.description],
    });
  }

  // 3. Role-Permissions Mapping
  const rolePermissionsMap: Record<string, string[]> = {
    ROLE_OWNER: permissionsList.map((p) => p.id), // Owner has everything
    ROLE_RECEPTION: [
      'perm_cust_read', 'perm_cust_write',
      'perm_jobs_read', 'perm_jobs_intake', 'perm_jobs_deliver',
      'perm_quotes_create', 'perm_quotes_approve',
      'perm_inv_read',
      'perm_billing_create',
      'perm_warranty_read', 'perm_warranty_claim',
      'perm_pc_builder', 'perm_refurb_manage',
    ],
    ROLE_TECHNICIAN: [
      'perm_cust_read',
      'perm_jobs_read', 'perm_jobs_diagnose', 'perm_jobs_repair', 'perm_jobs_qc',
      'perm_inv_read', 'perm_salvage',
      'perm_data_recovery', 'perm_pc_builder',
      'perm_credentials_view',
    ],
    ROLE_ACCOUNTS: [
      'perm_cust_read',
      'perm_jobs_read',
      'perm_inv_read', 'perm_inv_cost_view',
      'perm_billing_create', 'perm_billing_void',
      'perm_reports_view',
      'perm_warranty_read',
    ],
  };

  for (const [roleId, permIds] of Object.entries(rolePermissionsMap)) {
    for (const permId of permIds) {
      await client.execute({
        sql: 'INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)',
        args: [`${roleId}_${permId}`, roleId, permId],
      });
    }
  }

  // 4. Default Users
  const defaultUsers = [
    {
      id: 'USR_OWNER',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      pinCode: '1234',
      fullName: 'K. Vignesh (Owner)',
      roleId: 'ROLE_OWNER',
      phone: '+91 98765 00001',
      commissionPct: 0.0,
    },
    {
      id: 'USR_RECEPTION',
      username: 'reception',
      passwordHash: hashPassword('reception123'),
      pinCode: '1111',
      fullName: 'Anitha M. (Front Desk)',
      roleId: 'ROLE_RECEPTION',
      phone: '+91 98765 00002',
      commissionPct: 0.0,
    },
    {
      id: 'USR_TECH1',
      username: 'tech1',
      passwordHash: hashPassword('tech123'),
      pinCode: '2222',
      fullName: 'Rajesh Kumar (Senior Tech)',
      roleId: 'ROLE_TECHNICIAN',
      phone: '+91 98765 00003',
      commissionPct: 15.0,
    },
    {
      id: 'USR_TECH2',
      username: 'tech2',
      passwordHash: hashPassword('tech123'),
      pinCode: '3333',
      fullName: 'Suresh P. (Chip-Level Specialist)',
      roleId: 'ROLE_TECHNICIAN',
      phone: '+91 98765 00004',
      commissionPct: 20.0,
    },
    {
      id: 'USR_ACCOUNTS',
      username: 'accounts',
      passwordHash: hashPassword('accounts123'),
      pinCode: '4444',
      fullName: 'Priya S. (Accounts Manager)',
      roleId: 'ROLE_ACCOUNTS',
      phone: '+91 98765 00005',
      commissionPct: 0.0,
    },
  ];

  for (const u of defaultUsers) {
    await client.execute({
      sql: `INSERT INTO users (id, username, password_hash, pin_code, full_name, role_id, phone, commission_pct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [u.id, u.username, u.passwordHash, u.pinCode, u.fullName, u.roleId, u.phone, u.commissionPct],
    });
  }

  // 5. Default Inventory Categories
  const categories = [
    { id: 'CAT_RAM', name: 'RAM / Memory Modules', code: 'RAM', description: 'DDR3, DDR4, DDR5 Desktop & Laptop SODIMM Memory' },
    { id: 'CAT_SSD', name: 'Solid State Drives & M.2', code: 'SSD', description: '2.5" SATA SSD, NVMe PCIe Gen3/Gen4 M.2 SSDs' },
    { id: 'CAT_HDD', name: 'Hard Disk Drives', code: 'HDD', description: '2.5" Laptop & 3.5" Desktop Mechanical Hard Drives' },
    { id: 'CAT_PANEL', name: 'Displays & Panels', code: 'PANEL', description: 'Laptop LCD/LED/OLED screens, 30-pin, 40-pin FHD/4K panels' },
    { id: 'CAT_KB', name: 'Keyboards & Touchpads', code: 'KEYBOARD', description: 'Internal replacement keyboards, backlights, trackpads' },
    { id: 'CAT_BATTERY', name: 'Batteries & Cells', code: 'BATTERY', description: 'Internal & external Li-ion replacement battery packs' },
    { id: 'CAT_IC', name: 'Chip-Level ICs & Components', code: 'IC', description: 'Power ICs, Super I/O, MOSFETs, BIOS ROMs, Charging Controllers' },
    { id: 'CAT_POWER', name: 'Power Supplies & SMPS', code: 'SMPS_PART', description: 'ATX PSUs, 65W-230W Laptop Adapters, EV Charger Modules' },
    { id: 'CAT_COOLING', name: 'Cooling & Thermal', code: 'COOLING', description: 'Thermal paste, liquid metal, replacement cooling fans, heatsinks' },
    { id: 'CAT_CONSOLES', name: 'Gaming Console Parts', code: 'CONSOLES', description: 'PS5/PS4/Xbox HDMI ports, APU liquid metal, optical drives, optical lasers' },
  ];

  for (const c of categories) {
    await client.execute({
      sql: 'INSERT INTO inventory_categories (id, name, code, description) VALUES (?, ?, ?, ?)',
      args: [c.id, c.name, c.code, c.description],
    });
  }

  // 6. Default Settings
  const defaultSettings = [
    { key: 'shop.name', value: 'KTech Computers', category: 'SHOP' },
    { key: 'shop.tagline', value: 'Advanced Computer Service, Chip-Level & Data Recovery Solutions', category: 'SHOP' },
    { key: 'shop.address', value: '123 Tech Avenue, Cross-Cut Road, Gandhipuram, Coimbatore - 641012', category: 'SHOP' },
    { key: 'shop.phone', value: '+91 98765 43210', category: 'SHOP' },
    { key: 'shop.email', value: 'service@ktechcomputers.com', category: 'SHOP' },
    { key: 'shop.gstin', value: '33AAAAA0000A1Z5', category: 'SHOP' },
    { key: 'shop.upi_id', value: 'ktechcomputers@okaxis', category: 'SHOP' },
    { key: 'tax.gst_enabled', value: '1', category: 'TAX' },
    { key: 'tax.default_service_rate', value: '18.0', category: 'TAX' },
    { key: 'tax.default_parts_rate', value: '18.0', category: 'TAX' },
    { key: 'warranty.default_repair_days', value: '30', category: 'WARRANTY' },
    { key: 'warranty.default_refurb_days', value: '90', category: 'WARRANTY' },
    { key: 'warranty.default_parts_days', value: '365', category: 'WARRANTY' },
    { key: 'backup.auto_interval_hours', value: '24', category: 'BACKUP' },
  ];

  for (const s of defaultSettings) {
    await client.execute({
      sql: 'INSERT INTO settings (key, value, category, is_encrypted) VALUES (?, ?, ?, 0)',
      args: [s.key, s.value, s.category],
    });
  }

  // 7. Default Communication Templates
  const templates = [
    {
      id: 'tmpl_admission',
      templateKey: 'ADMISSION_SLIP',
      name: 'Service Admission Receipt',
      templateBody: '🔧 *KTech Computers - Service Admission*\n\nHello *{{customer_name}}*,\nWe received your *{{equipment_type}}* (*{{job_number}}*) for inspection.\nReported Issue: {{reported_issue}}\nEst. Cost: ₹{{estimated_cost}} | Advance: ₹{{advance_deposit}}\n\n📍 KTech Computers | 📞 +91 98765 43210',
      variablesJson: JSON.stringify(['customer_name', 'equipment_type', 'job_number', 'reported_issue', 'estimated_cost', 'advance_deposit']),
    },
    {
      id: 'tmpl_approval',
      templateKey: 'APPROVAL_REQUEST',
      name: 'Repair Estimate & Approval Request',
      templateBody: '📊 *KTech Computers - Repair Estimate*\n\nHello *{{customer_name}}*,\nDiagnosis for your *{{equipment_type}}* (*{{job_number}}*) is complete.\nParts: ₹{{parts_total}} | Labor: ₹{{labor_total}}\nGrand Total: *₹{{grand_total}}*\n\nReply "APPROVED" or call +91 98765 43210 to authorize.',
      variablesJson: JSON.stringify(['customer_name', 'equipment_type', 'job_number', 'parts_total', 'labor_total', 'grand_total']),
    },
    {
      id: 'tmpl_ready',
      templateKey: 'READY_FOR_PICKUP',
      name: 'Ready for Collection Notice',
      templateBody: '✅ *KTech Computers - Ready for Pickup!*\n\nHello *{{customer_name}}*,\nYour *{{equipment_type}}* (*{{job_number}}*) has passed all QC tests.\nBalance Due: *₹{{balance_due}}*\nTimings: 10 AM - 8:30 PM.\n\n📍 KTech Computers | 📞 +91 98765 43210',
      variablesJson: JSON.stringify(['customer_name', 'equipment_type', 'job_number', 'balance_due']),
    },
  ];

  for (const t of templates) {
    await client.execute({
      sql: 'INSERT INTO communication_templates (id, template_key, name, template_body, variables_json, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      args: [t.id, t.templateKey, t.name, t.templateBody, t.variablesJson],
    });
  }

  // 8. Sample Realistic Demo Data (Customers, Equipment, Jobs, Inventory)
  // Demo Customer 1
  await client.execute(`
    INSERT INTO customers (id, customer_code, full_name, primary_phone, email, customer_type, notes)
    VALUES ('CUST-001', 'CUST-10001', 'Karthik Ramanathan', '+91 98430 11223', 'karthik.r@gmail.com', 'INDIVIDUAL', 'Regular client')
  `);

  // Demo Device 1 (Encrypted passcode)
  await client.execute({
    sql: `INSERT INTO devices (id, customer_id, equipment_type, brand, model_name, serial_number, encrypted_security_passcode, specs_summary)
          VALUES ('DEV-001', 'CUST-001', 'LAPTOP', 'Lenovo', 'ThinkPad T14 Gen 2', 'PF39AB12', ?, 'Intel Core i7-1165G7, 16GB RAM, 512GB NVMe')`,
    args: [encryptSecret('user@2026')],
  });

  // Demo Service Job 1
  await client.execute(`
    INSERT INTO service_jobs (id, job_number, customer_id, device_id, service_category, current_status, priority, assigned_technician_id, reported_issue, accessories_received, estimated_cost, advance_deposit, created_by)
    VALUES ('JOB-001', 'JOB-2026-00001', 'CUST-001', 'DEV-001', 'CHIP_LEVEL', 'UNDER_INSPECTION', 'NORMAL', 'USR_TECH1', 'No power, battery light blinks orange 3 times and turns off', '["CHARGER", "BAG"]', 3500.0, 500.0, 'USR_RECEPTION')
  `);

  // Initial Job Status History
  await client.execute(`
    INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
    VALUES ('JSH-001', 'JOB-001', NULL, 'RECEIVED', 'USR_RECEPTION', 'Intake completed at counter')
  `);
  await client.execute(`
    INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
    VALUES ('JSH-002', 'JOB-001', 'RECEIVED', 'UNDER_INSPECTION', 'USR_TECH1', 'Technician started mother board diagnostic check')
  `);
}
