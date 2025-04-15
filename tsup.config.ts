import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'], // Re-enable CJS
  dts: true,
  splitting: false, // Keep simple
  sourcemap: true, // Re-enable sourcemap
  clean: true,
  minify: 'terser', // Use terser default options initially
  // Removed aggressive terserOptions previously
})
