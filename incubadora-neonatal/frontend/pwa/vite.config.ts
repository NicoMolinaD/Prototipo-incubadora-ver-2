// vite.config.ts
import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // dirección de tu backend
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/api'), // conserva el prefijo /api/incubadora
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});


