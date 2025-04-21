import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Set default environment for all tests in the workspace
    environment: 'jsdom',
    // Optional: Add other global test configurations here
    // globals: true, // Example if needed
  },
});