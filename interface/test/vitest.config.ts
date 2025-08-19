import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*-test.ts', '**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    setupFiles: [],
    reporters: ['verbose'],
    testTimeout: 10000,
  },
}); 