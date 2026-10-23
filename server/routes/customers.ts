import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  createCustomerSchema,
  updateCustomerSchema,
  addDeviceSchema,
} from '../validation/schemas.ts';
import { encryptSecret } from '../security/crypto.ts';

export const customersRouter = Router();

customersRouter.use(authenticateToken);

// List Customers (with search & pagination)
customersRouter.get('/', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const { search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM devices d WHERE d.customer_id = c.id AND d.shop_id = c.shop_id) as device_count,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.customer_id = c.id AND j.shop_id = c.shop_id) as total_jobs_count
      FROM customers c
      WHERE c.shop_id = ?
    `;

    const args: (string | number)[] = [shopId];

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (c.full_name LIKE ? OR c.primary_phone LIKE ? OR c.customer_code LIKE ? OR c.email LIKE ?)`;
      args.push(q, q, q, q);
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    args.push(Number(limit), Number(offset));

    const result = await client.execute({ sql: query, args });

    res.json({
      success: true,
      data: result.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id,
          customerCode: row.customer_code,
          fullName: row.full_name,
          primaryPhone: row.primary_phone,
          secondaryPhone: row.secondary_phone,
          email: row.email,
          gstin: row.gstin,
          customerType: row.customer_type,
          notes: row.notes,
          deviceCount: Number(row.device_count || 0),
          totalJobsCount: Number(row.total_jobs_count || 0),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create Customer
customersRouter.post('/', validateBody(createCustomerSchema), async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const { fullName, primaryPhone, secondaryPhone, email, gstin, customerType = 'INDIVIDUAL', notes } = req.body;

    const countRes = await client.execute({
      sql: `SELECT COUNT(*) as count FROM customers WHERE shop_id = ?`,
      args: [shopId],
    });
    const nextNum = Number((countRes.rows[0] as Record<string, unknown>).count) + 1;
    const customerCode = `CUST-${String(nextNum).padStart(4, '0')}`;
    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await client.execute({
      sql: `INSERT INTO customers (id, shop_id, customer_code, full_name, primary_phone, secondary_phone, email, gstin, customer_type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        customerId,
        shopId,
        customerCode,
        fullName.trim(),
        primaryPhone.trim(),
        secondaryPhone ? secondaryPhone.trim() : null,
        email && email.trim() ? email.trim() : null,
        gstin ? gstin.trim().toUpperCase() : null,
        customerType,
        notes || null,
      ],
    });

    res.json({
      success: true,
      data: {
        id: customerId,
        customerCode,
        fullName,
        primaryPhone,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Update Customer (Missing Endpoint Implemented) ─────────────────
customersRouter.put('/:id', validateBody(updateCustomerSchema), async (req, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId;
    const client = getClient();

    // Verify customer exists in current tenant shop
    const existingRes = await client.execute({
      sql: `SELECT * FROM customers WHERE shop_id = ? AND (id = ? OR customer_code = ?)`,
      args: [shopId, id, id],
    });

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found in current shop organization.' });
      return;
    }

    const customer = existingRes.rows[0] as Record<string, unknown>;
    const actualCustomerId = String(customer.id);

    const { fullName, primaryPhone, secondaryPhone, email, gstin, customerType, notes } = req.body;

    const updates: string[] = [];
    const args: (string | null)[] = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      args.push(fullName.trim());
    }
    if (primaryPhone !== undefined) {
      updates.push('primary_phone = ?');
      args.push(primaryPhone.trim());
    }
    if (secondaryPhone !== undefined) {
      updates.push('secondary_phone = ?');
      args.push(secondaryPhone ? secondaryPhone.trim() : null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      args.push(email && email.trim() ? email.trim() : null);
    }
    if (gstin !== undefined) {
      updates.push('gstin = ?');
      args.push(gstin ? gstin.trim().toUpperCase() : null);
    }
    if (customerType !== undefined) {
      updates.push('customer_type = ?');
      args.push(customerType);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      args.push(notes || null);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      args.push(shopId, actualCustomerId);
      await client.execute({
        sql: `UPDATE customers SET ${updates.join(', ')} WHERE shop_id = ? AND id = ?`,
        args,
      });
    }

    // Return the updated customer record
    const updatedRes = await client.execute({
      sql: `SELECT * FROM customers WHERE shop_id = ? AND id = ?`,
      args: [shopId, actualCustomerId],
    });

    res.json({
      success: true,
      data: updatedRes.rows[0],
      message: 'Customer updated successfully.',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get Customer Profile with Registered Devices & History
customersRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const client = getClient();

    const custRes = await client.execute({
      sql: `SELECT * FROM customers WHERE shop_id = ? AND (id = ? OR customer_code = ?)`,
      args: [shopId, id, id],
    });

    if (custRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found in current shop organization.' });
      return;
    }

    const customer = custRes.rows[0] as Record<string, unknown>;
    const targetCustId = String(customer.id);

    const [devicesRes, jobsRes, addressesRes] = await Promise.all([
      client.execute({ sql: `SELECT * FROM devices WHERE shop_id = ? AND customer_id = ? ORDER BY created_at DESC`, args: [shopId, targetCustId] }),
      client.execute({ sql: `SELECT * FROM service_jobs WHERE shop_id = ? AND customer_id = ? ORDER BY created_at DESC`, args: [shopId, targetCustId] }),
      client.execute({ sql: `SELECT * FROM customer_addresses WHERE shop_id = ? AND customer_id = ?`, args: [shopId, targetCustId] }),
    ]);

    res.json({
      success: true,
      data: {
        customer,
        devices: devicesRes.rows,
        jobs: jobsRes.rows,
        addresses: addressesRes.rows,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Add Equipment Device to Customer (Scoped to current tenant shop)
customersRouter.post('/:id/devices', validateBody(addDeviceSchema), async (req, res) => {
  try {
    const id = String(req.params.id);
    const shopId = req.user!.shopId;
    const client = getClient();

    // Verify customer belongs to current tenant shop
    const custRes = await client.execute({
      sql: `SELECT id FROM customers WHERE shop_id = ? AND (id = ? OR customer_code = ?)`,
      args: [shopId, id, id],
    });
    if (custRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found in current shop organization.' });
      return;
    }
    const actualCustomerId = String(custRes.rows[0].id);

    const { equipmentType, brand, modelName, serialNumber, colorFinish, passcode, specsSummary } = req.body;

    const deviceId = `DEV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await client.execute({
      sql: `INSERT INTO devices (id, shop_id, customer_id, equipment_type, brand, model_name, serial_number, color_finish, encrypted_security_passcode, specs_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        deviceId,
        shopId,
        actualCustomerId,
        equipmentType || 'LAPTOP',
        brand.trim(),
        modelName.trim(),
        serialNumber ? serialNumber.trim() : null,
        colorFinish ? colorFinish.trim() : null,
        passcode ? encryptSecret(passcode.trim()) : null,
        specsSummary || null,
      ],
    });

    res.json({
      success: true,
      data: {
        id: deviceId,
        customerId: actualCustomerId,
        equipmentType,
        brand,
        modelName,
        serialNumber,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
