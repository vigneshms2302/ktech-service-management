import { ipcMain } from 'electron';
import { getClient } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';
import { normalizePhone } from '../utils/phone.ts';

export function registerSearchIpc(): void {
  // Real Global Search across Phase 2 Entities (Ctrl+K)
  ipcMain.handle('search:global', async (_event, { query }: { query: string }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Authentication required' };
      }

      const q = (query || '').trim();
      if (!q || q.length < 1) {
        return { success: true, data: { customers: [], devices: [], jobs: [] } };
      }

      const client = getClient();
      const wildcard = `%${q}%`;
      const canonical = normalizePhone(q);

      // 1. Search Customers
      const customersRes = await client.execute({
        sql: `SELECT id, customer_code, full_name, primary_phone, email
              FROM customers 
              WHERE full_name LIKE ? 
                 OR customer_code LIKE ? 
                 OR primary_phone LIKE ? 
                 OR secondary_phone LIKE ?
                 OR email LIKE ?
                 OR REPLACE(REPLACE(REPLACE(primary_phone, ' ', ''), '-', ''), '+', '') LIKE ?
              ORDER BY created_at DESC 
              LIMIT 8`,
        args: [wildcard, wildcard, wildcard, wildcard, wildcard, `%${canonical || q}%`],
      });

      // 2. Search Equipment / Devices
      const devicesRes = await client.execute({
        sql: `SELECT d.id, d.equipment_type, d.brand, d.model_name, d.serial_number,
                     c.id as customer_id, c.full_name as customer_name, c.primary_phone as customer_phone
              FROM devices d
              LEFT JOIN customers c ON d.customer_id = c.id
              WHERE d.brand LIKE ? 
                 OR d.model_name LIKE ? 
                 OR d.serial_number LIKE ? 
                 OR d.equipment_type LIKE ?
                 OR c.full_name LIKE ?
              ORDER BY d.created_at DESC 
              LIMIT 8`,
        args: [wildcard, wildcard, wildcard, wildcard, wildcard],
      });

      // 3. Search Service Jobs
      const jobsRes = await client.execute({
        sql: `SELECT j.id, j.job_number, j.current_status, j.priority, j.service_category, j.reported_issue,
                     c.full_name as customer_name, c.primary_phone as customer_phone,
                     d.equipment_type, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial
              FROM service_jobs j
              LEFT JOIN customers c ON j.customer_id = c.id
              LEFT JOIN devices d ON j.device_id = d.id
              WHERE j.job_number LIKE ? 
                 OR j.reported_issue LIKE ? 
                 OR c.full_name LIKE ? 
                 OR c.primary_phone LIKE ? 
                 OR d.brand LIKE ? 
                 OR d.model_name LIKE ? 
                 OR d.serial_number LIKE ?
              ORDER BY j.created_at DESC 
              LIMIT 8`,
        args: [wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard],
      });

      return {
        success: true,
        data: {
          customers: customersRes.rows.map((r) => {
            const row = r as Record<string, unknown>;
            return {
              id: row.id as string,
              customerCode: row.customer_code as string,
              fullName: row.full_name as string,
              primaryPhone: row.primary_phone as string,
              email: (row.email as string) || null,
            };
          }),
          devices: devicesRes.rows.map((r) => {
            const row = r as Record<string, unknown>;
            return {
              id: row.id as string,
              equipmentType: row.equipment_type as string,
              brand: row.brand as string,
              modelName: row.model_name as string,
              serialNumber: (row.serial_number as string) || null,
              customerId: row.customer_id as string,
              customerName: (row.customer_name as string) || 'Unknown Customer',
            };
          }),
          jobs: jobsRes.rows.map((r) => {
            const row = r as Record<string, unknown>;
            return {
              id: row.id as string,
              jobNumber: row.job_number as string,
              currentStatus: row.current_status as string,
              priority: row.priority as string,
              reportedIssue: row.reported_issue as string,
              customerName: (row.customer_name as string) || 'Unknown Customer',
              customerPhone: (row.customer_phone as string) || '',
              deviceBrand: (row.device_brand as string) || '',
              deviceModel: (row.device_model as string) || '',
              deviceSerial: (row.device_serial as string) || '',
            };
          }),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
