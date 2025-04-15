import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true, // Re-enable sourcemap
  clean: true,
  minify: 'terser',
  terserOptions: {
    compress: {
      passes: 2, // Extra compression passes
      unsafe: true, // Enable unsafe optimizations
      // sequences: false, // Sometimes disabling sequences helps (try later if needed)
    },
    mangle: {
      properties: {
        regex: /^_/, // Mangle private properties starting with _
      },
    },
  },
})
