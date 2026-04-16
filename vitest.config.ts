import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
 
      exclude: ['src/tracker/worker.ts', 'src/debug/**'],
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
