import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: 'terser',
  terserOptions: {
    compress: {
      passes: 3,
      unsafe: true,
      unsafe_arrows: true,
      unsafe_comps: true,
      unsafe_Function: true,
      unsafe_math: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_regexp: true,
      unsafe_undefined: true,
      pure_getters: true,
      drop_console: true,
      drop_debugger: true,
      reduce_vars: true,
      reduce_funcs: true,
      booleans_as_integers: true,
      typeofs: true,
      ecma: 2020,
    },
    mangle: {
      properties: {
        regex: /^_/, // Mangle private properties
      },
      toplevel: true,
    },
    format: {
      comments: false,
      ecma: 2020,
      wrap_func_args: true,
    },
    module: true,
    toplevel: true,
  },
});
