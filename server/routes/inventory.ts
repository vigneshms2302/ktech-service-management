import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';

export const inventoryRouter = Router();

inventoryRouter.use(authenticateToken);

// List Inventory Items (with low-stock alerts)
inventoryRouter.get('/items', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const { lowStockOnly, search } = req.query;

    let query = `
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name,
        s.company_name as supplier_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN inventory_locations l ON i.location_id = l.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.shop_id = ?
    `;

    const args: (string | number)[] = [shopId];

    if (lowStockOnly === 'true') {
      query += ` AND i.quantity_on_hand <= i.min_reorder_level`;
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (i.name LIKE ? OR i.sku LIKE ? OR i.serial_number LIKE ?)`;
      args.push(q, q, q);
    }

    query += ` ORDER BY i.name ASC`;
    const result = await client.execute({ sql: query, args });

    res.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create Inventory Item
inventoryRouter.post('/items', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const {
      sku,
      name,
      categoryId,
      itemType = 'PART',
      serialNumber,
      costPrice = 0,
      sellingPrice = 0,
      hsnCode = '8471',
      taxRate = 18.0,
      quantityOnHand = 1,
      minReorderLevel = 2,
      locationId,
      supplierId,
      warrantyMonths = 0,
    } = req.body;

    const itemId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const finalSku = sku ? sku.trim().toUpperCase() : `SKU-${Date.now().toString().slice(-6)}`;

    // Ensure category exists or create default
    let catId = categoryId;
    if (!catId) {
      const catRes = await client.execute({
        sql: `SELECT id FROM inventory_categories WHERE shop_id = ? LIMIT 1`,
        args: [shopId],
      });
      if (catRes.rows.length > 0) {
        catId = catRes.rows[0].id;
      } else {
        catId = `CAT-${Date.now()}`;
        await client.execute({
          sql: `INSERT INTO inventory_categories (id, shop_id, name, code) VALUES (?, ?, 'General Spares', 'GEN')`,
          args: [catId, shopId],
        });
      }
    }

    await client.execute({
      sql: `INSERT INTO inventory_items (
              id, shop_id, sku, name, category_id, item_type, serial_number,
              cost_price, selling_price, hsn_code, tax_rate, quantity_on_hand,
              min_reorder_level, location_id, supplier_id, warranty_months
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        itemId,
        shopId,
        finalSku,
        name.trim(),
        catId,
        itemType,
        serialNumber ? serialNumber.trim() : null,
        Number(costPrice),
        Number(sellingPrice),
        hsnCode,
        Number(taxRate),
        Number(quantityOnHand),
        Number(minReorderLevel),
        locationId || null,
        supplierId || null,
        Number(warrantyMonths),
      ],
    });

    res.json({
      success: true,
      data: {
        id: itemId,
        sku: finalSku,
        quantityOnHand: Number(quantityOnHand),
        sellingPrice: Number(sellingPrice),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Salvage Harvesting: Convert Dead Device to Salvage Unit and Harvest Parts
inventoryRouter.post('/salvage', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const {
      originalJobId,
      equipmentType,
      brand,
      modelName,
      serialNumber,
      acquisitionCost = 0,
      harvestedParts = [], // array of { partName, testedCondition, estimatedValue, sellingPrice }
    } = req.body;

    const countRes = await client.execute({
      sql: `SELECT COUNT(*) as count FROM salvage_devices WHERE shop_id = ?`,
      args: [shopId],
    });
    const nextNum = Number((countRes.rows[0] as Record<string, unknown>).count) + 1;
    const salvageCode = `SALV-${String(nextNum).padStart(5, '0')}`;
    const salvageId = `SLV-${Date.now()}`;

    // 1. Create Salvage Device
    await client.execute({
      sql: `INSERT INTO salvage_devices (
              id, shop_id, salvage_code, original_service_job_id, equipment_type,
              brand, model_name, serial_number, acquisition_cost, dismantled_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        salvageId,
        shopId,
        salvageCode,
        originalJobId || null,
        equipmentType,
        brand,
        modelName,
        serialNumber || null,
        Number(acquisitionCost),
        req.user!.userId,
      ],
    });

    // 2. Harvest parts directly into inventory
    for (const p of harvestedParts) {
      const partItemId = `HARV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const partSku = `SP-${salvageCode}-${Math.floor(100 + Math.random() * 900)}`;

      // Fetch or create salvage category
      const catRes = await client.execute({
        sql: `SELECT id FROM inventory_categories WHERE shop_id = ? AND code = 'SALVAGE'`,
        args: [shopId],
      });
      let catId = catRes.rows[0]?.id as string;
      if (!catId) {
        catId = `CAT-SALV-${Date.now()}`;
        await client.execute({
          sql: `INSERT INTO inventory_categories (id, shop_id, name, code) VALUES (?, ?, 'Salvaged OEM Spares', 'SALVAGE')`,
          args: [catId, shopId],
        });
      }

      await client.execute({
        sql: `INSERT INTO inventory_items (
                id, shop_id, sku, name, category_id, item_type, cost_price,
                selling_price, quantity_on_hand, salvage_source_id
              ) VALUES (?, ?, ?, ?, ?, 'SALVAGED_PART', ?, ?, 1, ?)`,
        args: [
          partItemId,
          shopId,
          partSku,
          `${p.partName} (${brand} ${modelName} Harvested)`,
          catId,
          Number(p.estimatedValue || 0),
          Number(p.sellingPrice || 0),
          salvageId,
        ],
      });
    }

    res.json({ success: true, data: { salvageCode, partsHarvestedCount: harvestedParts.length } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Update Inventory Item (Stock Counts, Pricing, Metadata) ────────
inventoryRouter.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const client = getClient();

    // Verify item exists in current shop
    const existingRes = await client.execute({
      sql: `SELECT id FROM inventory_items WHERE shop_id = ? AND id = ?`,
      args: [shopId, id],
    });

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Inventory item not found in current shop organization.' });
      return;
    }

    const {
      name,
      costPrice,
      sellingPrice,
      quantityOnHand,
      minReorderLevel,
      locationId,
      supplierId,
      serialNumber,
    } = req.body;

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(String(name).trim());
    }
    if (costPrice !== undefined) {
      updates.push('cost_price = ?');
      args.push(Number(costPrice));
    }
    if (sellingPrice !== undefined) {
      updates.push('selling_price = ?');
      args.push(Number(sellingPrice));
    }
    if (quantityOnHand !== undefined) {
      updates.push('quantity_on_hand = ?');
      args.push(Number(quantityOnHand));
    }
    if (minReorderLevel !== undefined) {
      updates.push('min_reorder_level = ?');
      args.push(Number(minReorderLevel));
    }
    if (locationId !== undefined) {
      updates.push('location_id = ?');
      args.push(locationId || null);
    }
    if (supplierId !== undefined) {
      updates.push('supplier_id = ?');
      args.push(supplierId || null);
    }
    if (serialNumber !== undefined) {
      updates.push('serial_number = ?');
      args.push(serialNumber ? String(serialNumber).trim() : null);
    }

    if (updates.length > 0) {
      args.push(shopId, id);
      await client.execute({
        sql: `UPDATE inventory_items SET ${updates.join(', ')} WHERE shop_id = ? AND id = ?`,
        args,
      });
    }


    const updated = await client.execute({
      sql: `SELECT * FROM inventory_items WHERE shop_id = ? AND id = ?`,
      args: [shopId, id],
    });

    res.json({
      success: true,
      data: updated.rows[0],
      message: 'Inventory item updated successfully.',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
