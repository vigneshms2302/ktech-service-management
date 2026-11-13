/**
 * Zero-dependency WhatsApp OTP Dispatcher.
 * Supports:
 *  1. Meta WhatsApp Business Cloud API (Official - 1,000 FREE conversations/month)
 *     Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *  2. Twilio WhatsApp Sandbox (Free development/testing via sandbox join code)
 *  3. WhatsApp Webhook Relay
 *  4. Fallback in local development
 */

export interface WhatsAppOtpPayload {
  toPhone: string;
  recipientName: string;
  shopName: string;
  otp: string;
  expiresInMinutes: number;
}

export interface WhatsAppDispatchResult {
  delivered: boolean;
  provider?: 'META_CLOUD_API' | 'TWILIO_WHATSAPP' | 'WEBHOOK' | 'DEV_CONSOLE';
  error?: string;
  messageId?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) ||
    (process.env.WHATSAPP_WEBHOOK_URL && process.env.WHATSAPP_WEBHOOK_URL.trim())
  );
}

/**
 * Sends a real OTP message to the recipient's WhatsApp.
 */
export async function sendWhatsAppOtp(payload: WhatsAppOtpPayload): Promise<WhatsAppDispatchResult> {
  const cleanPhone = payload.toPhone.replace(/[^0-9]/g, '');
  const last10Digits = cleanPhone.slice(-10);
  // Ensure Indian country code 91 by default if 10 digits
  const recipientE164 = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const messageText = `🔐 *K-Connect Repair Laboratory*\n\nYour shop verification code for *${payload.shopName}* is:\n\n*${payload.otp}*\n\nValid for ${payload.expiresInMinutes} minutes. Do not share this OTP with anyone.\n_Multi-workstation cloud workspace for computer & mobile service labs._`;

  // 1. Meta WhatsApp Business Cloud API (Official - Free 1,000 monthly conversations)
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();

  if (metaPhoneId && metaToken) {
    try {
      const url = `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientE164,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.ok && data.messages) {
        return {
          delivered: true,
          provider: 'META_CLOUD_API',
          messageId: Array.isArray(data.messages) ? (data.messages[0] as any)?.id : undefined,
        };
      }

      const errDetails = (data.error as any)?.message || `Meta Cloud API HTTP ${response.status}`;
      return { delivered: false, provider: 'META_CLOUD_API', error: errDetails };
    } catch (err: unknown) {
      return { delivered: false, provider: 'META_CLOUD_API', error: (err as Error).message };
    }
  }

  // 2. Twilio WhatsApp Sandbox / Production
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = (process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886').trim();

  if (twilioSid && twilioToken) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('From', twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`);
      bodyParams.append('To', `whatsapp:+${recipientE164}`);
      bodyParams.append('Body', messageText);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (response.ok) {
        return { delivered: true, provider: 'TWILIO_WHATSAPP' };
      }
      const errText = await response.text().catch(() => '');
      return { delivered: false, provider: 'TWILIO_WHATSAPP', error: `Twilio HTTP ${response.status}: ${errText}` };
    } catch (err: unknown) {
      return { delivered: false, provider: 'TWILIO_WHATSAPP', error: (err as Error).message };
    }
  }

  // 3. WhatsApp Webhook Relay
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.WHATSAPP_WEBHOOK_TOKEN?.trim()) {
        headers['Authorization'] = `Bearer ${process.env.WHATSAPP_WEBHOOK_TOKEN.trim()}`;
      }
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: recipientE164,
          otp: payload.otp,
          message: messageText,
          shopName: payload.shopName,
          expiresInMinutes: payload.expiresInMinutes,
        }),
      });
      if (response.ok) {
        return { delivered: true, provider: 'WEBHOOK' };
      }
      return { delivered: false, provider: 'WEBHOOK', error: `Webhook HTTP ${response.status}` };
    } catch (err: unknown) {
      return { delivered: false, provider: 'WEBHOOK', error: (err as Error).message };
    }
  }

  // 4. Fallback in development
  console.log(`[WhatsApp OTP Dispatch] OTP ${payload.otp} generated for WhatsApp +${recipientE164} (No WhatsApp provider API key configured in .env)`);
  return { delivered: false, provider: 'DEV_CONSOLE', error: 'No WhatsApp provider API key configured.' };
}
