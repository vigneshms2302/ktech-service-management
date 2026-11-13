/**
 * Zero-dependency transactional email dispatcher for password resets.
 * Supports Resend HTTP API (RESEND_API_KEY) or a custom webhook relay (RESET_EMAIL_WEBHOOK_URL).
 */

export interface PasswordResetEmailPayload {
  to: string;
  recipientName: string;
  username: string;
  shopName?: string;
  shopSlug?: string;
  otp: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface EmailDispatchResult {
  delivered: boolean;
  provider?: 'RESEND' | 'WEBHOOK';
  error?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Masks an email address safely for public status hints (e.g. s***@ktech.com).
 */
export function maskEmailAddress(email?: string | null): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.trim().split('@');
  if (!local || !domain) return null;
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}${'*'.repeat(Math.max(2, local.length - prefix.length))}@${domain}`;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) ||
    (process.env.RESET_EMAIL_WEBHOOK_URL && process.env.RESET_EMAIL_WEBHOOK_URL.trim())
  );
}

/**
 * Sends a real password reset email when RESEND_API_KEY or RESET_EMAIL_WEBHOOK_URL is configured.
 * Fails gracefully so callers fall back cleanly without crashing.
 */
export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<EmailDispatchResult> {
  const fromEmail = (process.env.RESEND_FROM_EMAIL || 'K-Connect Repair Laboratory <noreply@kconnect.cloud>').trim();
  const safeName = escapeHtml(payload.recipientName);
  const safeUsername = escapeHtml(payload.username);
  const safeShopInfo = payload.shopSlug
    ? `${escapeHtml(payload.shopName || payload.shopSlug)} (Shop ID: @${escapeHtml(payload.shopSlug)})`
    : 'K-Connect Super-Admin';
  const safeUrl = escapeHtml(payload.resetUrl);
  const safeOtp = escapeHtml(payload.otp);

  const subject = `K-Connect Password Reset Code: ${payload.otp}`;
  const textBody = [
    `Hello ${payload.recipientName},`,
    '',
    `A password reset was requested for your K-Connect Repair Laboratory account:`,
    `Workspace: ${payload.shopSlug ? `${payload.shopName || payload.shopSlug} (@${payload.shopSlug})` : 'Super-Admin'}`,
    `Username: @${payload.username}`,
    `One-Time Reset Code (OTP): ${payload.otp}`,
    `Direct Reset Link: ${payload.resetUrl}`,
    '',
    `This code expires in ${payload.expiresInMinutes} minutes. If you did not request this, you can safely ignore this message.`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#111827;color:#f3f4f6;border-radius:14px;border:1px solid #374151;">
      <div style="font-size:18px;font-weight:800;color:#10a37f;margin-bottom:8px;">K-Connect Repair Laboratory</div>
      <h2 style="font-size:20px;margin:0 0 12px;color:#ffffff;">Reset Your Account Password</h2>
      <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        Hello ${safeName}, we received a request to reset the password for <strong>${safeShopInfo}</strong> (username: <strong>@${safeUsername}</strong>).
      </p>
      <div style="background:#1f2937;border:1px solid #374151;border-radius:10px;padding:16px;text-align:center;margin-bottom:18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;margin-bottom:6px;">6-Digit Verification Code</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:6px;color:#34d399;font-family:monospace;">${safeOtp}</div>
      </div>
      <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;background:#10a37f;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;font-size:14px;">
        Reset Password Now
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:18px 0 0;line-height:1.5;">
        Valid for ${payload.expiresInMinutes} minutes. Or paste this link into your browser:<br />
        <span style="color:#6ee7b7;word-break:break-all;">${safeUrl}</span>
      </p>
    </div>
  `;

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [payload.to],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });
      if (response.ok) {
        return { delivered: true, provider: 'RESEND' };
      }
      const errBody = await response.text().catch(() => '');
      return { delivered: false, provider: 'RESEND', error: `Resend HTTP ${response.status}: ${errBody}` };
    } catch (err: unknown) {
      return { delivered: false, provider: 'RESEND', error: (err as Error).message };
    }
  }

  const webhookUrl = process.env.RESET_EMAIL_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.RESET_EMAIL_WEBHOOK_TOKEN?.trim()) {
        headers['Authorization'] = `Bearer ${process.env.RESET_EMAIL_WEBHOOK_TOKEN.trim()}`;
      }
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          subject,
          text: textBody,
          html: htmlBody,
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

  return { delivered: false, error: 'Email delivery provider is not configured.' };
}

export interface RegistrationVerificationEmailPayload {
  to: string;
  recipientName: string;
  shopName: string;
  otp: string;
  expiresInMinutes: number;
}

/**
 * Sends a shop registration verification email with a 6-digit confirmation code.
 */
export async function sendRegistrationVerificationEmail(payload: RegistrationVerificationEmailPayload): Promise<EmailDispatchResult> {
  const fromEmail = (process.env.RESEND_FROM_EMAIL || 'K-Connect Repair Laboratory <noreply@kconnect.cloud>').trim();
  const safeName = escapeHtml(payload.recipientName);
  const safeShop = escapeHtml(payload.shopName);
  const safeOtp = escapeHtml(payload.otp);

  const subject = `Confirm your email for ${payload.shopName}: ${payload.otp}`;
  const textBody = [
    `Hello ${payload.recipientName},`,
    '',
    `Thank you for registering your shop "${payload.shopName}" with K-Connect Repair Laboratory!`,
    '',
    `Your Email Confirmation Code is: ${payload.otp}`,
    '',
    `This code will expire in ${payload.expiresInMinutes} minutes. Enter this code on the registration page to verify your email address and activate your 14-day free trial.`,
    '',
    `If you did not request this registration, you can safely ignore this message.`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#111827;color:#f3f4f6;border-radius:14px;border:1px solid #374151;">
      <div style="font-size:18px;font-weight:800;color:#10a37f;margin-bottom:8px;">K-Connect Repair Laboratory</div>
      <h2 style="font-size:20px;margin:0 0 12px;color:#ffffff;">Confirm Your Email Address</h2>
      <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        Hello ${safeName}, please use the code below to confirm your email and activate your 14-day free trial for <strong>${safeShop}</strong>.
      </p>
      <div style="background:#1f2937;border:1px solid #374151;border-radius:10px;padding:16px;text-align:center;margin-bottom:18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;margin-bottom:6px;">Email Confirmation Code</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:6px;color:#34d399;font-family:monospace;">${safeOtp}</div>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin:18px 0 0;line-height:1.5;">
        Valid for ${payload.expiresInMinutes} minutes. If you did not initiate this registration, you can safely ignore this email.
      </p>
    </div>
  `;

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [payload.to],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });
      if (response.ok) {
        return { delivered: true, provider: 'RESEND' };
      }
      const errBody = await response.text().catch(() => '');
      return { delivered: false, provider: 'RESEND', error: `Resend HTTP ${response.status}: ${errBody}` };
    } catch (err: unknown) {
      return { delivered: false, provider: 'RESEND', error: (err as Error).message };
    }
  }

  const webhookUrl = process.env.RESET_EMAIL_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.RESET_EMAIL_WEBHOOK_TOKEN?.trim()) {
        headers['Authorization'] = `Bearer ${process.env.RESET_EMAIL_WEBHOOK_TOKEN.trim()}`;
      }
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          subject,
          text: textBody,
          html: htmlBody,
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

  return { delivered: false, error: 'Email delivery provider is not configured.' };
}
