import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/**/*.test.js', 'packages/**/*.test.js', 'tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/api/src/**/*.js', 'packages/shared/src/**/*.js'],
      exclude: ['apps/api/src/server.js']
    }
  }
});
