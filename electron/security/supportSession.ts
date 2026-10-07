import crypto from 'node:crypto';
import os from 'node:os';
import { logger } from '../utils/logger.ts';
import { getClient, logAudit } from '../db/database.ts';

export interface SupportChallenge {
  challengeCode: string;
  machineId: string;
  expiresAt: string;
  validForMinutes: number;
}

export interface SupportSessionStatus {
  isActive: boolean;
  operatorId?: string;
  expiresAt?: string;
  remainingMinutes?: number;
  unlockedFeatures: string[];
}

let activeSupportSession: {
  isActive: boolean;
  operatorId: string;
  expiresAtMs: number;
} | null = null;

// Dynamic support secret derivation based on KTech support domain signature
const SUPPORT_SALT = 'ktech-remote-support-challenge-epoch-2026';

function getMachineIdentifier(): string {
  try {
    const raw = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 8).toUpperCase();
  } catch {
    return 'KTECH-NODE';
  }
}

/**
 * Generates an ephemeral 15-minute Challenge Code for the current workstation.
 */
export function generateSupportChallenge(): SupportChallenge {
  const machineId = getMachineIdentifier();
  const epochWindow = Math.floor(Date.now() / (15 * 60 * 1000)); // 15-minute time window
  const rawData = `${machineId}:${epochWindow}:${SUPPORT_SALT}`;
  const signature = crypto.createHash('sha256').update(rawData).digest('hex').substring(0, 6).toUpperCase();
  const challengeCode = `KT-${machineId.substring(0, 4)}-${signature}`;

  logger.audit('SupportSession', 'SUPPORT_CHALLENGE_GENERATED', 'SYSTEM', { challengeCode, machineId });

  return {
    challengeCode,
    machineId,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    validForMinutes: 15,
  };
}

/**
 * Computes what the valid response token should be for a given challenge.
 * (This same algorithm is used by KTech Support Command Center to issue unlock tokens to clients).
 */
export function computeExpectedSupportToken(challengeCode: string): string {
  const cleanCode = challengeCode.trim().toUpperCase();
  const hmac = crypto.createHmac('sha256', SUPPORT_SALT);
  hmac.update(cleanCode);
  const digest = hmac.digest('hex').toUpperCase();
  return `SUP-${digest.substring(0, 4)}-${digest.substring(4, 8)}-${digest.substring(8, 12)}`;
}

/**
 * Verifies an unlock token provided by the KTech support team and activates elevated support mode.
 */
export async function activateSupportSession(params: {
  challengeCode: string;
  responseToken: string;
  operatorName?: string;
}): Promise<{ success: boolean; message: string; session?: SupportSessionStatus }> {
  const { challengeCode, responseToken, operatorName } = params;
  const cleanToken = responseToken.trim().toUpperCase();
  const expectedToken = computeExpectedSupportToken(challengeCode);

  const isValid = crypto.timingSafeEqual(
    Buffer.from(cleanToken.padEnd(20, ' ')),
    Buffer.from(expectedToken.padEnd(20, ' '))
  );

  if (!isValid) {
    logger.warn('SupportSession', 'Failed attempt to activate support session with invalid token', {
      challengeCode,
      providedToken: cleanToken.substring(0, 7) + '***',
    });
    return {
      success: false,
      message: 'Invalid Support Authorization Token. Please verify with KTech Support Engineer.',
    };
  }

  // Grant 2 hours (120 minutes) of elevated diagnostic access
  const durationMs = 120 * 60 * 1000;
  const expiresAtMs = Date.now() + durationMs;
  const operator = operatorName || 'KTech-Support-Engineer';

  activeSupportSession = {
    isActive: true,
    operatorId: operator,
    expiresAtMs,
  };

  logger.audit('SupportSession', 'ELEVATED_SUPPORT_SESSION_ACTIVATED', operator, {
    challengeCode,
    validUntil: new Date(expiresAtMs).toISOString(),
  });

  await logAudit(
    null,
    'SUPPORT_SESSION_START',
    'SYSTEM',
    getMachineIdentifier(),
    null,
    { operator, durationMinutes: 120 }
  );

  return {
    success: true,
    message: 'Elevated Support & Diagnostics Session activated successfully for 2 hours.',
    session: getSupportSessionStatus(),
  };
}

/**
 * Checks current support session status and automatically expires after duration.
 */
export function getSupportSessionStatus(): SupportSessionStatus {
  if (!activeSupportSession) {
    return {
      isActive: false,
      unlockedFeatures: [],
    };
  }

  const now = Date.now();
  if (now > activeSupportSession.expiresAtMs) {
    activeSupportSession = null;
    return {
      isActive: false,
      unlockedFeatures: [],
    };
  }

  const remainingMinutes = Math.max(0, Math.round((activeSupportSession.expiresAtMs - now) / 60000));

  return {
    isActive: true,
    operatorId: activeSupportSession.operatorId,
    expiresAt: new Date(activeSupportSession.expiresAtMs).toISOString(),
    remainingMinutes,
    unlockedFeatures: [
      'DATABASE_DEEP_REPAIR',
      'INTEGRITY_FORCE_VACUUM',
      'RAW_AUDIT_LOG_INSPECT',
      'RESET_CORRUPTED_INDEXES',
      'DIRECT_HEALTH_TELEMETRY',
    ],
  };
}

/**
 * Manually terminates an active support session.
 */
export async function terminateSupportSession(): Promise<void> {
  if (activeSupportSession) {
    logger.audit('SupportSession', 'SUPPORT_SESSION_TERMINATED', activeSupportSession.operatorId);
    await logAudit(
      null,
      'SUPPORT_SESSION_END',
      'SYSTEM',
      getMachineIdentifier(),
      null,
      { operator: activeSupportSession.operatorId }
    );
    activeSupportSession = null;
  }
}

/**
 * Executes deep maintenance and self-repair operations during an active support session.
 */
export async function executeSupportMaintenance(action: 'REINDEX' | 'VACUUM' | 'INTEGRITY_FIX' | 'CLEAN_ORPHANS'): Promise<{
  success: boolean;
  action: string;
  result: unknown;
}> {
  const session = getSupportSessionStatus();
  if (!session.isActive) {
    throw new Error('Unauthorized: Elevated Support Session is not active.');
  }

  const client = getClient();
  logger.info('SupportMaintenance', `Executing support maintenance action: ${action}`, { operator: session.operatorId });

  let result: unknown = null;

  switch (action) {
    case 'REINDEX': {
      await client.execute('REINDEX;');
      result = 'Database indices rebuilt successfully.';
      break;
    }
    case 'VACUUM': {
      await client.execute('VACUUM;');
      result = 'Database vacuumed and space reclaimed.';
      break;
    }
    case 'INTEGRITY_FIX': {
      const integrity = await client.execute('PRAGMA integrity_check;');
      const quick = await client.execute('PRAGMA quick_check;');
      result = { integrity: integrity.rows, quick: quick.rows };
      break;
    }
    case 'CLEAN_ORPHANS': {
      // Clean orphaned records in intermediate tables if any
      await client.execute(`DELETE FROM job_parts WHERE service_job_id NOT IN (SELECT id FROM service_jobs);`);
      await client.execute(`DELETE FROM job_services WHERE service_job_id NOT IN (SELECT id FROM service_jobs);`);
      await client.execute(`DELETE FROM invoice_items WHERE invoice_id NOT IN (SELECT id FROM invoices);`);
      result = 'Orphaned relationships cleaned successfully.';
      break;
    }
  }

  return {
    success: true,
    action,
    result,
  };
}
