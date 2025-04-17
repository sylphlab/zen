import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true, // Using globals for convenience (describe, it, expect)
    environment: 'jsdom' // Add if DOM APIs are needed later
  },
});