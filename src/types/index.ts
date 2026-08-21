export type RoleId = 'ROLE_OWNER' | 'ROLE_RECEPTION' | 'ROLE_TECHNICIAN' | 'ROLE_ACCOUNTS';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  roleId: RoleId;
  roleName: string;
  phone?: string | null;
  commissionPct: number;
  permissions: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
}

export interface SystemHealth {
  databaseStatus: string;
  databasePath: string;
  databaseSizeBytes: number;
  tableCount: number;
  expectedTableCount: number;
  userCount: number;
  jobCount: number;
  customerCount: number;
  auditLogCount: number;
  backupCount: number;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string;
  username?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: string | null;
  afterState: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ElectronAPI {
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<IPCResponse<UserSession>>;
    pinLogin: (params: { pinCode: string }) => Promise<IPCResponse<UserSession>>;
    getCurrentUser: () => Promise<IPCResponse<UserSession | null>>;
    logout: () => Promise<IPCResponse<void>>;
    listUsers: () => Promise<IPCResponse<UserProfile[]>>;
  };
  system: {
    getHealth: () => Promise<IPCResponse<SystemHealth>>;
    getAuditLogs: (params: { limit?: number }) => Promise<IPCResponse<AuditLogEntry[]>>;
    createBackup: (params: { backupType?: 'AUTO' | 'MANUAL' | 'PRE_RESTORE'; targetDir?: string }) => Promise<IPCResponse<{ backupId: string; backupPath: string; fileSizeBytes: number }>>;
    getSettings: () => Promise<IPCResponse<Record<string, string>>>;
    updateSetting: (params: { key: string; value: string }) => Promise<IPCResponse<void>>;
  };
  vault: {
    unlockPasscode: (params: { deviceId: string }) => Promise<IPCResponse<{ passcode: string }>>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
