import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { setDatabasePath, initializeSchema, getClient } from './db/database.ts';
import { seedDatabase } from './db/seed.ts';
import { initializeLogger, logger } from './utils/logger.ts';
import { initializeInAppFirewall } from './security/firewall.ts';
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
  // 1. Initialize Unified Enterprise Logger & Exception Listeners
  initializeLogger();
  logger.info('Bootstrap', 'Starting KTech Service Management application bootstrap...');

  // 2. Set DB and storage path to D: drive in production if available, else OS application data folder
  if (app.isPackaged || !process.env.KTECH_DEV_LOCAL_DB) {
    const userDataPath = app.getPath('userData');
    let dataBasePath = userDataPath;

    // Prioritize D:\ drive if present on Windows for enterprise storage separation
    if (process.platform === 'win32' && fs.existsSync('D:\\')) {
      dataBasePath = path.join('D:\\', 'K-Connect', 'Data');

      // If legacy AppData database exists and D: drive database does not, copy it over safely
      const legacyDbPath = path.join(userDataPath, 'database', 'ktech.sqlite');
      const targetDbPath = path.join(dataBasePath, 'database', 'ktech.sqlite');

      if (fs.existsSync(legacyDbPath) && !fs.existsSync(targetDbPath)) {
        try {
          fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
          fs.copyFileSync(legacyDbPath, targetDbPath);
          logger.info('Bootstrap', 'Migrated legacy database from AppData to D:\\ drive successfully.');
        } catch (copyErr) {
          logger.warn('Bootstrap', 'Could not migrate legacy database:', { error: String(copyErr) });
        }
      }
    }

    const prodDbPath = path.join(dataBasePath, 'database', 'ktech.sqlite');
    setDatabasePath(prodDbPath);
    logger.info('Bootstrap', `Resolved active database path: ${prodDbPath}`);
  }

  // 3. Initialize SQLite tables & seed default data
  try {
    await initializeSchema();
    await seedDatabase(false);

    // Clean up any stale legacy demo actors and sample jobs from prior development runs
    const client = getClient();
    await client.execute(`DELETE FROM users WHERE id IN ('USR_OWNER', 'USR_RECEPTION', 'USR_TECH1', 'USR_TECH2', 'USR_ACCOUNTS');`);
    await client.execute(`DELETE FROM customers WHERE id = 'CUST-001';`);
    await client.execute(`DELETE FROM devices WHERE id = 'DEV-001';`);
    await client.execute(`DELETE FROM service_jobs WHERE id = 'JOB-001';`);
    await client.execute(`DELETE FROM job_status_history WHERE id IN ('JSH-001', 'JSH-002');`);

    logger.info('Database', 'SQLite Database initialized and verified cleanly.');
  } catch (error) {
    logger.error('Database', 'Database initialization encountered error:', error);
  }

  // 4. Register All Modular IPC Handlers
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
  logger.info('Bootstrap', 'All IPC controllers registered.');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'K-Connect - Service & Business Management',
    backgroundColor: '#0f172a', // Slate 900
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      spellcheck: true,
      devTools: !app.isPackaged, // Anti-Reverse Engineering: Disable DevTools in production
    },
  });

  // Remove default menu for clean internal app feel
  mainWindow.setMenuBarVisibility(false);

  // Security: Prevent rogue new window spawns and open authorized links in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://wa.me/') || url.startsWith('https://api.whatsapp.com/')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Anti-Debugging: Lock out DevTools in production builds
  if (app.isPackaged) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
      logger.warn('Security', 'Unauthorized attempt to open DevTools in production build blocked.');
    });
  }

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
  initializeInAppFirewall();
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
