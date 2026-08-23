import { ipcMain } from 'electron';
import { getClient, logAudit } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';

export function registerCommunicationIpc(): void {
  // 1. List Templates
  ipcMain.handle('communication:listTemplates', async () => {
    try {
      const client = getClient();
      const res = await client.execute(`SELECT * FROM communication_templates WHERE is_active = 1 ORDER BY name ASC`);
      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 2. List Queued & Sent Messages
  ipcMain.handle('communication:listMessages', async (_event, params?: { status?: string; limit?: number }) => {
    try {
      const client = getClient();
      const condition = params?.status ? `WHERE cm.dispatch_status = '${params.status}'` : '';
      const limit = params?.limit || 50;

      const res = await client.execute(`
        SELECT cm.*, 
               c.full_name as customer_name, c.customer_code,
               sj.job_number,
               ct.name as template_name
        FROM communication_messages cm
        LEFT JOIN customers c ON cm.customer_id = c.id
        LEFT JOIN service_jobs sj ON cm.service_job_id = sj.id
        LEFT JOIN communication_templates ct ON cm.template_key = ct.template_key
        ${condition}
        ORDER BY cm.created_at DESC
        LIMIT ${limit}
      `);

      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 3. Queue WhatsApp Message (Offline-Resilient Asynchronous Model)
  ipcMain.handle('communication:queueMessage', async (_event, payload: {
    customerId: string;
    serviceJobId?: string;
    templateKey: string;
    recipientPhone: string;
    messagePayload: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Format WhatsApp Web / App Deep Link URL
      const cleanPhone = payload.recipientPhone.replace(/[^0-9]/g, '');
      const waPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone.slice(-10)}`;
      const waDeepLink = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(payload.messagePayload)}`;

      await client.execute({
        sql: `INSERT INTO communication_messages (
                id, customer_id, service_job_id, channel, recipient_phone,
                template_key, message_payload, dispatch_status, retry_count
              ) VALUES (?, ?, ?, 'WHATSAPP_API', ?, ?, ?, 'SENT', 0)`,
        args: [
          msgId,
          payload.customerId,
          payload.serviceJobId || null,
          payload.recipientPhone,
          payload.templateKey,
          payload.messagePayload,
        ],
      });

      await logAudit(session.id, 'WHATSAPP_DISPATCH', 'communication_messages', msgId, null, {
        recipient: payload.recipientPhone,
        template: payload.templateKey,
      });

      return {
        success: true,
        data: {
          messageId: msgId,
          dispatchStatus: 'SENT',
          waDeepLink,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 4. Retry Message
  ipcMain.handle('communication:retryMessage', async (_event, params: { messageId: string }) => {
    try {
      const client = getClient();
      await client.execute({
        sql: `UPDATE communication_messages 
              SET dispatch_status = 'SENT', retry_count = retry_count + 1, sent_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [params.messageId],
      });
      return { success: true, data: { status: 'SENT' } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
