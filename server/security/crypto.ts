import crypto from 'node:crypto';
import os from 'node:os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function getDynamicEntropy(): string {
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 16) {
    return process.env.ENCRYPTION_KEY;
  }
  if (process.env.PASSCODE_ENCRYPTION_KEY && process.env.PASSCODE_ENCRYPTION_KEY.length >= 16) {
    return process.env.PASSCODE_ENCRYPTION_KEY;
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  if (process.env.KTECH_APP_SECRET && process.env.KTECH_APP_SECRET.length >= 16) {
    return process.env.KTECH_APP_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[Security Warning] No persistent ENCRYPTION_KEY or JWT_SECRET found in production environment! Using fallback encryption seed. Please set ENCRYPTION_KEY in Vercel settings.'
    );
    return 'ktech-saas-cloud-fallback-master-entropy-key-2026';
  }
  try {
    return `${os.hostname()}|ktech-saas-cloud-encryption-seed-2026`;
  } catch {
    return 'ktech-saas-cloud-fallback-master-entropy-key-2026';
  }
}

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(getDynamicEntropy(), salt, KEY_LENGTH);
}

/**
 * Encrypts sensitive device passcodes / credentials using AES-256-GCM.
 * Produces a format: salt:iv:authTag:ciphertext
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret string.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 4) return '';
    const [saltHex, ivHex, authTagHex, ciphertextHex] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}
