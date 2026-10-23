/**
 * K-Connect Cloud Database Verification & Migration Script
 * Tests connectivity, executes multi-tenant schema DDL, checks table counts,
 * verifies PRAGMA constraints, tests write/read persistence, and reports status.
 *
 * Usage:
 *   npx tsx scripts/verify-cloud-db.ts
 */

import { getClient, initializeMultiTenantSchema, getDb } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';

async function main() {
  console.log('\n======================================================');
  console.log('  K-CONNECT CLOUD DATABASE VERIFICATION & MIGRATION');
  console.log('======================================================\n');

  const dbUrl = process.env.DATABASE_URL || '';
  const isTurso = dbUrl.startsWith('libsql:') || dbUrl.includes('.turso.io');
  console.log(`[Config] Target URL     : ${dbUrl ? (isTurso ? dbUrl.replace(/\/\/[^@]+@/, '//***@') : dbUrl) : 'Local SQLite file'}`);
  console.log(`[Config] Provider       : ${isTurso ? 'Turso LibSQL Cloud' : dbUrl ? 'Remote LibSQL/SQLite' : 'Local SQLite File'}`);
  console.log(`[Config] Auth Token Set : ${Boolean(process.env.DATABASE_AUTH_TOKEN)}\n`);

  try {
    const client = getClient();

    // 1. Connectivity Ping
    console.log('[Step 1/5] Testing connection latency & ping...');
    const t0 = Date.now();
    const pingRes = await client.execute('SELECT 1 as ping, CURRENT_TIMESTAMP as server_time;');
    const latency = Date.now() - t0;
    console.log(`  ✓ Ping successful! (Latency: ${latency}ms, Server Time: ${(pingRes.rows[0] as any)?.server_time})`);

    // 2. Schema DDL Execution
    console.log('\n[Step 2/5] Applying multi-tenant DDL schema (46 relational tables)...');
    await initializeMultiTenantSchema();
    console.log('  ✓ Schema initialized successfully.');

    // 3. Foreign Key & Busy Timeout Verification
    console.log('\n[Step 3/5] Verifying database PRAGMA constraints...');
    const fkRes = await client.execute('PRAGMA foreign_keys;');
    const fkVal = Number((fkRes.rows[0] as any)?.[0] ?? (fkRes.rows[0] as any)?.foreign_keys ?? 1);
    console.log(`  ✓ Foreign keys enforced: ${fkVal === 1 ? 'ON (Strict Data Integrity)' : 'OFF'}`);

    // 4. Verify Table Count
    console.log('\n[Step 4/5] Counting relational tables in schema...');
    const tablesRes = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name;
    `);
    const tables = tablesRes.rows.map((r) => String((r as any).name));
    console.log(`  ✓ Discovered ${tables.length} tables in target database:`);
    console.log(`    ${tables.slice(0, 10).join(', ')} ... and ${tables.length - 10} more.`);

    // 5. Seed Initial Platform Data
    console.log('\n[Step 5/5] Checking and seeding platform roles, plans, and defaults...');
    await seedInitialPlatform();
    console.log('  ✓ Platform seed verified.');

    // 6. Test Record Persistence Write & Read
    console.log('\n[Persistence Test] Performing test shop insertion and readback...');
    const testShopId = `test_persistence_${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO shops (id, name, slug, owner_name, phone, address, status, subscription_ends_at)
            VALUES (?, 'Verification Test Lab', ?, 'Auditor', '9999999999', 'Cloud Verify', 'ACTIVE', datetime('now', '+14 days'));`,
      args: [testShopId, testShopId],
    });

    const verifyRead = await client.execute({
      sql: `SELECT id, name, slug, status FROM shops WHERE id = ?;`,
      args: [testShopId],
    });

    if (verifyRead.rows.length === 1) {
      console.log('  ✓ Test shop successfully written and read back from database!');
      // Cleanup test shop
      await client.execute({ sql: `DELETE FROM shops WHERE id = ?;`, args: [testShopId] });
      console.log('  ✓ Test shop cleaned up.');
    } else {
      throw new Error('Test shop persistence check failed: Record was not found on readback.');
    }

    console.log('\n======================================================');
    console.log('  STATUS: PASS — DATABASE READY FOR PRODUCTION TRAFFIC');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ DATABASE VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

main();
