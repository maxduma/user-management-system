/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs separately; proxying keeps requests same-origin.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Generated for error tracking, but not referenced from the bundle.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // Rarely-changing framework code in its own long-term cacheable chunk.
        manualChunks: { react: ['react', 'react-dom', 'react-router'] },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 85, functions: 80, branches: 75, statements: 85 },
    },
  },
});
