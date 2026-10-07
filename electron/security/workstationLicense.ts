import crypto from 'node:crypto';
import os from 'node:os';
import { getClient, logAudit } from '../db/database.ts';
import { logger } from '../utils/logger.ts';

export interface WorkstationNode {
  id: string;
  machineId: string;
  hostname: string;
  platform: string;
  registeredAt: string;
  lastActiveAt: string;
  isActive: boolean;
  ipAddress?: string;
  isCurrentMachine: boolean;
}

export interface WorkstationLicenseStatus {
  isAllowed: boolean;
  currentMachineId: string;
  currentHostname: string;
  activeCount: number;
  maxSeats: number;
  isCurrentRegistered: boolean;
  workstations: WorkstationNode[];
  reason?: string;
}

const DEFAULT_MAX_SEATS = 4;

/**
 * Returns deterministic hardware identifier for the current PC.
 */
export function getCurrentMachineId(): string {
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
    const macStr = macAddresses.sort().join(';');
    const raw = `${os.hostname()}|${os.platform()}|${os.arch()}|${os.cpus()[0]?.model || ''}|${macStr}`;
    return 'MCH-' + crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12).toUpperCase();
  } catch {
    return 'MCH-' + crypto.createHash('sha256').update(os.hostname()).digest('hex').substring(0, 12).toUpperCase();
  }
}

/**
 * Gets the primary local IPv4 address.
 */
function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (iface) {
        for (const net of iface) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return '127.0.0.1';
}

/**
 * Gets configured maximum allowed workstation seats from settings.
 */
export async function getMaxWorkstationSeats(): Promise<number> {
  try {
    const client = getClient();
    const res = await client.execute(`SELECT value FROM settings WHERE key = 'license.max_workstations'`);
    if (res.rows.length > 0 && res.rows[0]?.value) {
      const parsed = parseInt(String(res.rows[0].value), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch (err) {
    logger.warn('License', 'Could not load max seats from settings; using default 4', { error: String(err) });
  }
  return DEFAULT_MAX_SEATS;
}

/**
 * Updates configured maximum allowed workstation seats.
 */
export async function setMaxWorkstationSeats(maxSeats: number): Promise<void> {
  const client = getClient();
  const seats = Math.max(1, maxSeats);
  await client.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES ('license.max_workstations', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;`,
    args: [String(seats)],
  });
  logger.info('License', `Workstation seat limit updated to ${seats} seats.`);
}

/**
 * Verifies if current machine is authorized or registers it if seats are available.
 */
export async function verifyAndRegisterWorkstation(): Promise<WorkstationLicenseStatus> {
  const client = getClient();
  const currentMachineId = getCurrentMachineId();
  const currentHostname = os.hostname();
  const currentPlatform = `${os.platform()} (${os.arch()})`;
  const localIp = getLocalIp();
  const maxSeats = await getMaxWorkstationSeats();

  // 1. Fetch all registered workstations
  const result = await client.execute(`SELECT * FROM licensed_workstations ORDER BY registered_at ASC;`);
  const allNodes: WorkstationNode[] = result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const mId = String(row.machine_id);
    return {
      id: String(row.id),
      machineId: mId,
      hostname: String(row.hostname),
      platform: String(row.platform),
      registeredAt: String(row.registered_at),
      lastActiveAt: String(row.last_active_at),
      isActive: Number(row.is_active) === 1,
      ipAddress: row.ip_address ? String(row.ip_address) : undefined,
      isCurrentMachine: mId === currentMachineId,
    };
  });

  const activeNodes = allNodes.filter((n) => n.isActive);
  const activeCount = activeNodes.length;
  const currentRegisteredNode = allNodes.find((n) => n.machineId === currentMachineId);

  // Case A: Machine is already registered and active -> update last active
  if (currentRegisteredNode && currentRegisteredNode.isActive) {
    await client.execute({
      sql: `UPDATE licensed_workstations SET last_active_at = CURRENT_TIMESTAMP, ip_address = ? WHERE machine_id = ?`,
      args: [localIp, currentMachineId],
    });

    return {
      isAllowed: true,
      currentMachineId,
      currentHostname,
      activeCount,
      maxSeats,
      isCurrentRegistered: true,
      workstations: allNodes,
    };
  }

  // Case B: Machine was previously registered but deactivated
  if (currentRegisteredNode && !currentRegisteredNode.isActive) {
    // If seats are available, reactivate
    if (activeCount < maxSeats) {
      await client.execute({
        sql: `UPDATE licensed_workstations SET is_active = 1, last_active_at = CURRENT_TIMESTAMP, ip_address = ? WHERE machine_id = ?`,
        args: [localIp, currentMachineId],
      });
      return {
        isAllowed: true,
        currentMachineId,
        currentHostname,
        activeCount: activeCount + 1,
        maxSeats,
        isCurrentRegistered: true,
        workstations: allNodes.map((n) => (n.machineId === currentMachineId ? { ...n, isActive: true } : n)),
      };
    } else {
      return {
        isAllowed: false,
        currentMachineId,
        currentHostname,
        activeCount,
        maxSeats,
        isCurrentRegistered: true,
        workstations: allNodes,
        reason: `Workstation Seat Limit Exceeded (${activeCount}/${maxSeats} active nodes). Please deactivate an unused PC or upgrade license.`,
      };
    }
  }

  // Case C: Brand new machine trying to register
  if (activeCount < maxSeats) {
    const newId = `WKS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await client.execute({
      sql: `INSERT INTO licensed_workstations (id, machine_id, hostname, platform, is_active, ip_address)
            VALUES (?, ?, ?, ?, 1, ?)`,
      args: [newId, currentMachineId, currentHostname, currentPlatform, localIp],
    });

    logger.info('License', `New workstation registered: ${currentHostname} (${currentMachineId}) [${activeCount + 1}/${maxSeats} seats used]`);

    const updatedNode: WorkstationNode = {
      id: newId,
      machineId: currentMachineId,
      hostname: currentHostname,
      platform: currentPlatform,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isActive: true,
      ipAddress: localIp,
      isCurrentMachine: true,
    };

    return {
      isAllowed: true,
      currentMachineId,
      currentHostname,
      activeCount: activeCount + 1,
      maxSeats,
      isCurrentRegistered: true,
      workstations: [...allNodes, updatedNode],
    };
  }

  // Case D: Limit reached, new machine BLOCKED
  logger.warn('License', `Workstation limit blocked for new computer ${currentHostname} (${currentMachineId}). Active: ${activeCount}/${maxSeats}`);

  return {
    isAllowed: false,
    currentMachineId,
    currentHostname,
    activeCount,
    maxSeats,
    isCurrentRegistered: false,
    workstations: allNodes,
    reason: `Workstation Seat Limit Exceeded (${activeCount}/${maxSeats} nodes registered). This shop installation is capped at ${maxSeats} computers. Contact KTech Support to add additional seats or deactivate an older computer.`,
  };
}

/**
 * Deactivates a workstation to free up a license seat for a replacement PC.
 */
export async function deactivateWorkstation(machineId: string): Promise<{ success: boolean; message: string }> {
  const client = getClient();
  await client.execute({
    sql: `UPDATE licensed_workstations SET is_active = 0, last_active_at = CURRENT_TIMESTAMP WHERE machine_id = ?`,
    args: [machineId],
  });

  logger.audit('License', 'WORKSTATION_DEACTIVATED', 'SYSTEM', { machineId });
  await logAudit(null, 'DEACTIVATE_WORKSTATION', 'LICENSE', machineId, null, { machineId });

  return {
    success: true,
    message: `Workstation (${machineId}) deactivated successfully. 1 license seat is now available.`,
  };
}

/**
 * Reactivates a previously deactivated workstation.
 */
export async function reactivateWorkstation(machineId: string): Promise<{ success: boolean; message: string }> {
  const client = getClient();
  const maxSeats = await getMaxWorkstationSeats();
  const countRes = await client.execute(`SELECT COUNT(*) as c FROM licensed_workstations WHERE is_active = 1`);
  const activeCount = Number((countRes.rows[0] as Record<string, unknown>)?.c || 0);

  if (activeCount >= maxSeats) {
    return {
      success: false,
      message: `Cannot reactivate workstation: Maximum seat limit (${maxSeats}) already reached.`,
    };
  }

  await client.execute({
    sql: `UPDATE licensed_workstations SET is_active = 1, last_active_at = CURRENT_TIMESTAMP WHERE machine_id = ?`,
    args: [machineId],
  });

  logger.audit('License', 'WORKSTATION_REACTIVATED', 'SYSTEM', { machineId });
  return {
    success: true,
    message: `Workstation (${machineId}) reactivated successfully.`,
  };
}
