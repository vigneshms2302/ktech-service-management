import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import { initializeLogger, logger } from './utils/logger.ts';
import { registerUpdaterIpc, checkForUpdatesOnStartup } from './ipc/updaterIpc.ts';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = (typeof app !== 'undefined' && Boolean(app?.isPackaged))
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let mainWindow: BrowserWindow | null = null;

function registerDesktopShellIpc(): void {
  ipcMain.handle('system:openPath', async (_event, payload: { path: string }) => {
    try {
      const err = await shell.openPath(payload.path);
      return { success: !err, error: err || undefined };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('system:showItemInFolder', async (_event, payload: { path: string }) => {
    try {
      shell.showItemInFolder(payload.path);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('system:getHealth', async () => {
    return {
      success: true,
      data: {
        status: 'HEALTHY',
        runtime: 'Electron Desktop',
        platform: process.platform,
        arch: process.arch,
        version: (app?.getVersion ? app.getVersion() : null) || '1.2.0',
        mode: 'Cloud-Connected Real-Time Architecture',
      },
    };
  });

  registerUpdaterIpc();
  logger.info('Bootstrap', 'Desktop native shell and updater controllers registered.');
}

async function bootstrap(): Promise<void> {
  initializeLogger();
  logger.info('Bootstrap', 'Starting K-Connect Cloud-Connected Desktop Application bootstrap...');
  registerDesktopShellIpc();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'K-Connect - Service & Business Management (Cloud Synced)',
    backgroundColor: '#0f172a', // Slate 900
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Ensures local desktop renderer can fetch live Cloud API endpoints cleanly
      spellcheck: true,
      devTools: true,
    },
  });

  // Remove default menu for clean native app experience
  mainWindow.setMenuBarVisibility(false);

  // Capture renderer console messages for debugging
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logger.warn('RendererConsole', `[${sourceId}:${line}] ${message}`);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error('Window', `Failed to load frontend: ${errorCode} - ${errorDescription} (${validatedURL})`);
  });

  // Open external links (e.g. WhatsApp, web documentation) in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://wa.me/') || url.startsWith('https://api.whatsapp.com/') || url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(process.env.DIST || path.join(__dirname, '../dist'), 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await bootstrap();
  createWindow();
  checkForUpdatesOnStartup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('AppLifecycle', 'Application windows closed. Terminating runtime.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
