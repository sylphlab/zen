import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Optional: Use Vitest globals like describe, it, expect
    environment: 'jsdom', // Use jsdom for browser APIs like history, location
    coverage: {
      provider: 'v8', // Use v8 for coverage
      reporter: ['text', 'json', 'html'], // Report formats
      // thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 } // Enforce later
    },
  },
});
