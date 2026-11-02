import { app } from './index.ts';
import { initializeMultiTenantSchema } from './db/database.ts';
import { seedInitialPlatform } from './db/seed.ts';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
          console.warn('[Vercel Serverless] DATABASE_URL is not configured yet. Skipping DB schema bootstrap.');
          isInitialized = true;
          return;
        }
        console.log('[Vercel Serverless] Bootstrapping SaaS schema & seed data...');
        await initializeMultiTenantSchema();
        await seedInitialPlatform();
        isInitialized = true;
        console.log('[Vercel Serverless] Bootstrap complete.');
      } catch (err) {
        console.error('[Vercel Serverless DB Init Error]', err);
        // Mark as initialized so subsequent requests do not get trapped in repeating cold-start failure
        isInitialized = true;
      } finally {
        initPromise = null;
      }
    })();
  }
  return initPromise;
}

// 1. Ensure database schema is bootstrapped on first serverless request
app.use(async (_req, _res, next) => {
  if (!isInitialized) {
    await bootstrap();
  }
  next();
});

// 2. Restore original URL path if Vercel serverless rewrite routed to /api
app.use((req, _res, next) => {
  const vercelPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (typeof vercelPath === 'string' && vercelPath.startsWith('/api') && req.url === '/api') {
    req.url = vercelPath;
  }
  next();
});

// Directly export the Express app for Vercel Serverless Function runtime
export default app;
