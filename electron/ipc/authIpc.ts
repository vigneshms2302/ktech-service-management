import { ipcMain } from 'electron';
import { getClient, logAudit } from '../db/database.ts';
import { verifyPassword } from '../security/crypto.ts';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  phone?: string | null;
  commissionPct: number;
  permissions: string[];
}

let activeSession: UserSession | null = null;

export function getActiveSession(): UserSession | null {
  return activeSession;
}

export function registerAuthIpc(): void {
  // Login with Username & Password
  ipcMain.handle('auth:login', async (_event, { username, password }) => {
    try {
      const client = getClient();
      const result = await client.execute({
        sql: `SELECT u.*, r.name as role_name 
              FROM users u 
              JOIN roles r ON u.role_id = r.id 
              WHERE u.username = ? AND u.is_active = 1`,
        args: [username],
      });

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid username or inactive account' };
      }

      const userRow = result.rows[0] as Record<string, unknown>;
      const passwordHash = userRow.password_hash as string;

      if (!verifyPassword(password, passwordHash)) {
        return { success: false, error: 'Invalid password' };
      }

      // Fetch user's permissions
      const permResult = await client.execute({
        sql: `SELECT p.code 
              FROM role_permissions rp 
              JOIN permissions p ON rp.permission_id = p.id 
              WHERE rp.role_id = ?`,
        args: [userRow.role_id as string],
      });

      const permissions = permResult.rows.map((r) => (r as Record<string, unknown>).code as string);

      activeSession = {
        id: userRow.id as string,
        username: userRow.username as string,
        fullName: userRow.full_name as string,
        roleId: userRow.role_id as string,
        roleName: userRow.role_name as string,
        phone: userRow.phone as string | null,
        commissionPct: Number(userRow.commission_pct || 0),
        permissions,
      };

      await logAudit(activeSession.id, 'LOGIN', 'users', activeSession.id, null, { method: 'PASSWORD' });

      return { success: true, data: activeSession };
    } catch (error: unknown) {
      console.error('Login error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Login / Switch with PIN Code
  ipcMain.handle('auth:pinLogin', async (_event, { pinCode }) => {
    try {
      const client = getClient();
      const result = await client.execute({
        sql: `SELECT u.*, r.name as role_name 
              FROM users u 
              JOIN roles r ON u.role_id = r.id 
              WHERE u.pin_code = ? AND u.is_active = 1`,
        args: [pinCode],
      });

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid PIN code' };
      }

      const userRow = result.rows[0] as Record<string, unknown>;
      const permResult = await client.execute({
        sql: `SELECT p.code 
              FROM role_permissions rp 
              JOIN permissions p ON rp.permission_id = p.id 
              WHERE rp.role_id = ?`,
        args: [userRow.role_id as string],
      });

      const permissions = permResult.rows.map((r) => (r as Record<string, unknown>).code as string);

      activeSession = {
        id: userRow.id as string,
        username: userRow.username as string,
        fullName: userRow.full_name as string,
        roleId: userRow.role_id as string,
        roleName: userRow.role_name as string,
        phone: userRow.phone as string | null,
        commissionPct: Number(userRow.commission_pct || 0),
        permissions,
      };

      await logAudit(activeSession.id, 'LOGIN', 'users', activeSession.id, null, { method: 'PIN' });

      return { success: true, data: activeSession };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get Current Active User
  ipcMain.handle('auth:getCurrentUser', async () => {
    return { success: true, data: activeSession };
  });

  // Logout
  ipcMain.handle('auth:logout', async () => {
    if (activeSession) {
      await logAudit(activeSession.id, 'LOGOUT', 'users', activeSession.id);
    }
    activeSession = null;
    return { success: true };
  });

  // List all users (for fast profile switching at counter)
  ipcMain.handle('auth:listUsers', async () => {
    try {
      const client = getClient();
      const result = await client.execute(`
        SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.is_active = 1
        ORDER BY u.full_name ASC
      `);

      return {
        success: true,
        data: result.rows.map((row) => ({
          id: (row as Record<string, unknown>).id,
          username: (row as Record<string, unknown>).username,
          fullName: (row as Record<string, unknown>).full_name,
          roleId: (row as Record<string, unknown>).role_id,
          roleName: (row as Record<string, unknown>).role_name,
        })),
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
