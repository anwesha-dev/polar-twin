import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200, // three.js is bundled for the built-in fallback renderer
  },
  server: { port: 5173, open: true },
});
