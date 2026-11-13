/**
 * Zero-dependency SMS & WhatsApp OTP Gateway Dispatcher.
 * Supports:
 *  1. Fast2SMS (India Quick DLT OTP route - FAST2SMS_API_KEY)
 *  2. Twilio SMS / WhatsApp (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
 *  3. Custom Webhook Relay (SMS_GATEWAY_WEBHOOK_URL)
 *  4. Fallback safe logger in local development
 */

export interface SmsDispatchPayload {
  toPhone: string;
  recipientName: string;
  shopName: string;
  otp: string;
  expiresInMinutes: number;
}

export interface SmsDispatchResult {
  delivered: boolean;
  provider?: 'FAST2SMS' | 'TWILIO' | 'WEBHOOK' | 'DEV_CONSOLE';
  error?: string;
}

export function isSmsDeliveryConfigured(): boolean {
  return Boolean(
    (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim()) ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) ||
    (process.env.SMS_GATEWAY_WEBHOOK_URL && process.env.SMS_GATEWAY_WEBHOOK_URL.trim())
  );
}

/**
 * Dispatches a real SMS / WhatsApp OTP to the user's mobile number.
 */
export async function sendRegistrationSmsOtp(payload: SmsDispatchPayload): Promise<SmsDispatchResult> {
  const cleanPhone = payload.toPhone.replace(/[^0-9]/g, '');
  const last10Digits = cleanPhone.slice(-10);
  const messageText = `Your K-Connect verification code for ${payload.shopName} is ${payload.otp}. Valid for ${payload.expiresInMinutes} minutes. Do not share this OTP with anyone.`;

  // 1. Fast2SMS Integration (Instant Indian SMS Gateway)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY?.trim();
  if (fast2SmsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: payload.otp,
          numbers: last10Digits,
        }),
      });

      const resData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.ok && resData.return === true) {
        return { delivered: true, provider: 'FAST2SMS' };
      }
      return {
        delivered: false,
        provider: 'FAST2SMS',
        error: String(resData.message || `Fast2SMS HTTP ${response.status}`),
      };
    } catch (err: unknown) {
      return { delivered: false, provider: 'FAST2SMS', error: (err as Error).message };
    }
  }

  // 2. Twilio Integration (Global SMS / WhatsApp)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('From', twilioFrom);
      bodyParams.append('To', cleanPhone.startsWith('+') ? cleanPhone : `+91${last10Digits}`);
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
        return { delivered: true, provider: 'TWILIO' };
      }
      const errText = await response.text().catch(() => '');
      return { delivered: false, provider: 'TWILIO', error: `Twilio HTTP ${response.status}: ${errText}` };
    } catch (err: unknown) {
      return { delivered: false, provider: 'TWILIO', error: (err as Error).message };
    }
  }

  // 3. Webhook SMS Gateway Relay
  const webhookUrl = process.env.SMS_GATEWAY_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.SMS_GATEWAY_WEBHOOK_TOKEN?.trim()) {
        headers['Authorization'] = `Bearer ${process.env.SMS_GATEWAY_WEBHOOK_TOKEN.trim()}`;
      }
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: last10Digits,
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
  console.log(`[SMS OTP Dispatch] OTP ${payload.otp} generated for ${last10Digits} (No SMS provider API key configured)`);
  return { delivered: false, provider: 'DEV_CONSOLE', error: 'No SMS gateway provider configured.' };
}

