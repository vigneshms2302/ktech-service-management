import crypto from 'node:crypto';
import os from 'node:os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Dynamically computes a unique hardware-bound machine seed.
 * Combines hostname, CPU model, platform, network MACs, and user info.
 * This guarantees no two machines share the exact same encryption key derivations.
 */
function getDynamicHardwareFingerprint(): string {
  try {
    const networkInterfaces = os.networkInterfaces();
    const macAddresses: string[] = [];
    for (const name of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[name];
      if (iface) {
        for (const net of iface) {
          if (net.mac && net.mac !== '00:00:00:00:00:00') {
            macAddresses.push(net.mac);
          }
        }
      }
    }
    const macFingerprint = macAddresses.sort().join(';');
    const rawFingerprint = `${os.hostname()}|${os.platform()}|${os.arch()}|${os.cpus()[0]?.model || ''}|${macFingerprint}`;
    return crypto.createHash('sha256').update(rawFingerprint).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(`${os.hostname()}-ktech-dynamic-entropy`).digest('hex');
  }
}

/**
 * Derives a cryptographic key using scrypt from machine entropy and salt.
 */
function deriveKey(salt: Buffer): Buffer {
  const dynamicEntropy = process.env.KTECH_APP_SECRET || getDynamicHardwareFingerprint();
  return crypto.scryptSync(dynamicEntropy, salt, KEY_LENGTH);
}

/**
 * Hashes a plaintext password using scrypt with a unique cryptographically random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verifies a password against a stored scrypt hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');
    const computedHash = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hash, computedHash);
  } catch {
    return false;
  }
}

/**
 * Encrypts sensitive device passcodes / credentials using AES-256-GCM.
 * Output format: salt:iv:authTag:ciphertext
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret string.
 * Supports fallback to legacy master secret if machine fingerprint changed.
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

    // Attempt primary dynamic key derivation
    try {
      const key = deriveKey(salt);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Graceful fallback to legacy key if salt was generated on older version
      const legacySecret = 'ktech-internal-service-mgmt-master-key-2026-secured';
      const legacyKey = crypto.scryptSync(legacySecret, salt, KEY_LENGTH);
      const legacyDecipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv);
      legacyDecipher.setAuthTag(authTag);
      let legacyDecrypted = legacyDecipher.update(ciphertextHex, 'hex', 'utf8');
      legacyDecrypted += legacyDecipher.final('utf8');
      return legacyDecrypted;
    }
  } catch {
    return '[Decryption Failed]';
  }
}

/**
 * Generates a cryptographically strong random token / API secret.
 */
export function generateSecureRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a short numeric / alphanumeric OTP for 2FA or device intake pin.
 */
export function generateSecureOtp(length = 6): string {
  const chars = '0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
