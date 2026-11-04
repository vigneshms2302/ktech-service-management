import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';

export const searchRouter = Router();

// Multi-Entity Global Search (Jobs, Customers, Devices)
searchRouter.get('/', authenticateToken, async (req, res) => {
  try {
    const rawQuery = String(req.query.query || req.query.q || req.query.search || '').trim();
    const shopId = (req as any).user?.shopId;

    if (!shopId) {
      res.status(401).json({ success: false, error: 'Unauthorized: Shop context missing.' });
      return;
    }

    if (!rawQuery || rawQuery.length < 1) {
      res.json({
        success: true,
        data: { customers: [], devices: [], jobs: [] },
      });
      return;
    }

    const client = getClient();
    const wildcard = `%${rawQuery}%`;
    const cleanDigits = rawQuery.replace(/[^0-9]/g, '');
    const phoneWildcard = cleanDigits.length >= 4 ? `%${cleanDigits}%` : wildcard;

    // 1. Search Customers (by name, code, raw phone, stripped phone digits, email)
    const customerSql = `
      SELECT id, customer_code, full_name, primary_phone, email, customer_type
      FROM customers
      WHERE shop_id = ? AND (
        full_name LIKE ? OR
        customer_code LIKE ? OR
        primary_phone LIKE ? OR
        secondary_phone LIKE ? OR
        email LIKE ? OR
        REPLACE(REPLACE(REPLACE(primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?
      )
      ORDER BY created_at DESC
      LIMIT 8
    `;
    const customerRes = await client.execute({
      sql: customerSql,
      args: [shopId, wildcard, wildcard, wildcard, wildcard, wildcard, phoneWildcard],
    });

    const customers = customerRes.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        customerCode: String(row.customer_code || ''),
        fullName: String(row.full_name || ''),
        primaryPhone: String(row.primary_phone || ''),
        email: row.email ? String(row.email) : null,
        customerType: String(row.customer_type || 'INDIVIDUAL'),
      };
    });

    // 2. Search Devices / Equipment (by brand, model, serial, type, customer name)
    const deviceSql = `
      SELECT d.id, d.equipment_type, d.brand, d.model_name, d.serial_number,
             c.id as customer_id, c.full_name as customer_name, c.primary_phone as customer_phone
      FROM devices d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.shop_id = ? AND (
        d.brand LIKE ? OR
        d.model_name LIKE ? OR
        d.serial_number LIKE ? OR
        d.equipment_type LIKE ? OR
        c.full_name LIKE ? OR
        REPLACE(REPLACE(REPLACE(c.primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?
      )
      ORDER BY d.created_at DESC
      LIMIT 8
    `;
    const deviceRes = await client.execute({
      sql: deviceSql,
      args: [shopId, wildcard, wildcard, wildcard, wildcard, wildcard, phoneWildcard],
    });

    const devices = deviceRes.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        equipmentType: String(row.equipment_type || 'Laptop'),
        brand: String(row.brand || ''),
        modelName: String(row.model_name || ''),
        serialNumber: String(row.serial_number || ''),
        customerId: String(row.customer_id || ''),
        customerName: String(row.customer_name || ''),
        customerPhone: String(row.customer_phone || ''),
      };
    });

    // 3. Search Service Jobs (by job number, issue, customer name, phone, device info)
    const jobsSql = `
      SELECT j.id, j.job_number, j.current_status, j.priority, j.service_category, j.reported_issue,
             c.id as customer_id, c.full_name as customer_name, c.primary_phone as customer_phone,
             d.equipment_type, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial
      FROM service_jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN devices d ON j.device_id = d.id
      WHERE j.shop_id = ? AND (
        j.job_number LIKE ? OR
        j.reported_issue LIKE ? OR
        j.service_category LIKE ? OR
        c.full_name LIKE ? OR
        c.primary_phone LIKE ? OR
        REPLACE(REPLACE(REPLACE(c.primary_phone, ' ', ''), '-', ''), '+', '') LIKE ? OR
        d.serial_number LIKE ? OR
        d.model_name LIKE ? OR
        d.brand LIKE ?
      )
      ORDER BY j.created_at DESC
      LIMIT 8
    `;
    const jobsRes = await client.execute({
      sql: jobsSql,
      args: [shopId, wildcard, wildcard, wildcard, wildcard, wildcard, phoneWildcard, wildcard, wildcard, wildcard],
    });

    const jobs = jobsRes.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        jobNumber: String(row.job_number || ''),
        currentStatus: String(row.current_status || 'RECEIVED'),
        priority: String(row.priority || 'NORMAL'),
        serviceCategory: String(row.service_category || 'General'),
        reportedIssue: String(row.reported_issue || ''),
        customerId: String(row.customer_id || ''),
        customerName: String(row.customer_name || ''),
        customerPhone: String(row.customer_phone || ''),
        equipmentType: String(row.equipment_type || 'Device'),
        deviceBrand: String(row.device_brand || ''),
        deviceModel: String(row.device_model || ''),
        deviceSerial: String(row.device_serial || ''),
      };
    });

    res.json({
      success: true,
      data: {
        customers,
        devices,
        jobs,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

