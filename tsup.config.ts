import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: 'terser',
  terserOptions: {
    compress: {
      passes: 3,
      unused: true,
      dead_code: true, // Remove dead code more aggressively
      conditionals: true, // Optimize if/else chains
      reduce_vars: true, // Reduce variable usage
      booleans: true, // Optimize boolean expressions
      loops: true, // Optimize loops
      if_return: true, // Optimize if/return patterns
      join_vars: true, // Join consecutive var statements
      // Keep console logs for now
      // drop_console: true,
      // pure_funcs: [],
    },
    mangle: {
      // Keep properties safe for now
    },
  },
})
