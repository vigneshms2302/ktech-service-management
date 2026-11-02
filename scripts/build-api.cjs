const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function buildApi() {
  console.log('[build:api] Bundling Vercel serverless function with esbuild...');

  const apiDir = path.join(__dirname, '..', 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  // Bundle server/vercel.ts into api/index.js as self-contained CommonJS
  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'server', 'vercel.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(apiDir, 'index.js'),
    external: [
      '@libsql/client', // native binary (excluded; @libsql/client/web pure JS is bundled/used for cloud)
      'better-sqlite3',
    ],
    footer: {
      js: 'if (module.exports && module.exports.default) { const _d = module.exports.default; module.exports = _d; module.exports.default = _d; }',
    },
    logLevel: 'info',
  });

  // Also create api/[...path].js that re-exports index.js for catch-all compatibility
  fs.writeFileSync(
    path.join(apiDir, '[...path].js'),
    `// Vercel Serverless Catch-All Entrypoint\nconst app = require('./index.js');\nmodule.exports = app;\nmodule.exports.default = app;\n`
  );

  console.log('[build:api] Successfully generated api/index.js and api/[...path].js');
}

buildApi().catch((err) => {
  console.error('[build:api] Failed to bundle API:', err);
  process.exit(1);
});
