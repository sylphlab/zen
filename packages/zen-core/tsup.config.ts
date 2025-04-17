import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'], // Point back to src directory
  format: ['esm', 'cjs'],
  dts: true, // Re-enable tsup DTS handling (to bundle declarations from tsc)
  splitting: false,
  sourcemap: false, // Disable sourcemap for production builds
  clean: true,
  minify: 'terser', // Restore minification
  terserOptions: {
    compress: {
      passes: 3, // More aggressive compression passes
      unsafe: true, // Enable unsafe optimizations
      unsafe_arrows: true, // Convert function expressions to arrow functions if possible
      unsafe_comps: true, // Compress expressions with comparisons more aggressively
      unsafe_Function: true, // Optimize Function() calls
      unsafe_math: true, // Optimize numeric expressions
      unsafe_methods: true, // Convert property access to literal values to property dot notation
      unsafe_proto: true, // Optimize prototype access
      unsafe_regexp: true, // Optimize RegExp literal or constructor calls
      unsafe_undefined: true, // Replace `undefined` with `void 0`
      pure_getters: true, // Assume getters are pure
      drop_console: true, // Remove console statements
      drop_debugger: true, // Remove debugger statements
      reduce_vars: true, // Optimize variables
      reduce_funcs: true, // Optimize functions
      booleans_as_integers: true, // Convert boolean literals to 0 and 1
      typeofs: true, // Optimize typeof expressions
      ecma: 2020, // Optimize for ECMAScript 2020
    },
    mangle: {
      properties: {
        regex: /^_/, // Mangle private properties starting with _
      },
      toplevel: true, // Mangle top-level variable and function names
    },
    format: {
      comments: false, // Remove all comments
      ecma: 2020, // Format for ECMAScript 2020
      wrap_func_args: true, // Wrap function arguments in parentheses when possible
    },
    module: true, // Enable module-specific optimizations
    toplevel: true, // Apply optimizations to top-level variables and functions
  },
})
