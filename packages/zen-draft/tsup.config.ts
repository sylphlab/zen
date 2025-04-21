import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true, // Generate .d.ts files
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@sylphlab/zen-core', // Mark workspace dependency as external
  ],
  // Ensure .d.cts for CJS types if needed, tsup handles this well usually
  // esbuildOptions(options) {
  //   options.external = ['@sylphlab/zen-core'];
  // },
});
