import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { config, validateConfig } from './config.ts';
import { initializeMultiTenantSchema } from './db/database.ts';
import { seedInitialPlatform } from './db/seed.ts';
import { authRouter } from './routes/auth.ts';
import { adminRouter } from './routes/admin.ts';
import { jobsRouter } from './routes/jobs.ts';
import { customersRouter } from './routes/customers.ts';
import { billingRouter } from './routes/billing.ts';
import { inventoryRouter } from './routes/inventory.ts';
import { publicRouter } from './routes/public.ts';
import { reportsRouter } from './routes/reports.ts';
import { subscriptionRouter } from './routes/subscription.ts';
import { devicesRouter } from './routes/devices.ts';
import { shopsRouter } from './routes/shops.ts';

export const app = express();
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Handled by frontend reverse proxy / CDN
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  })
);

// ── CORS Origin Allowlist ─────────────────────────────────────────
export function isOriginAllowed(origin: string | undefined, nodeEnv: string, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (nodeEnv !== 'production') return true;
  if (allowedOrigins.includes(origin)) return true;
  // Automatically permit all Vercel deployment and preview URLs
  if (/^https:\/\/[a-zA-Z0-9_\-.]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, config.NODE_ENV, config.ALLOWED_ORIGINS)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not permitted`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ── Body Parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────
// Global API limiter: 500 requests per 15 min per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, error: 'Too many requests. Please slow down.' },
});
app.use('/api', globalLimiter);

// Auth limiter: 20 requests per 15 min per IP (Brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, error: 'Too many authentication attempts. Please wait 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/pin', authLimiter);

// Public tracking limiter: 60 requests per 15 min per IP
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, error: 'Too many tracking requests. Please wait a few minutes.' },
});
app.use('/api/public/track', publicLimiter);

import { storageRouter } from './routes/storage.ts';
import { getClient } from './db/database.ts';
import { getStorageProvider } from './storage/storageAdapter.ts';

// ── Static Files ──────────────────────────────────────────────────
app.use('/storage', express.static(path.join(process.cwd(), 'storage')));

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/billing', billingRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/public', publicRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/shops', shopsRouter);
app.use('/api/storage', storageRouter);

// ── Health Check (Real active dependency verification) ───────────
app.get('/api/health', async (_req, res) => {
  try {
    const client = getClient();
    const dbStart = Date.now();
    await client.execute('SELECT 1 as ping;');
    const dbLatencyMs = Date.now() - dbStart;

    const storageProvider = getStorageProvider();
    const storageHealthy = await storageProvider.isHealthy();

    const dbUrl = process.env.DATABASE_URL || '';
    const isTursoCloud = dbUrl.startsWith('libsql:') || dbUrl.includes('.turso.io');
    const dbProvider = isTursoCloud
      ? 'TURSO_LIBSQL_CLOUD'
      : dbUrl
      ? 'REMOTE_DATABASE'
      : (process.env.NODE_ENV === 'production' ? 'EPHEMERAL_LOCAL_SQLITE' : 'LOCAL_SQLITE');

    res.json({
      status: 'HEALTHY',
      service: 'K-Connect Cloud SaaS Engine',
      version: process.env.npm_package_version || '2.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: 'CONNECTED',
          provider: dbProvider,
          latencyMs: dbLatencyMs,
        },
        storage: {
          status: storageHealthy ? 'CONNECTED' : 'DEGRADED',
          provider: storageProvider.name,
        },
      },
    });
  } catch (err: unknown) {
    res.status(503).json({
      status: 'UNHEALTHY',
      service: 'K-Connect Cloud SaaS Engine',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      error: (err as Error).message,
    });
  }
});

// ── 404 Handler for Unknown API Routes ────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message && err.message.startsWith('CORS error:')) {
    res.status(403).json({ success: false, error: err.message });
    return;
  }
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Startup ───────────────────────────────────────────────────────
export async function startServer(): Promise<void> {
  try {
    // Validate required configuration (throws in production if invalid)
    validateConfig();

    console.log('[K-Connect] Initializing Multi-Tenant SaaS Database...');
    await initializeMultiTenantSchema();
    await seedInitialPlatform();
    console.log('[K-Connect] Database ready.');

    if (process.env.NODE_ENV !== 'test') {
      app.listen(config.PORT, () => {
        console.log(`\n${'═'.repeat(54)}`);
        console.log(`  🚀 K-Connect SaaS API   → http://localhost:${config.PORT}`);
        console.log(`  📡 Health Check          → http://localhost:${config.PORT}/api/health`);
        console.log(`  🛡️  Super-Admin           → ${process.env.SUPERADMIN_USERNAME || 'superadmin'}`);
        console.log(`  🏬 Demo Shop (ktech)     → admin / admin123`);
        console.log(`${'═'.repeat(54)}\n`);
      });
    }
  } catch (err) {
    console.error('[K-Connect] Startup failed:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
}

// Only auto-listen if server/index.ts is executed directly as main module
const isDirectServerEntry = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('server/index.ts') || process.argv[1].endsWith('server\\index.ts'))
);

if (isDirectServerEntry && process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}
