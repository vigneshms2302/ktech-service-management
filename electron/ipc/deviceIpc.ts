import { ipcMain } from 'electron';
import { getClient, logAudit, ensureDirectories } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';
import { encryptSecret } from '../security/crypto.ts';
import type { InValue } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

export function registerDeviceIpc(): void {
  // List Devices
  ipcMain.handle('device:list', async (_event, params: { customerId?: string; search?: string; limit?: number } = {}) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission customers.read required' };
      }

      const client = getClient();
      const limit = params.limit || 50;
      let sqlQuery = `
        SELECT d.*, c.full_name as customer_name, c.primary_phone as customer_phone,
               (SELECT COUNT(*) FROM service_jobs j WHERE j.device_id = d.id) as job_count
        FROM devices d
        LEFT JOIN customers c ON d.customer_id = c.id
      `;
      const args: InValue[] = [];

      if (params.customerId) {
        sqlQuery += ` WHERE d.customer_id = ?`;
        args.push(params.customerId);
      } else if (params.search) {
        const wildcard = `%${params.search.trim()}%`;
        sqlQuery += ` WHERE d.brand LIKE ? OR d.model_name LIKE ? OR d.serial_number LIKE ? OR c.full_name LIKE ?`;
        args.push(wildcard, wildcard, wildcard, wildcard);
      }

      sqlQuery += ` ORDER BY d.created_at DESC LIMIT ?`;
      args.push(limit);

      const result = await client.execute({ sql: sqlQuery, args });

      return {
        success: true,
        data: result.rows.map((row) => ({
          id: (row as Record<string, unknown>).id,
          customerId: (row as Record<string, unknown>).customer_id,
          customerName: (row as Record<string, unknown>).customer_name,
          customerPhone: (row as Record<string, unknown>).customer_phone,
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
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Device by ID (with owner and job history)
  ipcMain.handle('device:getById', async (_event, { deviceId }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.read') && session.roleId !== 'ROLE_OWNER')) {
        return { success: false, error: 'Unauthorized: Permission customers.read required' };
      }

      const client = getClient();

      const deviceRes = await client.execute({
        sql: `SELECT d.*, c.full_name as customer_name, c.primary_phone as customer_phone, c.customer_code
              FROM devices d
              LEFT JOIN customers c ON d.customer_id = c.id
              WHERE d.id = ?`,
        args: [deviceId],
      });

      if (deviceRes.rows.length === 0) {
        return { success: false, error: 'Equipment not found' };
      }

      const device = deviceRes.rows[0] as Record<string, unknown>;

      // Jobs history for this device
      const jobsRes = await client.execute({
        sql: `SELECT j.*, u.full_name as technician_name
              FROM service_jobs j
              LEFT JOIN users u ON j.assigned_technician_id = u.id
              WHERE j.device_id = ?
              ORDER BY j.created_at DESC`,
        args: [deviceId],
      });

      // Photos attached to this device
      const photosRes = await client.execute({
        sql: `SELECT * FROM device_photos WHERE device_id = ? ORDER BY created_at DESC`,
        args: [deviceId],
      });

      return {
        success: true,
        data: {
          device: {
            id: device.id,
            customerId: device.customer_id,
            customerName: device.customer_name,
            customerPhone: device.customer_phone,
            customerCode: device.customer_code,
            equipmentType: device.equipment_type,
            brand: device.brand,
            modelName: device.model_name,
            serialNumber: device.serial_number,
            colorFinish: device.color_finish,
            specsSummary: device.specs_summary,
            hasPasscode: Boolean(device.encrypted_security_passcode),
            createdAt: device.created_at,
          },
          jobs: jobsRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            jobNumber: (row as Record<string, unknown>).job_number,
            serviceCategory: (row as Record<string, unknown>).service_category,
            currentStatus: (row as Record<string, unknown>).current_status,
            priority: (row as Record<string, unknown>).priority,
            reportedIssue: (row as Record<string, unknown>).reported_issue,
            technicianName: (row as Record<string, unknown>).technician_name,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
          photos: photosRes.rows.map((row) => ({
            id: (row as Record<string, unknown>).id,
            photoType: (row as Record<string, unknown>).photo_type,
            filePath: (row as Record<string, unknown>).file_path,
            caption: (row as Record<string, unknown>).caption,
            createdAt: (row as Record<string, unknown>).created_at,
          })),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Check Equipment Duplicates for a Customer
  ipcMain.handle('device:checkDuplicates', async (_event, params: { customerId: string; serialNumber?: string; brand?: string; modelName?: string }) => {
    try {
      const client = getClient();
      const matches: Array<{ id: string; equipmentType: string; brand: string; modelName: string; serialNumber: string | null; matchReason: string }> = [];

      const serial = (params.serialNumber || '').trim();
      const brand = (params.brand || '').trim();
      const model = (params.modelName || '').trim();

      if (serial) {
        const serialRes = await client.execute({
          sql: `SELECT id, equipment_type, brand, model_name, serial_number 
                FROM devices 
                WHERE customer_id = ? AND LOWER(serial_number) = ?`,
          args: [params.customerId, serial.toLowerCase()],
        });

        serialRes.rows.forEach((r) => {
          const row = r as Record<string, unknown>;
          matches.push({
            id: row.id as string,
            equipmentType: row.equipment_type as string,
            brand: row.brand as string,
            modelName: row.model_name as string,
            serialNumber: (row.serial_number as string) || null,
            matchReason: 'SERIAL_MATCH',
          });
        });
      }

      if (brand && model) {
        const modelRes = await client.execute({
          sql: `SELECT id, equipment_type, brand, model_name, serial_number 
                FROM devices 
                WHERE customer_id = ? AND LOWER(brand) = ? AND LOWER(model_name) = ?`,
          args: [params.customerId, brand.toLowerCase(), model.toLowerCase()],
        });

        modelRes.rows.forEach((r) => {
          const row = r as Record<string, unknown>;
          if (!matches.some((m) => m.id === row.id)) {
            matches.push({
              id: row.id as string,
              equipmentType: row.equipment_type as string,
              brand: row.brand as string,
              modelName: row.model_name as string,
              serialNumber: (row.serial_number as string) || null,
              matchReason: 'MODEL_MATCH',
            });
          }
        });
      }

      return { success: true, data: matches };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create Equipment
  ipcMain.handle('device:create', async (_event, payload: {
    customerId: string;
    equipmentType: string;
    brand: string;
    modelName: string;
    serialNumber?: string;
    colorFinish?: string;
    securityPasscode?: string;
    specsSummary?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session || (!session.permissions.includes('customers.edit') && session.roleId !== 'ROLE_OWNER' && !session.permissions.includes('jobs.intake'))) {
        return { success: false, error: 'Unauthorized: Permission required to create equipment' };
      }

      if (!payload.customerId) return { success: false, error: 'Customer association is required' };
      if (!payload.equipmentType) return { success: false, error: 'Equipment type is required' };
      if (!payload.brand || !payload.brand.trim()) return { success: false, error: 'Brand is required' };
      if (!payload.modelName || !payload.modelName.trim()) return { success: false, error: 'Model name is required' };

      const client = getClient();
      const deviceId = `DEV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const encryptedPasscode = payload.securityPasscode && payload.securityPasscode.trim() 
        ? encryptSecret(payload.securityPasscode.trim()) 
        : null;

      await client.execute({
        sql: `INSERT INTO devices (id, customer_id, equipment_type, brand, model_name, serial_number, color_finish, encrypted_security_passcode, specs_summary)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          deviceId,
          payload.customerId,
          payload.equipmentType,
          payload.brand.trim(),
          payload.modelName.trim(),
          payload.serialNumber ? payload.serialNumber.trim() : null,
          payload.colorFinish ? payload.colorFinish.trim() : null,
          encryptedPasscode,
          payload.specsSummary ? payload.specsSummary.trim() : null,
        ],
      });

      await logAudit(session.id, 'DEVICE_CREATED', 'devices', deviceId, null, {
        customerId: payload.customerId,
        equipmentType: payload.equipmentType,
        brand: payload.brand,
        modelName: payload.modelName,
        serialNumber: payload.serialNumber,
      });

      return {
        success: true,
        data: {
          id: deviceId,
          customerId: payload.customerId,
          equipmentType: payload.equipmentType,
          brand: payload.brand,
          modelName: payload.modelName,
          serialNumber: payload.serialNumber,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Save Photo to Local Storage Folder (Decoupled from DB Transaction)
  ipcMain.handle('device:savePhoto', async (_event, payload: {
    deviceId: string;
    jobId?: string;
    photoType?: 'INTAKE_CONDITION' | 'DAMAGE_PROOF' | 'COMPLETED_REPAIR';
    base64Data: string; // Base64 dataURL or raw base64
    caption?: string;
  }) => {
    try {
      const { photosDir } = ensureDirectories();
      const now = new Date();
      const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const targetDir = path.join(photosDir, monthFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Strip data:image/png;base64, prefix if present
      const base64Clean = payload.base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');
      
      const fileName = `photo_${payload.deviceId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
      const fullFilePath = path.join(targetDir, fileName);
      const relativeStoragePath = path.join('storage', 'photos', monthFolder, fileName);

      fs.writeFileSync(fullFilePath, buffer);

      const client = getClient();
      const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      await client.execute({
        sql: `INSERT INTO device_photos (id, device_id, job_id, photo_type, file_path, caption)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          photoId,
          payload.deviceId,
          payload.jobId || null,
          payload.photoType || 'INTAKE_CONDITION',
          relativeStoragePath,
          payload.caption || null,
        ],
      });

      return {
        success: true,
        data: {
          photoId,
          filePath: relativeStoragePath,
        },
      };
    } catch (error: unknown) {
      // Photo saving error is returned cleanly without blowing up
      return { success: false, error: (error as Error).message };
    }
  });
}
