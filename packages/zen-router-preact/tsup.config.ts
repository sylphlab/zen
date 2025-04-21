import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // Entry point
  format: ['esm', 'cjs'], // Output formats
  dts: true, // Generate .d.ts files
  splitting: false, // Keep things simple for now
  sourcemap: true, // Generate sourcemaps
  clean: true, // Clean output directory before build
  // Add external dependencies
  external: ['preact', '@sylph/core', '@sylph/router'],
  // Preact doesn't typically need 'use client' banner like React Server Components
});
