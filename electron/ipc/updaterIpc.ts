import { app, ipcMain, BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

export type UpdateStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'AVAILABLE'
  | 'NOT_AVAILABLE'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'ERROR'
  | 'DEV_MODE';

export interface UpdateStatusPayload {
  status: UpdateStatus;
  currentVersion: string;
  updateVersion?: string;
  releaseDate?: string;
  releaseNotes?: string | null;
  progressPercent?: number;
  bytesPerSecond?: number;
  transferredBytes?: number;
  totalBytes?: number;
  error?: string;
}

let currentStatus: UpdateStatusPayload = {
  status: 'IDLE',
  currentVersion: app.getVersion() || '1.0.0',
};

let isUpdaterConfigured = false;

function broadcastStatus(): void {
  const allWindows = BrowserWindow.getAllWindows();
  for (const win of allWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('updater:status-changed', currentStatus);
    }
  }
}

export function registerUpdaterIpc(): void {
  if (isUpdaterConfigured) return;
  isUpdaterConfigured = true;

  // Initialize status version
  currentStatus.currentVersion = app.getVersion() || '1.0.0';

  // Configure electron-updater
  autoUpdater.autoDownload = false; // Give user control / UI visibility over downloads
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    currentStatus = {
      ...currentStatus,
      status: 'CHECKING',
      error: undefined,
    };
    broadcastStatus();
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    let releaseNotesText: string | null = null;
    if (typeof info.releaseNotes === 'string') {
      releaseNotesText = info.releaseNotes;
    } else if (Array.isArray(info.releaseNotes)) {
      releaseNotesText = info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note)).join('\n');
    }

    currentStatus = {
      ...currentStatus,
      status: 'AVAILABLE',
      updateVersion: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: releaseNotesText,
      error: undefined,
    };
    broadcastStatus();
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    currentStatus = {
      ...currentStatus,
      status: 'NOT_AVAILABLE',
      updateVersion: info.version,
      error: undefined,
    };
    broadcastStatus();
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    currentStatus = {
      ...currentStatus,
      status: 'DOWNLOADING',
      progressPercent: Math.round(progress.percent * 10) / 10,
      bytesPerSecond: progress.bytesPerSecond,
      transferredBytes: progress.transferred,
      totalBytes: progress.total,
    };
    broadcastStatus();
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    currentStatus = {
      ...currentStatus,
      status: 'DOWNLOADED',
      updateVersion: info.version,
      progressPercent: 100,
    };
    broadcastStatus();
  });

  autoUpdater.on('error', (err: Error) => {
    console.error('[KTech Updater] Update error:', err);
    currentStatus = {
      ...currentStatus,
      status: 'ERROR',
      error: err.message || 'An unexpected error occurred while checking for updates.',
    };
    broadcastStatus();
  });

  // Handle IPC calls from Renderer
  ipcMain.handle('updater:getStatus', async () => {
    return {
      success: true,
      data: currentStatus,
    };
  });

  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      if (!app.isPackaged) {
        currentStatus = {
          ...currentStatus,
          status: 'DEV_MODE',
          error: 'Auto-updates are active in packaged desktop builds (NSIS setup). You are currently running in development mode.',
        };
        broadcastStatus();
        return {
          success: true,
          data: currentStatus,
        };
      }

      currentStatus = {
        ...currentStatus,
        status: 'CHECKING',
        error: undefined,
      };
      broadcastStatus();

      await autoUpdater.checkForUpdates();

      return {
        success: true,
        data: currentStatus,
      };
    } catch (err: unknown) {
      currentStatus = {
        ...currentStatus,
        status: 'ERROR',
        error: (err as Error).message || 'Failed to check for updates',
      };
      broadcastStatus();
      return {
        success: false,
        error: (err as Error).message,
        data: currentStatus,
      };
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      if (!app.isPackaged) {
        return {
          success: false,
          error: 'Cannot download updates in development mode.',
        };
      }

      currentStatus = {
        ...currentStatus,
        status: 'DOWNLOADING',
        progressPercent: 0,
      };
      broadcastStatus();

      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: unknown) {
      currentStatus = {
        ...currentStatus,
        status: 'ERROR',
        error: (err as Error).message || 'Failed to download update',
      };
      broadcastStatus();
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  ipcMain.handle('updater:quitAndInstall', async () => {
    try {
      if (!app.isPackaged) {
        return {
          success: false,
          error: 'Cannot install updates in development mode.',
        };
      }

      // isSilent: false, isForceRunAfter: true
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });
}

export function checkForUpdatesOnStartup(): void {
  if (app.isPackaged) {
    // Delay check slightly after boot so startup is fast and smooth
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[KTech Updater] Startup update check error:', err.message);
      });
    }, 5000);
  }
}
