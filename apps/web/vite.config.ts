import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // During local development, proxy API calls to a local Lambda invocation
      // or a deployed Function URL set in VITE_API_URL.
      // This avoids CORS issues in dev without changing production code.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Reasonable chunk size warning threshold for a mapping app
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Leaflet is large — split it out so the main bundle stays small
          leaflet: ['leaflet'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // Expose environment variables explicitly — never use import.meta.env blindly
  envPrefix: 'VITE_',
});
