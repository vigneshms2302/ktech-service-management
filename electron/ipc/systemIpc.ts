import { ipcMain } from 'electron';
import { getClient, logAudit, createDatabaseBackup, getDatabasePath } from '../db/database.ts';
import { getActiveSession, setActiveSession, type UserSession } from './authIpc.ts';
import { seedDatabase } from '../db/seed.ts';
import { hashPassword } from '../security/crypto.ts';
import fs from 'node:fs';

export function registerSystemIpc(): void {
  // Check if First-Time Initial Setup is Completed
  ipcMain.handle('system:isSetupComplete', async () => {
    try {
      const client = getClient();
      const usersRes = await client.execute(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`);
      const userCount = Number((usersRes.rows[0] as unknown as { count: number }).count);
      
      const settingRes = await client.execute(`SELECT value FROM settings WHERE key = 'setup.completed'`);
      const isCompleted = settingRes.rows.length > 0 && (settingRes.rows[0] as Record<string, unknown>).value === '1';

      return {
        success: true,
        data: {
          isComplete: userCount > 0 && isCompleted,
          userCount,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Complete First-Time Setup & Onboarding Wizard
  ipcMain.handle('system:completeSetup', async (_event, payload: {
    owner: {
      fullName: string;
      username: string;
      password: string;
      pinCode: string;
      phone?: string;
      email?: string;
    };
    shop: {
      shopName: string;
      tagline?: string;
      phone: string;
      email?: string;
      address: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstin?: string;
      upiId?: string;
    };
    technicians?: Array<{
      fullName: string;
      username: string;
      password?: string;
      pinCode?: string;
      phone?: string;
      roleId: string;
    }>;
  }) => {
    try {
      const client = getClient();
      const ownerId = 'USR-OWNER-01';
      const ownerPasswordHash = hashPassword(payload.owner.password.trim());
      const ownerPin = payload.owner.pinCode.trim();

      // 1. Create or Update Owner User
      await client.execute({
        sql: `INSERT INTO users (id, username, password_hash, pin_code, full_name, role_id, phone, commission_pct, is_active)
              VALUES (?, ?, ?, ?, ?, 'ROLE_OWNER', ?, 0.0, 1)
              ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                pin_code = excluded.pin_code,
                full_name = excluded.full_name,
                phone = excluded.phone,
                role_id = 'ROLE_OWNER',
                is_active = 1`,
        args: [
          ownerId,
          payload.owner.username.trim().toLowerCase(),
          ownerPasswordHash,
          ownerPin,
          payload.owner.fullName.trim(),
          payload.owner.phone ? payload.owner.phone.trim() : null,
        ],
      });

      // 2. Create any initial staff/technicians if provided
      if (payload.technicians && payload.technicians.length > 0) {
        for (let i = 0; i < payload.technicians.length; i++) {
          const tech = payload.technicians[i];
          if (tech.fullName.trim() && tech.username.trim()) {
            const techId = `USR-STAFF-${Date.now()}-${i + 1}`;
            const techPwd = tech.password && tech.password.trim() ? tech.password.trim() : 'staff123';
            const techPin = tech.pinCode && tech.pinCode.trim() ? tech.pinCode.trim() : `110${i + 1}`;
            await client.execute({
              sql: `INSERT INTO users (id, username, password_hash, pin_code, full_name, role_id, phone, commission_pct, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 1)
                    ON CONFLICT(username) DO NOTHING`,
              args: [
                techId,
                tech.username.trim().toLowerCase(),
                hashPassword(techPwd),
                techPin,
                tech.fullName.trim(),
                tech.roleId || 'ROLE_TECHNICIAN',
                tech.phone ? tech.phone.trim() : null,
              ],
            });
          }
        }
      }

      // 3. Save Shop Profile Settings
      const formattedAddress = [
        payload.shop.address.trim(),
        payload.shop.city ? payload.shop.city.trim() : '',
        payload.shop.state ? payload.shop.state.trim() : '',
        payload.shop.pincode ? payload.shop.pincode.trim() : '',
      ].filter(Boolean).join(', ');

      const shopSettingsList = [
        { key: 'shop.name', value: payload.shop.shopName.trim() },
        { key: 'shop.tagline', value: (payload.shop.tagline || '').trim() },
        { key: 'shop.phone', value: payload.shop.phone.trim() },
        { key: 'shop.email', value: (payload.shop.email || '').trim() },
        { key: 'shop.address', value: formattedAddress },
        { key: 'shop.gstin', value: (payload.shop.gstin || '').trim() },
        { key: 'shop.upi_id', value: (payload.shop.upiId || '').trim() },
        { key: 'setup.completed', value: '1' },
        { key: 'setup.completed_at', value: new Date().toISOString() },
      ];

      for (const s of shopSettingsList) {
        await client.execute({
          sql: `INSERT INTO settings (key, value, category) VALUES (?, ?, 'SHOP')
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          args: [s.key, s.value],
        });
      }

      // 4. Fetch all permissions for Owner Session
      const permResult = await client.execute(`SELECT p.code FROM permissions p`);
      const allPerms = permResult.rows.map((r) => (r as Record<string, unknown>).code as string);

      const ownerSession: UserSession = {
        id: ownerId,
        username: payload.owner.username.trim().toLowerCase(),
        fullName: payload.owner.fullName.trim(),
        roleId: 'ROLE_OWNER',
        roleName: 'Owner / Administrator',
        phone: payload.owner.phone ? payload.owner.phone.trim() : null,
        commissionPct: 0.0,
        permissions: allPerms,
      };

      setActiveSession(ownerSession);
      await logAudit(ownerSession.id, 'INITIAL_SETUP_COMPLETED', 'system', 'setup', null, { shopName: payload.shop.shopName });

      return { success: true, data: { user: ownerSession } };
    } catch (error: unknown) {
      console.error('completeSetup error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Factory Reset / Clean Database Wiping
  ipcMain.handle('system:factoryReset', async () => {
    try {
      const client = getClient();
      
      const tablesToWipe = [
        'audit_logs',
        'backup_logs',
        'backups',
        'communication_messages',
        'communication_templates',
        'custom_pc_parts',
        'custom_pc_builds',
        'data_recovery_triage',
        'data_recovery_jobs',
        'device_photos',
        'device_passcodes',
        'devices',
        'inventory_adjustments',
        'inventory_items',
        'inventory_suppliers',
        'inventory_categories',
        'invoice_items',
        'invoice_payments',
        'invoices',
        'job_activities',
        'job_attachments',
        'job_checklists',
        'job_diagnostics',
        'job_inspections',
        'job_parts_used',
        'job_repair_plans',
        'job_status_history',
        'job_test_results',
        'service_jobs',
        'payment_transactions',
        'payments',
        'quotation_approvals',
        'quotation_items',
        'quotations',
        'refurbished_sales',
        'refurbished_products',
        'salvage_harvest_log',
        'salvage_parts',
        'salvage_devices',
        'customer_addresses',
        'customers',
        'warranties',
        'warranty_claims',
        'user_sessions',
        'users',
        'role_permissions',
        'permissions',
        'roles',
        'settings',
      ];

      for (const tbl of tablesToWipe) {
        try {
          await client.execute(`DELETE FROM ${tbl};`);
        } catch {
          // Table might not exist, proceed
        }
      }

      // Re-seed essential base configuration
      await seedDatabase();

      // Clear active session
      setActiveSession(null);

      return { success: true };
    } catch (error: unknown) {
      console.error('factoryReset error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

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
