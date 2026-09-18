import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema } from './db/database.ts';
import { seedDatabase } from './db/seed.ts';
import { registerAuthIpc } from './ipc/authIpc.ts';
import { registerSystemIpc } from './ipc/systemIpc.ts';
import { registerVaultIpc } from './ipc/vaultIpc.ts';
import { registerCustomerIpc } from './ipc/customerIpc.ts';
import { registerDeviceIpc } from './ipc/deviceIpc.ts';
import { registerJobIpc } from './ipc/jobIpc.ts';
import { registerSearchIpc } from './ipc/searchIpc.ts';
import { registerInventoryIpc } from './ipc/inventoryIpc.ts';
import { registerBillingIpc } from './ipc/billingIpc.ts';
import { registerSpecializedIpc } from './ipc/specializedIpc.ts';
import { registerCommunicationIpc } from './ipc/communicationIpc.ts';
import { registerReportsIpc } from './ipc/reportsIpc.ts';
import { registerUpdaterIpc, checkForUpdatesOnStartup } from './ipc/updaterIpc.ts';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
  // Set DB and storage path to D: drive in production if available, else OS application data folder
  if (app.isPackaged || !process.env.KTECH_DEV_LOCAL_DB) {
    const userDataPath = app.getPath('userData');
    let dataBasePath = userDataPath;

    // Prioritize D:\ drive if present on Windows
    if (process.platform === 'win32' && fs.existsSync('D:\\')) {
      dataBasePath = path.join('D:\\', 'KTech Computers', 'Data');

      // If legacy AppData database exists and D: drive database does not, copy it over safely
      const legacyDbPath = path.join(userDataPath, 'database', 'ktech.sqlite');
      const targetDbPath = path.join(dataBasePath, 'database', 'ktech.sqlite');

      if (fs.existsSync(legacyDbPath) && !fs.existsSync(targetDbPath)) {
        try {
          fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
          fs.copyFileSync(legacyDbPath, targetDbPath);
          console.log('[KTech DB] Migrated legacy database from AppData to D:\\ drive successfully.');
        } catch (copyErr) {
          console.warn('[KTech DB] Could not migrate legacy database:', copyErr);
        }
      }
    }

    const prodDbPath = path.join(dataBasePath, 'database', 'ktech.sqlite');
    setDatabasePath(prodDbPath);
  }

  // Initialize SQLite tables & seed default data
  try {
    await initializeSchema();
    await seedDatabase();
    console.log('[KTech DB] Database initialized and seeded successfully.');
  } catch (error) {
    console.error('[KTech DB] Database initialization failed:', error);
  }

  // Register IPC Controllers
  registerAuthIpc();
  registerSystemIpc();
  registerVaultIpc();
  registerCustomerIpc();
  registerDeviceIpc();
  registerJobIpc();
  registerSearchIpc();
  registerInventoryIpc();
  registerBillingIpc();
  registerSpecializedIpc();
  registerCommunicationIpc();
  registerReportsIpc();
  registerUpdaterIpc();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'KTech Computers - Service & Business Management',
    backgroundColor: '#0f172a', // Slate 900
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Remove default menu for clean internal app feel
  mainWindow.setMenuBarVisibility(false);

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
