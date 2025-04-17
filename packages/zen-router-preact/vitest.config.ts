import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Removed deps optimization/inlining - relying on default handling
  },
});
