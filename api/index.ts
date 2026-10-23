import { app } from '../server/index.ts';
import { initializeMultiTenantSchema } from '../server/db/database.ts';
import { seedInitialPlatform } from '../server/db/seed.ts';

let isInitialized = false;

/**
 * Vercel Serverless Function entry point.
 * Wraps the production Express backend and lazily bootstraps the database schema.
 */
export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    try {
      await initializeMultiTenantSchema();
      await seedInitialPlatform();
      isInitialized = true;
    } catch (err: unknown) {
      console.error('[Vercel Serverless DB Init]', err);
      if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
        res.status(503).json({
          success: false,
          error: 'FATAL: DATABASE_URL not configured for cloud deployment. Please configure DATABASE_URL and DATABASE_AUTH_TOKEN in your Vercel project settings.',
        });
        return;
      }
    }
  }
  return (app as any)(req, res);
}
