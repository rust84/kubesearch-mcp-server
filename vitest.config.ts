import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    // Environment
    environment: 'node',

    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '**/*.d.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/index.ts', // Main entry point - integration tested separately
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      all: true,
    },

    // Test behavior
    globals: true, // Enable global test APIs (describe, it, expect, etc.)
    clearMocks: true, // Automatically clear mock calls between tests
    restoreMocks: true, // Restore original implementations after tests
    mockReset: true, // Reset mocks between tests

    // Performance
    isolate: true, // Run tests in isolation (slower but safer)

    // Test timeout
    testTimeout: 10000, // 10 seconds (generous for database operations)
    hookTimeout: 10000,

    // Watch mode
    watch: false,

    // Reporters
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
