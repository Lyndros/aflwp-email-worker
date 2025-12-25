import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/coverage/**'],
    setupFiles: ['./vitest.setup.ts', './tests/setup/mocks.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'clover'],
      reportsDirectory: './coverage',
      include: ['source/**/*.ts'],
      exclude: [
        'source/**/*.d.ts',
        'tests/**',
        'source/**/node_modules/**',
        'build/**',
        'coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './source'),
      '@tests': path.resolve(__dirname, './tests'),
      '@mocks': path.resolve(__dirname, './tests/mocks'),
    },
  },
});

