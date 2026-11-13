import crypto from 'node:crypto';
import type { Request } from 'express';

/**
 * Generates a readable alphanumeric temporary password omitting visually ambiguous characters (0/O, 1/I/l).
 */
export function generateReadableTempPassword(length = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

/**
 * Computes a deterministic SHA-256 hex digest for reset tokens and OTP codes.
 */
export function hashResetSecret(value: string): string {
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

/**
 * Compares two hex digests in constant time without leaking length timing differences on valid digests.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Normalizes a phone number to its trailing 10 digits for tolerant country-code matching.
 */
export function normalizePhoneDigits(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Resolves the canonical frontend origin URL for reset links in emails and support queues.
 */
export function resolvePublicAppUrl(req?: Pick<Request, 'headers' | 'protocol' | 'get'>): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (req) {
    const originHeader = typeof req.headers?.origin === 'string' ? req.headers.origin.trim() : '';
    if (originHeader && /^https?:\/\//i.test(originHeader)) {
      return originHeader.replace(/\/+$/, '');
    }
    const hostHeader = req.get?.('host')?.trim();
    if (hostHeader) {
      const protoHeader = typeof req.headers?.['x-forwarded-proto'] === 'string'
        ? req.headers['x-forwarded-proto'].split(',')[0].trim()
        : (req.protocol || 'https');
      return `${protoHeader}://${hostHeader}`.replace(/\/+$/, '');
    }
  }
  return 'https://ktech-service-management.vercel.app';
}

/**
 * Constructs the frontend password reset deep link URL for an account type.
 */
export function buildResetUrl(baseUrl: string, token: string, accountType: 'SHOP_USER' | 'SUPER_ADMIN'): string {
  const params = new URLSearchParams({ token });
  if (accountType === 'SUPER_ADMIN') {
    params.set('mode', 'superadmin');
  }
  return `${baseUrl.replace(/\/+$/, '')}/reset-password?${params.toString()}`;
}

