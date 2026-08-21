import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, encryptSecret, decryptSecret } from '../electron/security/crypto.ts';

describe('Security & Cryptography Subsystem', () => {
  it('should hash and verify passwords with unique salt per entry', () => {
    const password = 'KTechSecretPassword!2026';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    // Hashes should differ due to random salts
    expect(hash1).not.toBe(hash2);

    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword(password, hash2)).toBe(true);
    expect(verifyPassword('WrongPassword', hash1)).toBe(false);
  });

  it('should encrypt and decrypt device passcodes using AES-256-GCM', () => {
    const rawPasscode = 'Cust#Win11Pass99!';
    const encrypted = encryptSecret(rawPasscode);

    expect(encrypted).not.toBe(rawPasscode);
    expect(encrypted.split(':').length).toBe(4); // salt:iv:authTag:ciphertext

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawPasscode);
  });

  it('should safely handle empty or corrupt encrypted payloads', () => {
    expect(decryptSecret('')).toBe('');
    expect(decryptSecret('corrupt:payload')).toBe('');
  });
});
