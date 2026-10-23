import { defineConfig } from 'vite';
import path from 'node:path';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';

const isDesktop = process.env.BUILD_DESKTOP === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(isDesktop
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: [
                      '@libsql/client',
                      '@libsql/core',
                      '@libsql/hrana-client',
                      '@libsql/win32-x64-msvc',
                      'libsql',
                      'better-sqlite3',
                      /^@libsql\//,
                    ],
                  },
                },
              },
            },
            preload: {
              input: path.join(__dirname, 'electron/preload.ts'),
              vite: {
                build: {
                  outDir: 'dist-electron',
                },
              },
            },
          }),
        ]
      : []),
  ],
  server: {
    port: 5173,
    host: true, // Allow access from local network (phones & tablets on Wi-Fi)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
