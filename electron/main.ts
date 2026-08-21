import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { setDatabasePath, initializeSchema } from './db/database.ts';
import { seedDatabase } from './db/seed.ts';
import { registerAuthIpc } from './ipc/authIpc.ts';
import { registerSystemIpc } from './ipc/systemIpc.ts';
import { registerVaultIpc } from './ipc/vaultIpc.ts';
import { registerCustomerIpc } from './ipc/customerIpc.ts';
import { registerDeviceIpc } from './ipc/deviceIpc.ts';
import { registerJobIpc } from './ipc/jobIpc.ts';
import { registerSearchIpc } from './ipc/searchIpc.ts';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
  // Set DB path to OS application data folder in production
  if (app.isPackaged || !process.env.KTECH_DEV_LOCAL_DB) {
    const userDataPath = app.getPath('userData');
    const prodDbPath = path.join(userDataPath, 'database', 'ktech.sqlite');
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
