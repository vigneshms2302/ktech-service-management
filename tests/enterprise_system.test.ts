import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import {
  logger,
  initializeLogger,
  listLogFiles,
  readRecentLogs,
  setLogRetentionDays,
  getLogRetentionDays,
} from '../electron/utils/logger.ts';
import { createDiagnosticZipBundle } from '../electron/utils/diagnosticPackager.ts';
import {
  generateSupportChallenge,
  computeExpectedSupportToken,
  activateSupportSession,
  getSupportSessionStatus,
  terminateSupportSession,
} from '../electron/security/supportSession.ts';
import { isUrlAllowed, addAllowedDomain } from '../electron/security/firewall.ts';
import {
  verifyAndRegisterWorkstation,
  deactivateWorkstation,
  reactivateWorkstation,
  setMaxWorkstationSeats,
  getMaxWorkstationSeats,
  getCurrentMachineId,
} from '../electron/security/workstationLicense.ts';
import { initializeSchema } from '../electron/db/database.ts';

describe('Enterprise Subsystems: Logging, Diagnostics, Remote Support & Firewall', () => {
  beforeAll(async () => {
    await initializeSchema();
    initializeLogger();
  });

  describe('Dynamic Logging & PII Redaction', () => {
    it('should log structured events and redact sensitive passwords/tokens', () => {
      logger.info('Test/Auth', 'User logged in successfully with password="SuperSecretPassword123!"');
      logger.warn('Test/Payment', 'Credit card transaction processed for 4532-1234-5678-9012');
      logger.error('Test/DB', 'Database connection timeout', new Error('Simulated socket error'));

      const recentLogs = readRecentLogs({ limit: 20 });
      expect(recentLogs.length).toBeGreaterThan(0);

      // Verify PII redaction
      const logContent = recentLogs.join('\n');
      expect(logContent).not.toContain('SuperSecretPassword123!');
      expect(logContent).toContain('[REDACTED]');
    });

    it('should support dynamic log retention days', () => {
      setLogRetentionDays(14);
      expect(getLogRetentionDays()).toBe(14);
      setLogRetentionDays(7);
      expect(getLogRetentionDays()).toBe(7);
    });

    it('should list active daily log files', () => {
      const files = listLogFiles();
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => /ktech-\d{4}-\d{2}-\d{2}\.log/.test(f.fileName))).toBe(true);
    });
  });

  describe('Diagnostic Bundle Packager (ZIP Compression)', () => {
    it('should generate a valid compressed PKZIP diagnostic bundle with magic bytes', async () => {
      const result = await createDiagnosticZipBundle();
      expect(result.success).toBe(true);
      expect(result.archivePath).toBeDefined();
      expect(fs.existsSync(result.archivePath!)).toBe(true);

      const buffer = fs.readFileSync(result.archivePath!);
      expect(buffer.length).toBeGreaterThan(100);

      // Check standard PKZIP magic header (0x50 0x4B 0x03 0x04 / "PK\x03\x04")
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });
  });

  describe('Cryptographic Remote Support Session ("Safe Superadmin")', () => {
    it('should generate a valid 15-minute challenge and reject invalid unlock tokens', async () => {
      const challenge = generateSupportChallenge();
      expect(challenge.challengeCode).toMatch(/^KT-[A-Z0-9]{4}-[A-Z0-9]{6}$/);
      expect(challenge.validForMinutes).toBe(15);

      const failResult = await activateSupportSession({
        challengeCode: challenge.challengeCode,
        responseToken: 'SUP-FAKE-TOKEN-0000',
        operatorName: 'Unauthorized-Attacker',
      });

      expect(failResult.success).toBe(false);
      expect(getSupportSessionStatus().isActive).toBe(false);
    });

    it('should authenticate valid cryptographic token and grant elevated maintenance session', async () => {
      const challenge = generateSupportChallenge();
      const validToken = computeExpectedSupportToken(challenge.challengeCode);

      const successResult = await activateSupportSession({
        challengeCode: challenge.challengeCode,
        responseToken: validToken,
        operatorName: 'KTech-Senior-Dev',
      });

      expect(successResult.success).toBe(true);

      const status = getSupportSessionStatus();
      expect(status.isActive).toBe(true);
      expect(status.operatorId).toBe('KTech-Senior-Dev');
      expect(status.unlockedFeatures).toContain('DATABASE_DEEP_REPAIR');
      expect(status.remainingMinutes).toBeGreaterThan(110);

      // Clean up / terminate session
      await terminateSupportSession();
      expect(getSupportSessionStatus().isActive).toBe(false);
    });
  });

  describe('In-App Network Guard & Request Firewall', () => {
    it('should allow whitelisted official domains and loopback', () => {
      expect(isUrlAllowed('http://127.0.0.1:5173/')).toBe(true);
      expect(isUrlAllowed('http://localhost:3000/')).toBe(true);
      expect(isUrlAllowed('https://graph.facebook.com/v18.0/me')).toBe(true);
      expect(isUrlAllowed('https://api.github.com/repos/vigneshms2302/ktech-service-management')).toBe(true);
      expect(isUrlAllowed('https://objects.githubusercontent.com/github-production-release-asset-2e65be/')).toBe(true);
    });

    it('should block rogue, malicious, or unwhitelisted domains', () => {
      expect(isUrlAllowed('https://malicious-telemetry-server.com/api/steal')).toBe(false);
      expect(isUrlAllowed('http://192.168.1.50:8080/exfiltrate')).toBe(false);
      expect(isUrlAllowed('https://untrusted-analytics-tracker.org/event')).toBe(false);
    });

    it('should support dynamic custom domain additions', () => {
      expect(isUrlAllowed('https://api.ktechcomputers.com/v1/health')).toBe(false);
      addAllowedDomain('api.ktechcomputers.com');
      expect(isUrlAllowed('https://api.ktechcomputers.com/v1/health')).toBe(true);
    });
  });

  describe('Workstation Node & Machine Seat Licensing', () => {
    it('should verify and register current workstation node', async () => {
      const status = await verifyAndRegisterWorkstation();
      expect(status.isAllowed).toBe(true);
      expect(status.currentMachineId).toMatch(/^MCH-[A-Z0-9]{12}$/);
      expect(status.maxSeats).toBeGreaterThanOrEqual(1);
      expect(status.activeCount).toBeGreaterThanOrEqual(1);
      expect(status.workstations.length).toBeGreaterThanOrEqual(1);
    });

    it('should support updating seat limit dynamically', async () => {
      await setMaxWorkstationSeats(6);
      expect(await getMaxWorkstationSeats()).toBe(6);
      await setMaxWorkstationSeats(4);
      expect(await getMaxWorkstationSeats()).toBe(4);
    });

    it('should allow deactivating and reactivating a workstation node', async () => {
      const machineId = getCurrentMachineId();
      const deactResult = await deactivateWorkstation(machineId);
      expect(deactResult.success).toBe(true);

      const reactResult = await reactivateWorkstation(machineId);
      expect(reactResult.success).toBe(true);

      const status = await verifyAndRegisterWorkstation();
      expect(status.isAllowed).toBe(true);
    });
  });
});
