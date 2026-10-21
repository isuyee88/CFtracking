import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Backend modules import each other through the `@/` alias declared in
  // tsconfig; vitest does not read tsconfig paths, so declare it here.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'test/frontend-*.test.ts'],
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
