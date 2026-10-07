import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createClient } from '@libsql/client';
import { hashPassword } from '../electron/security/crypto.ts';

async function deepCleanDatabaseFile(dbPath: string) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[Clean] Skipping ${dbPath} (file does not exist)`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`[Clean] DEEP CLEANING DATABASE: ${dbPath}`);
  console.log(`========================================`);

  const client = createClient({
    url: `file:${path.resolve(dbPath)}`,
  });

  const tablesToWipe = [
    'audit_logs',
    'backups',
    'communication_messages',
    'customer_addresses',
    'customers',
    'data_recovery_jobs',
    'device_photos',
    'devices',
    'inventory_items',
    'inventory_locations',
    'inventory_transactions',
    'invoice_items',
    'invoices',
    'job_attachments',
    'job_checklists',
    'job_diagnosis',
    'job_inspections',
    'job_notes',
    'job_parts',
    'job_repair_activities',
    'job_services',
    'job_status_history',
    'job_tests',
    'payments',
    'pc_build_items',
    'pc_builds',
    'product_sale_items',
    'product_sales',
    'products',
    'quotation_approvals',
    'quotation_items',
    'quotations',
    'salvage_devices',
    'salvage_parts',
    'service_jobs',
    'warranties',
    'warranty_jobs',
    'users',
  ];

  for (const tbl of tablesToWipe) {
    try {
      const res = await client.execute(`DELETE FROM ${tbl};`);
      console.log(`  ✓ Wiped table: ${tbl}`);
    } catch (err: unknown) {
      // Table might not exist in old migrations
    }
  }

  // Reset all sequence counters and shop settings
  try {
    await client.execute(`DELETE FROM settings WHERE key LIKE 'shop.%' OR key LIKE 'sequence.%';`);
    await client.execute(`UPDATE settings SET value = '0' WHERE key = 'setup.completed';`);
    console.log(`  ✓ Reset setup.completed = '0'`);
  } catch (err: unknown) {}

  console.log(`[Clean] Database ${dbPath} successfully reset to DAY ZERO!`);
}

async function main() {
  const possiblePaths = [
    // 1. D: drive path
    path.join('D:\\', 'K-Connect', 'Data', 'database', 'ktech.sqlite'),
    // 2. Windows AppData path
    path.join(os.homedir(), 'AppData', 'Roaming', 'ktech-service-management', 'database', 'ktech.sqlite'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'K-Connect', 'database', 'ktech.sqlite'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'k-connect', 'database', 'ktech.sqlite'),
    // 3. Local repo data paths
    path.join(process.cwd(), 'data', 'ktech.sqlite'),
    path.join(process.cwd(), 'data', 'test', 'ktech.sqlite'),
  ];

  for (const p of possiblePaths) {
    await deepCleanDatabaseFile(p);
  }

  console.log(`\n✨ ALL LOCAL DATABASES CLEANED & FACTORY RESET COMPLETED!`);
}

main().catch(console.error);
