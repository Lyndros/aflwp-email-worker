import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
    ],
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
        'source/server.ts', // Entrypoint, not unit testable
        'source/types/**', // Type definitions only
        'source/utils/logger.ts', // Logger is tested via usage, complex to unit test
        'source/templates/**', // HTML templates, not TypeScript code
      ],
      thresholds: {
        lines: 80,
        functions: 40,
        branches: 80,
        statements: 80,
      },
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
