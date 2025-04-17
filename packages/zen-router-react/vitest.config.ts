import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom', // Required for testing React hooks/components
    deps: {
      inline: ['react'], // Help Vitest process peer dependency
    },
  },
});
