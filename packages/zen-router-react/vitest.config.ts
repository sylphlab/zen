import react from '@vitejs/plugin-react'; // Import react plugin
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()], // Add react plugin
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom for React component testing
    setupFiles: './src/setupTests.ts',
    // setupFiles: './src/setupTests.ts', // Removed - file does not exist
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 } // Enforce later
    },
  },
});
