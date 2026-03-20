import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**/*.ts', 'src/utils/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
