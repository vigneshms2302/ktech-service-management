import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

// Master derivation secret (fallback or dynamically sourced from environment / machine key)
const MASTER_SECRET = process.env.KTECH_APP_SECRET || 'ktech-internal-service-mgmt-master-key-2026-secured';

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(MASTER_SECRET, salt, KEY_LENGTH);
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
 * Verifies a password against a stored scrypt hash.
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
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 4) return '';
    const [saltHex, ivHex, authTagHex, ciphertextHex] = parts;
    
    const salt = Buffer.from(saltHex, 'hex');
    const key = deriveKey(salt);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt secret:', error);
    return '[Decryption Failed]';
  }
}
