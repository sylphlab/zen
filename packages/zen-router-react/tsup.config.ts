import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // Entry point
  format: ['esm', 'cjs'], // Output formats
  dts: true, // Generate .d.ts files
  splitting: false, // Keep things simple for now
  sourcemap: true, // Generate sourcemaps
  clean: true, // Clean output directory before build
  // Add external dependencies if needed, React should be external
  external: ['react', '@sylph/core', '@sylph/router'],
  // Consider adding banner for 'use client' if needed for RSC
  // banner: {
  //   js: "'use client';",
  // },
});