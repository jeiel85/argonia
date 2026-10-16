import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.ARGONIA_BASE || './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        },
      },
    },
  },
  server: {
    port: 5179,
    host: true,
  },
});
