# @sylph/core

## 0.1.1

### Patch Changes

- feat: Add router package with basic implementation and tests

  - Implemented core router logic (`$router` store, history handling, route matching).
  - Added React (`useRouter`) integration package with tests.
  - Added Preact (`useRouter`) integration package (tests skipped due to mocking issues).
  - Added comprehensive tests for `@sylph/router` core, achieving >90% coverage.
  - Fixed various bugs in `pathToRegexp` handling optional parameters and root path.
  - Fixed build issues related to declaration files in `@sylph/core`.
  - Updated READMEs for core and router packages with corrected examples and information.
  - Updated all `package.json` files for release readiness (license, author, publishConfig, metadata).
  - Aligned Vitest versions across packages.

## 0.1.0

### Minor Changes

- feat: Restore core features, add docs examples, prepare for release
- f06b156: Prepare packages for potential release:
  - Completed build verification (tests, benchmarks, size checks).
  - Updated package metadata (name, author, repo links) for core and router.
  - Added basic README files for core and router.
  - Corrected size-limit configuration location and values.
