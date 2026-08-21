import { ipcMain } from 'electron';
import { getClient, logAudit } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';
import { normalizePhone } from '../utils/phone.ts';
import type { InValue } from '@libsql/client';

export function registerCustomerIpc(): void {
  // List Customers with Job & Device Aggregations
  ipcMain.handle('customer:list', async (_event, params: { search?: string; page?: number; limit?: number } = {}) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission customers.read required' };
      }

      const client = getClient();
      const page = params.page || 1;
      const limit = params.limit || 50;
      const offset = (page - 1) * limit;
      const search = params.search ? params.search.trim() : '';

      let sqlQuery = `
        SELECT 
          c.id, c.customer_code, c.full_name, c.primary_phone, c.secondary_phone, 
          c.email, c.gstin, c.customer_type, c.notes, c.created_at, c.updated_at,
          (SELECT COUNT(*) FROM devices d WHERE d.customer_id = c.id) as device_count,
          (SELECT COUNT(*) FROM service_jobs j WHERE j.customer_id = c.id) as total_jobs_count,
          (SELECT COUNT(*) FROM service_jobs j WHERE j.customer_id = c.id AND j.current_status NOT IN ('DELIVERED', 'RETURNED_WITHOUT_REPAIR', 'SALVAGED', 'CANCELLED')) as active_jobs_count
        FROM customers c
      `;

      const args: InValue[] = [];

      if (search) {
        const canonicalPhone = normalizePhone(search);
        sqlQuery += `
          WHERE c.full_name LIKE ? 
             OR c.customer_code LIKE ? 
             OR c.primary_phone LIKE ? 
             OR c.secondary_phone LIKE ? 
             OR c.email LIKE ?
        `;
        const wildcard = `%${search}%`;
        args.push(wildcard, wildcard, wildcard, wildcard, wildcard);

        if (canonicalPhone && canonicalPhone !== search) {
          sqlQuery += ` OR REPLACE(REPLACE(REPLACE(c.primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?`;
          args.push(`%${canonicalPhone}%`);
        }
      }

      sqlQuery += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
      args.push(limit, offset);

      const result = await client.execute({ sql: sqlQuery, args });

      // Total count query
      let countQuery = 'SELECT COUNT(*) as total FROM customers c';
      const countArgs: InValue[] = [];
      if (search) {
        countQuery += ` WHERE c.full_name LIKE ? OR c.customer_code LIKE ? OR c.primary_phone LIKE ? OR c.email LIKE ?`;
        const wildcard = `%${search}%`;
        countArgs.push(wildcard, wildcard, wildcard, wildcard);
      }
      const countRes = await client.execute({ sql: countQuery, args: countArgs });
      const total = Number((countRes.rows[0] as unknown as { total: number }).total);

      return {
        success: true,
        data: {
          customers: result.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            customerCode: (row as Record<string, unknown>).customer_code,
            fullName: (row as Record<string, unknown>).full_name,
            primaryPhone: (row as Record<string, unknown>).primary_phone,
            secondaryPhone: (row as Record<string, unknown>).secondary_phone,
            email: (row as Record<string, unknown>).email,
            gstin: (row as Record<string, unknown>).gstin,
            customerType: (row as Record<string, unknown>).customer_type,
            notes: (row as Record<string, unknown>).notes,
            deviceCount: Number((row as Record<string, unknown>).device_count || 0),
            totalJobsCount: Number((row as Record<string, unknown>).total_jobs_count || 0),
            activeJobsCount: Number((row as Record<string, unknown>).active_jobs_count || 0),
            createdAt: (row as Record<string, unknown>).created_at,
            updatedAt: (row as Record<string, unknown>).updated_at,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Customer by ID (with full profile, devices, and jobs)
  ipcMain.handle('customer:getById', async (_event, { customerId }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission customers.read required' };
      }

      const client = getClient();

      // 1. Customer record
      const customerRes = await client.execute({
        sql: 'SELECT * FROM customers WHERE id = ?',
        args: [customerId],
      });

      if (customerRes.rows.length === 0) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = customerRes.rows[0] as Record<string, unknown>;

      // 2. Customer address
      const addressRes = await client.execute({
        sql: 'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC LIMIT 1',
        args: [customerId],
      });
      const address = addressRes.rows.length > 0 ? (addressRes.rows[0] as Record<string, unknown>) : null;

      // 3. Customer devices
      const devicesRes = await client.execute({
        sql: `SELECT d.*, 
                (SELECT COUNT(*) FROM service_jobs j WHERE j.device_id = d.id) as job_count
              FROM devices d 
              WHERE d.customer_id = ? 
              ORDER BY d.created_at DESC`,
        args: [customerId],
      });

      // 4. Customer service jobs
      const jobsRes = await client.execute({
        sql: `SELECT j.*, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial,
                u.full_name as technician_name
              FROM service_jobs j
              LEFT JOIN devices d ON j.device_id = d.id
              LEFT JOIN users u ON j.assigned_technician_id = u.id
              WHERE j.customer_id = ?
              ORDER BY j.created_at DESC`,
        args: [customerId],
      });

      return {
        success: true,
        data: {
          customer: {
            id: customer.id,
            customerCode: customer.customer_code,
            fullName: customer.full_name,
            primaryPhone: customer.primary_phone,
            secondaryPhone: customer.secondary_phone,
            email: customer.email,
            gstin: customer.gstin,
            customerType: customer.customer_type,
            notes: customer.notes,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at,
          },
          address: address
            ? {
                id: address.id,
                addressLine1: address.address_line1,
                addressLine2: address.address_line2,
                landmark: address.landmark,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
              }
            : null,
          devices: devicesRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            customerId: (row as Record<string, unknown>).customer_id,
            equipmentType: (row as Record<string, unknown>).equipment_type,
            brand: (row as Record<string, unknown>).brand,
            modelName: (row as Record<string, unknown>).model_name,
            serialNumber: (row as Record<string, unknown>).serial_number,
            colorFinish: (row as Record<string, unknown>).color_finish,
            specsSummary: (row as Record<string, unknown>).specs_summary,
            hasPasscode: Boolean((row as Record<string, unknown>).encrypted_security_passcode),
            jobCount: Number((row as Record<string, unknown>).job_count || 0),
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          jobs: jobsRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobNumber: (row as Record<string, unknown>).job_number,
            serviceCategory: (row as Record<string, unknown>).service_category,
            currentStatus: (row as Record<string, unknown>).current_status,
            priority: (row as Record<string, unknown>).priority,
            reportedIssue: (row as Record<string, unknown>).reported_issue,
            estimatedCost: Number((row as Record<string, unknown>).estimated_cost || 0),
            advanceDeposit: Number((row as Record<string, unknown>).advance_deposit || 0),
            promisedDeliveryDate: (row as Record<string, unknown>).promised_delivery_date,
            deviceBrand: (row as Record<string, unknown>).device_brand,
            deviceModel: (row as Record<string, unknown>).device_model,
            deviceSerial: (row as Record<string, unknown>).device_serial,
            technicianName: (row as Record<string, unknown>).technician_name,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Check Customer Duplicates (Exact & Normalized Phone, Email, Name)
  ipcMain.handle('customer:checkDuplicates', async (_event, params: { phone?: string; email?: string; fullName?: string }) => {
    try {
      const client = getClient();
      const rawPhone = (params.phone || '').trim();
      const canonicalPhone = normalizePhone(rawPhone);
      const email = (params.email || '').trim().toLowerCase();
      const fullName = (params.fullName || '').trim();

      const matches: Array<{ id: string; customerCode: string; fullName: string; primaryPhone: string; email: string | null; matchReason: string }> = [];

      // 1. Check phone matches (exact or normalized)
      if (rawPhone || canonicalPhone) {
        const phoneRes = await client.execute({
          sql: `SELECT id, customer_code, full_name, primary_phone, secondary_phone, email 
                FROM customers 
                WHERE primary_phone = ? 
                   OR secondary_phone = ? 
                   OR REPLACE(REPLACE(REPLACE(primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?`,
          args: [rawPhone, rawPhone, `%${canonicalPhone}%`],
        });

        phoneRes.rows.forEach((r) => {
          const row = r as Record<string, unknown>;
          matches.push({
            id: row.id as string,
            customerCode: row.customer_code as string,
            fullName: row.full_name as string,
            primaryPhone: row.primary_phone as string,
            email: (row.email as string) || null,
            matchReason: 'PHONE_MATCH',
          });
        });
      }

      // 2. Check email matches if provided
      if (email && email.length > 3) {
        const emailRes = await client.execute({
          sql: 'SELECT id, customer_code, full_name, primary_phone, email FROM customers WHERE LOWER(email) = ?',
          args: [email],
        });

        emailRes.rows.forEach((r) => {
          const row = r as Record<string, unknown>;
          if (!matches.some((m) => m.id === row.id)) {
            matches.push({
              id: row.id as string,
              customerCode: row.customer_code as string,
              fullName: row.full_name as string,
              primaryPhone: row.primary_phone as string,
              email: (row.email as string) || null,
              matchReason: 'EMAIL_MATCH',
            });
          }
        });
      }

      // 3. Exact full name match
      if (fullName && fullName.length > 2) {
        const nameRes = await client.execute({
          sql: 'SELECT id, customer_code, full_name, primary_phone, email FROM customers WHERE LOWER(full_name) = ?',
          args: [fullName.toLowerCase()],
        });

        nameRes.rows.forEach((r) => {
          const row = r as Record<string, unknown>;
          if (!matches.some((m) => m.id === row.id)) {
            matches.push({
              id: row.id as string,
              customerCode: row.customer_code as string,
              fullName: row.full_name as string,
              primaryPhone: row.primary_phone as string,
              email: (row.email as string) || null,
              matchReason: 'NAME_MATCH',
            });
          }
        });
      }

      return { success: true, data: matches };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create Customer with Transaction & Sequence Counter
  ipcMain.handle('customer:create', async (_event, payload: {
    fullName: string;
    primaryPhone: string;
    secondaryPhone?: string;
    email?: string;
    gstin?: string;
    customerType?: 'INDIVIDUAL' | 'COMMERCIAL';
    notes?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.create') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission customers.create required' };
      }

      if (!payload.fullName || !payload.fullName.trim()) {
        return { success: false, error: 'Customer full name is required' };
      }
      if (!payload.primaryPhone || !payload.primaryPhone.trim()) {
        return { success: false, error: 'Primary phone number is required' };
      }

      const client = getClient();

      // Atomic Sequence counter in settings
      await client.execute(`
        INSERT INTO settings (key, value, category) 
        VALUES ('sequence.customer_counter', '10001', 'SEQUENCE')
        ON CONFLICT(key) DO NOTHING
      `);

      const seqRes = await client.execute(`
        UPDATE settings 
        SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = CURRENT_TIMESTAMP
        WHERE key = 'sequence.customer_counter'
        RETURNING value;
      `);

      const nextVal = seqRes.rows[0] ? (seqRes.rows[0] as Record<string, unknown>).value : '10002';
      const customerCode = `CUST-${nextVal}`;
      const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Insert customer record
      await client.execute({
        sql: `INSERT INTO customers (id, customer_code, full_name, primary_phone, secondary_phone, email, gstin, customer_type, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          customerId,
          customerCode,
          payload.fullName.trim(),
          payload.primaryPhone.trim(),
          payload.secondaryPhone ? payload.secondaryPhone.trim() : null,
          payload.email ? payload.email.trim().toLowerCase() : null,
          payload.gstin ? payload.gstin.trim().toUpperCase() : null,
          payload.customerType || 'INDIVIDUAL',
          payload.notes ? payload.notes.trim() : null,
        ],
      });

      // Insert optional address
      if (payload.addressLine1 && payload.addressLine1.trim()) {
        const addressId = `CADDR-${Date.now()}`;
        await client.execute({
          sql: `INSERT INTO customer_addresses (id, customer_id, address_line1, address_line2, city, state, pincode, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          args: [
            addressId,
            customerId,
            payload.addressLine1.trim(),
            payload.addressLine2 ? payload.addressLine2.trim() : null,
            payload.city ? payload.city.trim() : 'Coimbatore',
            payload.state ? payload.state.trim() : 'Tamil Nadu',
            payload.pincode ? payload.pincode.trim() : null,
          ],
        });
      }

      await logAudit(session.id, 'CUSTOMER_CREATED', 'customers', customerId, null, {
        customerCode,
        fullName: payload.fullName,
        primaryPhone: payload.primaryPhone,
      });

      return {
        success: true,
        data: {
          id: customerId,
          customerCode,
          fullName: payload.fullName,
          primaryPhone: payload.primaryPhone,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Update Customer
  ipcMain.handle('customer:update', async (_event, payload: {
    id: string;
    fullName: string;
    primaryPhone: string;
    secondaryPhone?: string;
    email?: string;
    gstin?: string;
    customerType?: 'INDIVIDUAL' | 'COMMERCIAL';
    notes?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.edit') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission customers.edit required' };
      }

      const client = getClient();
      const prev = await client.execute({
        sql: 'SELECT * FROM customers WHERE id = ?',
        args: [payload.id],
      });

      if (prev.rows.length === 0) {
        return { success: false, error: 'Customer not found' };
      }

      await client.execute({
        sql: `UPDATE customers 
              SET full_name = ?, primary_phone = ?, secondary_phone = ?, email = ?, gstin = ?, customer_type = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [
          payload.fullName.trim(),
          payload.primaryPhone.trim(),
          payload.secondaryPhone ? payload.secondaryPhone.trim() : null,
          payload.email ? payload.email.trim().toLowerCase() : null,
          payload.gstin ? payload.gstin.trim().toUpperCase() : null,
          payload.customerType || 'INDIVIDUAL',
          payload.notes ? payload.notes.trim() : null,
          payload.id,
        ],
      });

      // Update address
      if (payload.addressLine1 && payload.addressLine1.trim()) {
        const addrCheck = await client.execute({
          sql: 'SELECT id FROM customer_addresses WHERE customer_id = ? AND is_default = 1',
          args: [payload.id],
        });

        if (addrCheck.rows.length > 0) {
          await client.execute({
            sql: `UPDATE customer_addresses 
                  SET address_line1 = ?, address_line2 = ?, city = ?, state = ?, pincode = ?
                  WHERE customer_id = ? AND is_default = 1`,
            args: [
              payload.addressLine1.trim(),
              payload.addressLine2 ? payload.addressLine2.trim() : null,
              payload.city ? payload.city.trim() : 'Coimbatore',
              payload.state ? payload.state.trim() : 'Tamil Nadu',
              payload.pincode ? payload.pincode.trim() : null,
              payload.id,
            ],
          });
        } else {
          await client.execute({
            sql: `INSERT INTO customer_addresses (id, customer_id, address_line1, address_line2, city, state, pincode, is_default)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            args: [
              `CADDR-${Date.now()}`,
              payload.id,
              payload.addressLine1.trim(),
              payload.addressLine2 ? payload.addressLine2.trim() : null,
              payload.city ? payload.city.trim() : 'Coimbatore',
              payload.state ? payload.state.trim() : 'Tamil Nadu',
              payload.pincode ? payload.pincode.trim() : null,
            ],
          });
        }
      }

      await logAudit(session.id, 'CUSTOMER_UPDATED', 'customers', payload.id, prev.rows[0], payload);

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Fast Customer Search (Autocomplete / Wizard)
  ipcMain.handle('customer:search', async (_event, { query }: { query: string }) => {
    try {
      const client = getClient();
      const q = (query || '').trim();
      if (!q) return { success: true, data: [] };

      const canonicalPhone = normalizePhone(q);
      const wildcard = `%${q}%`;

      const result = await client.execute({
        sql: `SELECT id, customer_code, full_name, primary_phone, email,
                (SELECT COUNT(*) FROM devices d WHERE d.customer_id = customers.id) as device_count
              FROM customers 
              WHERE full_name LIKE ? 
                 OR customer_code LIKE ? 
                 OR primary_phone LIKE ? 
                 OR REPLACE(REPLACE(REPLACE(primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?
              ORDER BY created_at DESC 
              LIMIT 15`,
        args: [wildcard, wildcard, wildcard, `%${canonicalPhone || q}%`],
      });

      return {
        success: true,
        data: result.rows.map((row) => ({
          id: (row as Record<string, unknown>).id,
          customerCode: (row as Record<string, unknown>).customer_code,
          fullName: (row as Record<string, unknown>).full_name,
          primaryPhone: (row as Record<string, unknown>).primary_phone,
          email: (row as Record<string, unknown>).email,
          deviceCount: Number((row as Record<string, unknown>).device_count || 0),
        })),
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
