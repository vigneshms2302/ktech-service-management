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

    res.json({ success: true, data: result.rows[0] });
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
    const { name, phone, email, address, city, state, pincode, gstin, upiId, logoUrl } = req.body;
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
        name || null,
        phone || null,
        email || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        gstin ? String(gstin).toUpperCase() : null,
        upiId || null,
        logoUrl || null,
        shopId,
      ],
    });

    const updated = await client.execute({
      sql: `SELECT * FROM shops WHERE id = ?`,
      args: [shopId],
    });

    res.json({ success: true, message: 'Shop details updated.', data: updated.rows[0] });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
