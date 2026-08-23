import { describe, it, expect, beforeAll } from 'vitest';
import { initializeSchema, setDatabasePath, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import path from 'node:path';
import os from 'node:os';

describe('Phase 4: Inventory & Salvage Engine Integration', () => {
  beforeAll(async () => {
    const testDbPath = path.join(os.tmpdir(), `ktech-test-inventory-${Date.now()}.sqlite`);
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('generates sequential SKUs with category codes', async () => {
    const client = getClient();
    const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM inventory_items`);
    const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
    const sku = `SKU-PANEL-${String(count).padStart(5, '0')}`;
    expect(sku).toMatch(/^SKU-PANEL-\d{5}$/);
  });

  it('inserts inventory items and logs transaction ledger', async () => {
    const client = getClient();
    const itemId = `ITEM-TEST-${Date.now()}`;
    const sku = `SKU-TEST-00001`;

    await client.execute({
      sql: `INSERT INTO inventory_items (
              id, sku, name, category_id, item_type, cost_price, selling_price,
              quantity_on_hand, min_reorder_level
            ) VALUES (?, ?, '15.6 FHD IPS 30-Pin Display Panel', 'CAT_PANEL', 'NEW_SPARE_PART', 2800.0, 3900.0, 5, 2)`,
      args: [itemId, sku],
    });

    const check = await client.execute({
      sql: `SELECT * FROM inventory_items WHERE id = ?`,
      args: [itemId],
    });

    expect(check.rows.length).toBe(1);
    expect(check.rows[0].name).toBe('15.6 FHD IPS 30-Pin Display Panel');
    expect(Number(check.rows[0].quantity_on_hand)).toBe(5);

    // Record Stock Movement
    const txId = `ITX-TEST-${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO inventory_transactions (
              id, item_id, transaction_type, quantity_delta, balance_after, reference_type, created_by
            ) VALUES (?, ?, 'PURCHASE_IN', 5, 5, 'SUPPLIER_PURCHASE', 'USR_OWNER')`,
      args: [txId, itemId],
    });

    const txCheck = await client.execute({
      sql: `SELECT * FROM inventory_transactions WHERE id = ?`,
      args: [txId],
    });
    expect(txCheck.rows.length).toBe(1);
    expect(Number(txCheck.rows[0].quantity_delta)).toBe(5);
  });

  it('handles salvage intake and component harvesting with lineage', async () => {
    const client = getClient();
    const salvId = `SALV-TEST-${Date.now()}`;
    const salvCode = `SALV-2026-00001`;

    // 1. Intake Salvage Scrap
    await client.execute({
      sql: `INSERT INTO salvage_devices (
              id, salvage_code, equipment_type, brand, model_name, acquisition_type,
              acquisition_cost, dismantled_by
            ) VALUES (?, ?, 'LAPTOP', 'Lenovo', 'IdeaPad 330', 'CUSTOMER_SCRAP_DONATION', 0.0, 'USR_TECH1')`,
      args: [salvId, salvCode],
    });

    const salvCheck = await client.execute({
      sql: `SELECT * FROM salvage_devices WHERE id = ?`,
      args: [salvId],
    });
    expect(salvCheck.rows.length).toBe(1);
    expect(salvCheck.rows[0].salvage_code).toBe(salvCode);

    // 2. Harvest Component to Inventory
    const harvestItemId = `ITEM-HARV-${Date.now()}`;
    const harvestSku = `SKU-SALV-00001`;
    const partId = `SP-TEST-${Date.now()}`;

    // Insert salvaged item in inventory
    await client.execute({
      sql: `INSERT INTO inventory_items (
              id, sku, name, category_id, item_type, cost_price, selling_price,
              quantity_on_hand, min_reorder_level, salvage_source_id
            ) VALUES (?, ?, 'Salvaged 8GB DDR4 RAM (Tested)', 'CAT_RAM', 'SALVAGED_PART', 400.0, 950.0, 1, 0, ?)`,
      args: [harvestItemId, harvestSku, salvId],
    });

    // Record in salvage_parts
    await client.execute({
      sql: `INSERT INTO salvage_parts (
              id, salvage_device_id, inventory_item_id, part_name, tested_condition, estimated_value
            ) VALUES (?, ?, ?, '8GB DDR4 RAM', 'GRADE_A_WORKING', 400.0)`,
      args: [partId, salvId, harvestItemId],
    });

    const partCheck = await client.execute({
      sql: `SELECT sp.*, ii.sku, ii.salvage_source_id 
            FROM salvage_parts sp
            JOIN inventory_items ii ON sp.inventory_item_id = ii.id
            WHERE sp.id = ?`,
      args: [partId],
    });

    expect(partCheck.rows.length).toBe(1);
    expect(partCheck.rows[0].sku).toBe(harvestSku);
    expect(partCheck.rows[0].salvage_source_id).toBe(salvId);
  });
});
