import { ipcMain } from 'electron';
import { getClient, logAudit } from '../db/database.ts';
import { verifyPassword, hashPassword } from '../security/crypto.ts';

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

  // List all users (for fast profile switching and user administration)
  ipcMain.handle('auth:listUsers', async () => {
    try {
      const client = getClient();
      const result = await client.execute(`
        SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active, u.pin_code, u.phone
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        ORDER BY u.created_at ASC
      `);

      return {
        success: true,
        data: result.rows.map((row) => ({
          id: (row as Record<string, unknown>).id,
          username: (row as Record<string, unknown>).username,
          fullName: (row as Record<string, unknown>).full_name,
          roleId: (row as Record<string, unknown>).role_id,
          roleName: (row as Record<string, unknown>).role_name,
          isActive: Boolean((row as Record<string, unknown>).is_active),
          pinCode: (row as Record<string, unknown>).pin_code,
          phone: (row as Record<string, unknown>).phone,
        })),
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create New User Account
  ipcMain.handle('auth:createUser', async (_event, payload: {
    username: string;
    fullName: string;
    roleId: string;
    password?: string;
    pinCode?: string;
    phone?: string;
  }) => {
    try {
      const client = getClient();
      const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const pwd = payload.password && payload.password.trim() ? payload.password.trim() : 'kconnect123';
      const passwordHash = hashPassword(pwd);
      const pin = payload.pinCode && payload.pinCode.trim() ? payload.pinCode.trim() : '1234';

      await client.execute({
        sql: `INSERT INTO users (id, username, full_name, role_id, password_hash, pin_code, phone, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          userId,
          payload.username.trim().toLowerCase(),
          payload.fullName.trim(),
          payload.roleId || 'ROLE_TECHNICIAN',
          passwordHash,
          pin,
          payload.phone ? payload.phone.trim() : null,
        ],
      });

      return { success: true, data: { id: userId, username: payload.username, fullName: payload.fullName, roleId: payload.roleId } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Update User Account
  ipcMain.handle('auth:updateUser', async (_event, payload: {
    id: string;
    fullName?: string;
    roleId?: string;
    pinCode?: string;
    password?: string;
    phone?: string;
  }) => {
    try {
      const client = getClient();
      const updates: string[] = [];
      const args: (string | number | null)[] = [];

      if (payload.fullName) {
        updates.push('full_name = ?');
        args.push(payload.fullName.trim());
      }
      if (payload.roleId) {
        updates.push('role_id = ?');
        args.push(payload.roleId);
      }
      if (payload.pinCode) {
        updates.push('pin_code = ?');
        args.push(payload.pinCode.trim());
      }
      if (payload.phone !== undefined) {
        updates.push('phone = ?');
        args.push(payload.phone ? payload.phone.trim() : null);
      }
      if (payload.password && payload.password.trim()) {
        updates.push('password_hash = ?');
        args.push(hashPassword(payload.password.trim()));
      }

      if (updates.length > 0) {
        args.push(payload.id);
        await client.execute({
          sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          args,
        });
      }

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Toggle User Active Status
  ipcMain.handle('auth:toggleUserStatus', async (_event, { id, isActive }: { id: string; isActive: boolean }) => {
    try {
      const client = getClient();
      await client.execute({
        sql: `UPDATE users SET is_active = ? WHERE id = ?`,
        args: [isActive ? 1 : 0, id],
      });
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
