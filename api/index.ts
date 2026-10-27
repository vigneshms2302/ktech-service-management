import { app } from '../server/index.ts';
import { initializeMultiTenantSchema } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
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

/**
 * Vercel Serverless Function entry point.
 * Wraps the production Express backend and safely manages serverless lifecycle.
 */
export default async function handler(req: any, res: any) {
  try {
    if (!isInitialized) {
      await bootstrap();
    }

    return await new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      (app as any)(req, res);
    });
  } catch (err: unknown) {
    console.error('[Vercel Handler Crash Guard]', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'An internal server error occurred in the serverless handler.',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
