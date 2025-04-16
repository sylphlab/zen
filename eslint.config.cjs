// Using .cjs for compatibility
const tseslint = require('typescript-eslint'); // Require the main package for config helper and configs
const eslint = require('@eslint/js');
const globals = require('globals');

// Use the tseslint.config helper and spread recommended configs
module.exports = tseslint.config(
  // Start with ESLint recommended rules
  eslint.configs.recommended,

  // Spread the recommended TypeScript config array(s)
  // This should set up parser, plugins, and recommended rules
  ...tseslint.configs.recommended, // Use the export from the main 'typescript-eslint' package

  // Add specific overrides and rules in a separate object
  {
    files: ['**/*.ts'], // Apply overrides only to TS files
    languageOptions: {
      // Add globals if not covered by recommended configs
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      // Parser options might be needed if not set by recommended configs
      // parserOptions: {
      //   project: ['./tsconfig.base.json', './packages/*/tsconfig.json'], // Add project path back if needed for type-aware rules
      // },
    },
    rules: {
      // Override or add specific rules here.
      // Recommended rules are already included by the spread above.

      // Rules from previous attempts:
      'no-redeclare': 'off', // Base rule disabled (TS version is likely enabled by recommended)
      '@typescript-eslint/no-redeclare': 'error', // Ensure TS version is enabled
      'no-unused-vars': 'off', // Base rule disabled (TS version is likely enabled by recommended)
      '@typescript-eslint/no-unused-vars': [ // Ensure TS version is configured
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Keep as warning
      'no-case-declarations': 'error', // Keep enabled
      'no-undef': 'error', // Keep enabled
      '@typescript-eslint/no-unsafe-function-type': 'warn', // Warn about Function type
      '@typescript-eslint/no-unused-expressions': 'error', // Catch unused expressions
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true, 'ts-check': false }], // Allow ts-ignore
    },
    },
    // Global ignores must come before specific overrides
    {
      ignores: [
      'node_modules/',
      'dist/',
      '.turbo/',
      'packages/*/dist/',
      'packages/*/node_modules/',
      'packages/*/tsconfig.tsbuildinfo',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      '**/*.d.ts',
      'bun.lock',
      'package-lock.json',
      ],
    },
    // Overrides for test and benchmark files (moved to end for higher priority)
    {
      files: ['**/*.test.ts', '**/*.bench.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests/benchmarks
        'no-undef': 'off', // Allow undefined vars (like React in benchmarks)
        '@typescript-eslint/no-unused-expressions': 'off', // Allow unused expressions (common in benchmarks)
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests/benchmarks
        '@typescript-eslint/ban-ts-comment': 'off', // Allow ts-ignore/expect-error in tests
      }
    }
);