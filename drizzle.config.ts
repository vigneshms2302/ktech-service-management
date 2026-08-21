import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './electron/db/schema/index.ts',
  out: './electron/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/ktech-dev.sqlite',
  },
});
