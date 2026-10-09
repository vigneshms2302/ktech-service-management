import { ipcMain, shell } from 'electron';
import path from 'node:path';
import { getClient, logAudit, createDatabaseBackup, getDatabasePath } from '../db/database.ts';
import { getActiveSession, setActiveSession, type UserSession } from './authIpc.ts';
import { seedDatabase } from '../db/seed.ts';
import { hashPassword } from '../security/crypto.ts';
import { logger, listLogFiles, readRecentLogs, setLogRetentionDays, getLogRetentionDays } from '../utils/logger.ts';
import { getDatabaseDiagnostics, createDiagnosticZipBundle } from '../utils/diagnosticPackager.ts';
import {
  generateSupportChallenge,
  activateSupportSession,
  getSupportSessionStatus,
  terminateSupportSession,
  executeSupportMaintenance,
} from '../security/supportSession.ts';
import { getFirewallRules, addAllowedDomain } from '../security/firewall.ts';
import {
  verifyAndRegisterWorkstation,
  deactivateWorkstation,
  reactivateWorkstation,
  setMaxWorkstationSeats,
} from '../security/workstationLicense.ts';
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

      // 0. Comprehensive Day-Zero Wipe: Clear all transaction tables so workstation is 100% clean
      const tablesToClean = [
        'audit_logs',
        'backups',
        'communication_messages',
        'customer_addresses',
        'data_recovery_jobs',
        'device_photos',
        'inventory_transactions',
        'inventory_items',
        'invoice_items',
        'invoices',
        'job_attachments',
        'job_checklists',
        'job_diagnosis',
        'job_inspections',
        'job_notes',
        'job_parts',
        'job_repair_activities',
        'job_services',
        'job_status_history',
        'job_tests',
        'payments',
        'pc_build_items',
        'pc_builds',
        'product_sale_items',
        'product_sales',
        'products',
        'quotation_approvals',
        'quotation_items',
        'quotations',
        'salvage_parts',
        'salvage_devices',
        'service_jobs',
        'devices',
        'customers',
        'warranties',
        'warranty_jobs',
        'users',
      ];

      for (const tbl of tablesToClean) {
        try {
          await client.execute(`DELETE FROM ${tbl};`);
        } catch {
          // Table might not exist in some migrations
        }
      }

      // 1. Create Master Owner User
      await client.execute({
        sql: `INSERT INTO users (id, username, password_hash, pin_code, full_name, role_id, phone, commission_pct, is_active)
              VALUES (?, ?, ?, ?, ?, 'ROLE_OWNER', ?, 0.0, 1)`,
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
  ipcMain.handle('system:createBackup', async (_event, { backupType = 'MANUAL', targetDir, openFolder = true }: { backupType?: 'MANUAL' | 'AUTO' | 'PRE_RESTORE'; targetDir?: string; openFolder?: boolean } = {}) => {
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

      if (openFolder && result.backupPath) {
        try {
          shell.showItemInFolder(result.backupPath);
        } catch (shellErr) {
          logger.warn('SystemIPC', 'Could not open backup folder in shell', { error: String(shellErr) });
        }
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

  // --- Dynamic Enterprise Logging & Diagnostics Handlers ---

  // Get Live Diagnostics & Health Information
  ipcMain.handle('system:getDiagnosticsInfo', async () => {
    try {
      const dbDiag = await getDatabaseDiagnostics();
      const logFiles = listLogFiles();
      const retentionDays = getLogRetentionDays();

      return {
        success: true,
        data: {
          database: dbDiag,
          logs: {
            retentionDays,
            logFiles,
            totalLogsCount: logFiles.length,
          },
        },
      };
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Failed to retrieve diagnostics info', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Export 7-Day Compressed Diagnostic Zip Bundle
  ipcMain.handle('system:exportDiagnostics', async (_event, payload?: { customOutputDir?: string; openFolder?: boolean }) => {
    try {
      const result = await createDiagnosticZipBundle(payload?.customOutputDir);
      if (result.success && result.archivePath) {
        if (payload?.openFolder !== false) {
          try {
            shell.showItemInFolder(result.archivePath);
          } catch (shellErr) {
            logger.warn('SystemIPC', 'Could not open diagnostics folder in shell', { error: String(shellErr) });
          }
        }
      }
      return result;
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Failed exporting diagnostics bundle', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Read Recent Logs for In-App Live Log Viewer
  ipcMain.handle('system:getRecentLogs', async (_event, options?: { level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'EXCEPTION'; limit?: number; date?: string }) => {
    try {
      const logs = readRecentLogs(options);
      return { success: true, data: logs };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // List all available log files on disk
  ipcMain.handle('system:getLogFiles', async () => {
    try {
      const files = listLogFiles();
      return { success: true, data: files };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Set Log Retention Threshold (in Days)
  ipcMain.handle('system:setLogRetention', async (_event, { days }: { days: number }) => {
    try {
      setLogRetentionDays(days);
      const client = getClient();
      await client.execute({
        sql: `INSERT INTO settings (key, value, updated_at) VALUES ('system.log_retention_days', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;`,
        args: [String(days)],
      });
      return { success: true, data: { retentionDays: days } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --- Consent-Based Cryptographic Remote Support Handlers ---

  // Generate 15-Minute Support Challenge Code
  ipcMain.handle('system:generateSupportChallenge', async () => {
    try {
      const challenge = generateSupportChallenge();
      return { success: true, data: challenge };
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Failed to generate support challenge', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Activate Support Session with Authorization Token
  ipcMain.handle('system:activateSupportSession', async (_event, payload: {
    challengeCode: string;
    responseToken: string;
    operatorName?: string;
  }) => {
    try {
      const result = await activateSupportSession(payload);
      return result;
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Failed to activate support session', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Current Support Session Status
  ipcMain.handle('system:getSupportSessionStatus', async () => {
    try {
      const status = getSupportSessionStatus();
      return { success: true, data: status };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Terminate Elevated Support Session
  ipcMain.handle('system:endSupportSession', async () => {
    try {
      await terminateSupportSession();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Execute Deep Maintenance Action in Support Mode
  ipcMain.handle('system:executeSupportMaintenance', async (_event, payload: {
    action: 'REINDEX' | 'VACUUM' | 'INTEGRITY_FIX' | 'CLEAN_ORPHANS';
  }) => {
    try {
      const result = await executeSupportMaintenance(payload.action);
      return { success: true, data: result };
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Maintenance execution failed', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // --- In-App Network Firewall Handlers ---

  // Get Firewall Rules and Status
  ipcMain.handle('system:getFirewallStatus', async () => {
    try {
      const status = getFirewallRules();
      return { success: true, data: status };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Add Dynamic Allowed Domain
  ipcMain.handle('system:addFirewallDomain', async (_event, { domain }: { domain: string }) => {
    try {
      addAllowedDomain(domain);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --- Workstation Node & Machine Seat Licensing Handlers ---

  // Check Current Workstation License Status & Register Node
  ipcMain.handle('system:getWorkstationLicenseStatus', async () => {
    try {
      const status = await verifyAndRegisterWorkstation();
      return { success: true, data: status };
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Failed to check workstation license status', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Deactivate Workstation Node (Free up a seat)
  ipcMain.handle('system:deactivateWorkstation', async (_event, { machineId }: { machineId: string }) => {
    try {
      const result = await deactivateWorkstation(machineId);
      return result;
    } catch (error: unknown) {
      logger.error('SystemIPC', 'Failed to deactivate workstation', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Reactivate Workstation Node
  ipcMain.handle('system:reactivateWorkstation', async (_event, { machineId }: { machineId: string }) => {
    try {
      const result = await reactivateWorkstation(machineId);
      return result;
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Set Workstation Seat Limit (e.g. from 4 to 8)
  ipcMain.handle('system:setWorkstationSeatLimit', async (_event, { maxSeats }: { maxSeats: number }) => {
    try {
      await setMaxWorkstationSeats(maxSeats);
      return { success: true, data: { maxSeats } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Open and reveal file in Windows File Explorer
  ipcMain.handle('system:showItemInFolder', async (_event, { path: targetPath }: { path: string }) => {
    try {
      if (fs.existsSync(targetPath)) {
        shell.showItemInFolder(targetPath);
        return { success: true };
      } else {
        const dir = path.dirname(targetPath);
        if (fs.existsSync(dir)) {
          await shell.openPath(dir);
          return { success: true };
        }
        return { success: false, error: 'File or directory does not exist' };
      }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Launch file or directory with default OS handler
  ipcMain.handle('system:openPath', async (_event, { path: targetPath }: { path: string }) => {
    try {
      const errMsg = await shell.openPath(targetPath);
      if (errMsg) {
        return { success: false, error: errMsg };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  });
}


