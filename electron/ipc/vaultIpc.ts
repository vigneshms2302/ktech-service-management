import { ipcMain } from 'electron';
import { getClient, logAudit } from '../db/database.ts';
import { decryptSecret } from '../security/crypto.ts';
import { getActiveSession } from './authIpc.ts';

export function registerVaultIpc(): void {
  // Unlock Encrypted Device Security Passcode
  ipcMain.handle('vault:unlockPasscode', async (_event, { deviceId }) => {
    try {
      const session = getActiveSession();
      if (!session) {
        return { success: false, error: 'Authentication required' };
      }

      // Check if role has credentials.view permission
      if (!session.permissions.includes('credentials.view')) {
        return { success: false, error: 'Access Denied: Insufficient permissions to view security passcodes' };
      }

      const client = getClient();
      const result = await client.execute({
        sql: `SELECT id, brand, model_name, encrypted_security_passcode 
              FROM devices 
              WHERE id = ?`,
        args: [deviceId],
      });

      if (result.rows.length === 0) {
        return { success: false, error: 'Device record not found' };
      }

      const deviceRow = result.rows[0] as Record<string, unknown>;
      const encryptedPayload = deviceRow.encrypted_security_passcode as string | null;

      if (!encryptedPayload) {
        return { success: true, data: { passcode: 'None Configured' } };
      }

      const decrypted = decryptSecret(encryptedPayload);

      // Log audit access
      await logAudit(session.id, 'PASSCODE_ACCESSED', 'devices', deviceId, null, {
        deviceBrand: deviceRow.brand,
        deviceModel: deviceRow.model_name,
        accessedBy: session.fullName,
      });

      return { success: true, data: { passcode: decrypted } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
