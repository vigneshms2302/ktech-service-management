import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createClient } from '@libsql/client';

async function findSqliteFiles(dir: string, depth = 0, maxDepth = 4): Promise<string[]> {
  const results: string[] = [];
  if (depth > maxDepth || !fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and system folders
        if (!['node_modules', '.git', 'dist', 'out', 'AppData\\Local\\Temp'].some(skip => fullPath.includes(skip))) {
          results.push(...await findSqliteFiles(fullPath, depth + 1, maxDepth));
        }
      } else if (entry.isFile() && (entry.name.endsWith('.sqlite') || entry.name.endsWith('.db'))) {
        results.push(fullPath);
      }
    }
  } catch (err) {}
  return results;
}

async function inspectAndWipe(dbPath: string) {
  try {
    const client = createClient({ url: `file:${path.resolve(dbPath)}` });
    const custRes = await client.execute(`SELECT COUNT(*) as count FROM customers;`);
    const count = Number(custRes.rows[0]?.count || 0);
    console.log(`\n🔍 Found SQLite DB at: ${dbPath} (Customers: ${count})`);
    
    if (count > 0) {
      const rows = await client.execute(`SELECT id, customer_code, full_name, primary_phone FROM customers;`);
      console.log('   Customers rows:', rows.rows);
      
      console.log('   ⚡ WIPING ALL CUSTOMERS AND TRANSACTION DATA from this DB...');
      const tables = [
        'audit_logs', 'backups', 'communication_messages', 'customer_addresses',
        'customers', 'data_recovery_jobs', 'device_photos', 'devices',
        'inventory_items', 'inventory_locations', 'inventory_transactions',
        'invoice_items', 'invoices', 'job_attachments', 'job_checklists',
        'job_diagnosis', 'job_inspections', 'job_notes', 'job_parts',
        'job_repair_activities', 'job_services', 'job_status_history',
        'job_tests', 'payments', 'pc_build_items', 'pc_builds',
        'product_sale_items', 'product_sales', 'products', 'quotation_approvals',
        'quotation_items', 'quotations', 'salvage_devices', 'salvage_parts',
        'service_jobs', 'warranties', 'warranty_jobs'
      ];
      for (const t of tables) {
        try {
          await client.execute(`DELETE FROM ${t};`);
        } catch {}
      }
      console.log('   ✅ Wiped successfully!');
    }
  } catch (err: unknown) {
    console.log(`   Could not query ${dbPath}: ${(err as Error).message}`);
  }
}

async function main() {
  console.log('Searching for all SQLite databases across common paths...');
  const searchRoots = [
    'D:\\',
    path.join(os.homedir(), 'AppData', 'Roaming'),
    path.join(os.homedir(), 'AppData', 'Local'),
    path.join(os.homedir(), 'Documents'),
    process.cwd(),
  ];

  const foundDbs = new Set<string>();
  for (const root of searchRoots) {
    if (fs.existsSync(root)) {
      const dbs = await findSqliteFiles(root, 0, 3);
      for (const db of dbs) {
        foundDbs.add(db);
      }
    }
  }

  console.log(`Found ${foundDbs.size} SQLite database files.`);
  for (const db of foundDbs) {
    if (db.includes('ktech') || db.includes('K-Connect') || db.includes('k-connect') || db.includes('service')) {
      await inspectAndWipe(db);
    }
  }
}

main().catch(console.error);
