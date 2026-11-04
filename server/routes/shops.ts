import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';

export const shopsRouter = Router();

shopsRouter.use(authenticateToken);

// 1. Get current tenant shop details
shopsRouter.get('/me', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const result = await client.execute({
      sql: `
        SELECT s.*, sub.status as subscription_status, sub.trial_ends_at, sub.current_period_ends_at
        FROM shops s
        LEFT JOIN saas_subscriptions sub ON s.id = sub.shop_id
        WHERE s.id = ?
      `,
      args: [shopId],
    });

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const shopRow = result.rows[0] as Record<string, unknown>;

    // Fetch key-value settings from shop_settings table
    const settingsRes = await client.execute({
      sql: `SELECT key, value FROM shop_settings WHERE shop_id = ?`,
      args: [shopId],
    });

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      const r = row as Record<string, unknown>;
      if (typeof r.key === 'string' && typeof r.value === 'string') {
        settingsMap[r.key] = r.value;
      }
    }

    const tagline =
      settingsMap['shop.tagline'] ||
      (shopRow.tagline as string) ||
      'Chip-Level Laptop, Desktop & Mobile Repair Lab';

    res.json({
      success: true,
      data: {
        ...shopRow,
        tagline,
        settings: settingsMap,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Complete Shop Onboarding Wizard
shopsRouter.post('/onboarding', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const { address, primaryPhone, supportEmail, upiId, gstin } = req.body;
    const client = getClient();

    await client.execute({
      sql: `
        UPDATE shops 
        SET address = COALESCE(?, address),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            upi_id = COALESCE(?, upi_id),
            gstin = COALESCE(?, gstin),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        address || null,
        primaryPhone || null,
        supportEmail || null,
        upiId || null,
        gstin ? String(gstin).toUpperCase() : null,
        shopId,
      ],
    });

    const updated = await client.execute({
      sql: `SELECT * FROM shops WHERE id = ?`,
      args: [shopId],
    });

    res.json({
      success: true,
      message: 'Shop onboarding completed successfully.',
      data: {
        ...updated.rows[0],
        onboarding_completed: 1,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Update Shop Profile & Branding
shopsRouter.put('/me', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const { name, phone, email, address, city, state, pincode, gstin, upiId, logoUrl, tagline } = req.body;
    const client = getClient();

    await client.execute({
      sql: `
        UPDATE shops 
        SET name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            pincode = COALESCE(?, pincode),
            gstin = COALESCE(?, gstin),
            upi_id = COALESCE(?, upi_id),
            logo_url = COALESCE(?, logo_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        name !== undefined ? name : null,
        phone !== undefined ? phone : null,
        email !== undefined ? email : null,
        address !== undefined ? address : null,
        city !== undefined ? city : null,
        state !== undefined ? state : null,
        pincode !== undefined ? pincode : null,
        gstin !== undefined ? (gstin ? String(gstin).toUpperCase() : '') : null,
        upiId !== undefined ? upiId : null,
        logoUrl !== undefined ? logoUrl : null,
        shopId,
      ],
    });

    // Also persist shop settings
    if (tagline !== undefined) {
      await client.execute({
        sql: `
          INSERT INTO shop_settings (shop_id, key, value, category, updated_at)
          VALUES (?, 'shop.tagline', ?, 'GENERAL', CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [shopId, String(tagline).trim()],
      });
    }

    if (name !== undefined) {
      await client.execute({
        sql: `
          INSERT INTO shop_settings (shop_id, key, value, category, updated_at)
          VALUES (?, 'shop.name', ?, 'GENERAL', CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [shopId, String(name).trim()],
      });
    }

    if (phone !== undefined) {
      await client.execute({
        sql: `
          INSERT INTO shop_settings (shop_id, key, value, category, updated_at)
          VALUES (?, 'shop.phone', ?, 'GENERAL', CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [shopId, String(phone).trim()],
      });
    }

    if (address !== undefined) {
      await client.execute({
        sql: `
          INSERT INTO shop_settings (shop_id, key, value, category, updated_at)
          VALUES (?, 'shop.address', ?, 'GENERAL', CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [shopId, String(address).trim()],
      });
    }

    if (gstin !== undefined) {
      await client.execute({
        sql: `
          INSERT INTO shop_settings (shop_id, key, value, category, updated_at)
          VALUES (?, 'shop.gstin', ?, 'GENERAL', CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [shopId, String(gstin).trim().toUpperCase()],
      });
    }

    if (upiId !== undefined) {
      await client.execute({
        sql: `
          INSERT INTO shop_settings (shop_id, key, value, category, updated_at)
          VALUES (?, 'shop.upi_id', ?, 'GENERAL', CURRENT_TIMESTAMP)
          ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `,
        args: [shopId, String(upiId).trim()],
      });
    }

    const updated = await client.execute({
      sql: `SELECT * FROM shops WHERE id = ?`,
      args: [shopId],
    });

    const settingsRes = await client.execute({
      sql: `SELECT key, value FROM shop_settings WHERE shop_id = ?`,
      args: [shopId],
    });
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      const r = row as Record<string, unknown>;
      if (typeof r.key === 'string' && typeof r.value === 'string') {
        settingsMap[r.key] = r.value;
      }
    }

    res.json({
      success: true,
      message: 'Shop details updated.',
      data: {
        ...updated.rows[0],
        tagline: settingsMap['shop.tagline'] || '',
        settings: settingsMap,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
