import { app, ensureSchemaReady } from './index.ts';

// 1. Ensure database schema is bootstrapped on first serverless request
app.use(async (_req, _res, next) => {
  await ensureSchemaReady();
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
