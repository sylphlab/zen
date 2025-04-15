import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false, // Keep simple
  sourcemap: true,
  clean: true,
  minify: 'terser', // Use terser default options initially
  // Removed aggressive terserOptions for now
})
