import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.test.js',
        '**/*.spec.js',
        'test/**',
        'scripts/**',
        'vitest.config.js'
      ]
    },
    include: ['test/**/*.test.js', 'test/**/*.spec.js'],
    testTimeout: 10000,
    hookTimeout: 10000
  }
});