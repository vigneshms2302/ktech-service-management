import { ipcMain } from 'electron';
import { getClient, logAudit, createDatabaseBackup, getDatabasePath } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';
import fs from 'node:fs';

export function registerSystemIpc(): void {
  // Get System & Database Health
  ipcMain.handle('system:getHealth', async () => {
    try {
      const client = getClient();
      const dbPath = getDatabasePath();
      
      // Count tables in SQLite master
      const tablesResult = await client.execute(`
        SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
      `);
      const tableCount = Number((tablesResult.rows[0] as unknown as { table_count: number }).table_count);

      // Count users, jobs, customers, audit logs
      const usersRes = await client.execute('SELECT COUNT(*) as count FROM users;');
      const jobsRes = await client.execute('SELECT COUNT(*) as count FROM service_jobs;');
      const customersRes = await client.execute('SELECT COUNT(*) as count FROM customers;');
      const auditRes = await client.execute('SELECT COUNT(*) as count FROM audit_logs;');
      const backupsRes = await client.execute('SELECT COUNT(*) as count FROM backups;');

      const dbFileExists = fs.existsSync(dbPath);
      const dbFileSize = dbFileExists ? fs.statSync(dbPath).size : 0;

      return {
        success: true,
        data: {
          databaseStatus: 'HEALTHY',
          databasePath: dbPath,
          databaseSizeBytes: dbFileSize,
          tableCount,
          expectedTableCount: 45,
          userCount: Number((usersRes.rows[0] as unknown as { count: number }).count),
          jobCount: Number((jobsRes.rows[0] as unknown as { count: number }).count),
          customerCount: Number((customersRes.rows[0] as unknown as { count: number }).count),
          auditLogCount: Number((auditRes.rows[0] as unknown as { count: number }).count),
          backupCount: Number((backupsRes.rows[0] as unknown as { count: number }).count),
          appVersion: '1.0.0',
          electronVersion: process.versions.electron || '31.7.7',
          nodeVersion: process.versions.node,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Query Recent Audit Logs
  ipcMain.handle('system:getAuditLogs', async (_event, { limit = 50 }) => {
    try {
      const client = getClient();
      const result = await client.execute({
        sql: `SELECT a.*, u.full_name as user_name, u.username 
              FROM audit_logs a 
              LEFT JOIN users u ON a.user_id = u.id 
              ORDER BY a.created_at DESC 
              LIMIT ?`,
        args: [limit],
      });

      return {
        success: true,
        data: result.rows.map((row) => ({
          id: (row as Record<string, unknown>).id,
          userId: (row as Record<string, unknown>).user_id,
          userName: (row as Record<string, unknown>).user_name || 'System',
          username: (row as Record<string, unknown>).username,
          action: (row as Record<string, unknown>).action,
          entityType: (row as Record<string, unknown>).entity_type,
          entityId: (row as Record<string, unknown>).entity_id,
          beforeState: (row as Record<string, unknown>).before_state,
          afterState: (row as Record<string, unknown>).after_state,
          ipAddress: (row as Record<string, unknown>).ip_address,
          createdAt: (row as Record<string, unknown>).created_at,
        })),
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create Standalone Database Backup
  ipcMain.handle('system:createBackup', async (_event, { backupType = 'MANUAL', targetDir }) => {
    try {
      const session = getActiveSession();
      const result = await createDatabaseBackup(backupType, targetDir);

      if (session) {
        await logAudit(session.id, 'BACKUP_CREATED', 'backups', result.backupId, null, {
          backupPath: result.backupPath,
          sizeBytes: result.fileSizeBytes,
          type: backupType,
        });
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Shop & System Settings
  ipcMain.handle('system:getSettings', async () => {
    try {
      const client = getClient();
      const result = await client.execute('SELECT * FROM settings ORDER BY category, key;');
      const settingsMap: Record<string, string> = {};
      result.rows.forEach((row) => {
        const r = row as Record<string, unknown>;
        settingsMap[r.key as string] = r.value as string;
      });

      return { success: true, data: settingsMap };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Update a Setting
  ipcMain.handle('system:updateSetting', async (_event, { key, value }) => {
    try {
      const session = getActiveSession();
      if (!session || !session.permissions.includes('settings.edit')) {
        return { success: false, error: 'Unauthorized: Permission settings.edit required' };
      }

      const client = getClient();
      const prevResult = await client.execute({
        sql: 'SELECT value FROM settings WHERE key = ?',
        args: [key],
      });

      const beforeValue = prevResult.rows.length > 0 ? (prevResult.rows[0] as Record<string, unknown>).value : null;

      await client.execute({
        sql: `INSERT INTO settings (key, value, updated_at) 
              VALUES (?, ?, CURRENT_TIMESTAMP) 
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        args: [key, value],
      });

      await logAudit(session.id, 'UPDATE_SETTING', 'settings', key, { value: beforeValue }, { value });

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
