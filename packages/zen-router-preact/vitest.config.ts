import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite'; // Import preact plugin

export default defineConfig({
  plugins: [preact()], // Add preact plugin
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom for Preact component testing
    setupFiles: './src/setupTests.ts', // Optional: if setup needed
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 } // Enforce later
    },
  },
});
