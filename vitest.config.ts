import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    workspace: ['packages/*'],
    // Set default environment for all tests in the workspace
    environment: 'jsdom',
    // Optional: Add other global test configurations here
    // globals: true, // Example if needed
    coverage: {
      provider: 'v8', // Specify the coverage provider
      exclude: [
        '**/*.bench.ts', // Exclude benchmark files
        // Add other exclusions if needed, e.g., config files, types
        '**/types.ts',
        '**/index.ts', // Often just exports, low value to cover
      ],
    },
  },
});
