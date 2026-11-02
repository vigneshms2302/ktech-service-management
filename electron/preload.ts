import { contextBridge, ipcRenderer } from 'electron';

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Desktop Shell Native Bridge
 * Exposes native desktop OS services (file open, updater, platform)
 * without intercepting business database queries.
 * All application entities (jobs, customers, inventory, billing, auth)
 * execute against the unified Cloud Database via the Cloud API client.
 */
const desktopBridge = {
  isDesktop: true,
  isElectron: true,
  platform: process.platform,

  // Native desktop OS utilities
  system: {
    openPath: (params: { path: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:openPath', params),
    showItemInFolder: (params: { path: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:showItemInFolder', params),
    openExternal: (url: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('shell:openExternal', url),
    getHealth: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getHealth'),
  },

  // Desktop native auto-updates
  updater: {
    getStatus: (): Promise<IPCResponse<any>> =>
      ipcRenderer.invoke('updater:getStatus'),
    checkForUpdates: (): Promise<IPCResponse<any>> =>
      ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('updater:quitAndInstall'),
    onStatusChange: (callback: (status: any) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: any) => {
        callback(status);
      };
      ipcRenderer.on('updater:status-changed', listener);
      return () => {
        ipcRenderer.removeListener('updater:status-changed', listener);
      };
    },
  },
};

export type DesktopBridge = typeof desktopBridge;

// Expose desktopBridge in the renderer context without freezing window.electronAPI
contextBridge.exposeInMainWorld('desktopBridge', desktopBridge);
