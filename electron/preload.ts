import { contextBridge, ipcRenderer } from 'electron';

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const electronAPI = {
  // Authentication & Roles
  auth: {
    login: (credentials: { username: string; password: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:login', credentials),
    pinLogin: (params: { pinCode: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:pinLogin', params),
    getCurrentUser: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:getCurrentUser'),
    logout: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:logout'),
    listUsers: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:listUsers'),
  },

  // System & Health
  system: {
    getHealth: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getHealth'),
    getAuditLogs: (params: { limit?: number }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getAuditLogs', params),
    createBackup: (params: { backupType?: 'AUTO' | 'MANUAL' | 'PRE_RESTORE'; targetDir?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:createBackup', params),
    getSettings: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getSettings'),
    updateSetting: (params: { key: string; value: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:updateSetting', params),
  },

  // Secure Vault
  vault: {
    unlockPasscode: (params: { deviceId: string }): Promise<IPCResponse<{ passcode: string }>> =>
      ipcRenderer.invoke('vault:unlockPasscode', params),
  },
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
