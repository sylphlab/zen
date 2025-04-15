# Active Context: zen Library

## Current Focus
- Review current state and plan next optimization targets or features.

## Recent Changes
- **Build Tool:** Switched to `tsup`. Build successful.
- **Benchmarking:**
    - Installed `jotai`, `react`, `@types/react`, `@testing-library/react`, `jsdom`.
    - Updated benchmark file (`src/index.bench.ts`) to include Jotai comparisons and set `jsdom` environment.
    - Ran all checks (`build`, `test`, `bench`, `size`). All tests pass. Benchmark results in `progress.md` are based on older code state. Need re-benchmarking.
- **Code Review:** Reviewed optimized core (`atom`, `computed`, `core`) and new mutable helpers (`mutable.ts`). Code structure is stable.
- **`map` Helper (v1 Implemented):**
    - Added `src/map.ts` with initial `map` implementation (no `subscribeKey`).
    - Added basic tests in `src/index.test.ts`.
    - Exported `map` from `src/index.ts`.
- **`task` Helper (v1 Implemented):**
    - Added `src/task.ts` implementing async task state management.
    - Added basic tests in `src/index.test.ts`. Fixed initial test failure related to Promise identity check.
    - Exported `task` from `src/index.ts`.
- **Checks:** Ran `npm run build && npm run test && npm run size` after `task` implementation. All checks passed.
- **Bundle Size Measurement Updated:**
    - Configured `size-limit` in `package.json` to measure both core `atom` and full library imports. Removed invalid JSON comment and duplicate `name` keys.
    - Ran `npm run size`. Results:
        - `zen (atom only)`: **660 B** (brotlied)
        - `zen (full - atom, computed, map, task)`: **964 B** (brotlied)
        - `nanostores (atom only)`: 265 B
        - `nanostores (map)`: 354 B
    - **Analysis**: Full library size is 964 B. Core atom size (660 B) is significantly larger than Nanostores (265 B). Size reduction is the **highest priority**.

## Next Steps (Immediate)
1.  ~~Implement `map` helper (initial version without `subscribeKey`) in a new file `src/map.ts`.~~
2.  ~~Add basic tests for `map` in `src/index.test.ts`.~~
3.  ~~Export `map` from `src/index.ts`.~~
4.  ~~Implement `task` helper in a new file `src/task.ts`.~~
5.  ~~Add basic tests for `task` in `src/index.test.ts`.~~ (Includes fixing test)
6.  ~~Export `task` from `src/index.ts`.~~
7.  ~~Run build, test, size checks after `task` implementation.~~
8.  ~~**Re-evaluate Bundle Size:** Configure `size-limit` to measure the full library cost.~~ (Done)
9.  ~~**Performance Benchmarking:** Re-run `npm run bench` to get updated performance numbers.~~ (Done, results in `progress.md`)
10. **Analyze Size Increase**:
    *   Reviewed `dist/index.js` minified output.
    *   **Preliminary Findings**:
        *   Core `atom` (`atom.ts`, parts of `core.ts`) logic likely constitutes the bulk of the 660 B `{ atom }` import cost.
        *   `computed` (`computed.ts`) adds significant logic for dependency tracking and updates.
        *   `map` (`map.ts`) implementation is relatively small, primarily adding `setKey`.
        *   `task` (`task.ts`) adds async handling logic, contributing size but less than core/computed.
        *   Mutable helpers are currently *not* included in the `zen (full)` size measurement.
    *   **Conclusion**: Optimization should focus heavily on `atom.ts` and `computed.ts` implementations and potentially build/minification settings.
11. **Plan & Implement Size Optimizations**:
    *   **Review `tsup` config**: Check minify options (`terser` options if used implicitly by `tsup --minify`) for potential improvements (e.g., `mangle`, `compress` options).
    *   **Code Review (`atom.ts`, `computed.ts`)**: Look for possibilities to shorten code, reduce helper functions, or use alternative patterns with smaller footprint, without sacrificing significant performance. (e.g., Can `AtomProto` and `ComputedAtomProto` be simplified? Can `subscribe` logic be smaller?)
    *   **Target**: Aim to drastically reduce the `zen (atom only)` size first, ideally below Nanostores (265 B).
12. **Refactor Tests & Benchmarks**: Split `index.test.ts` and `index.bench.ts` into feature-specific files (`atom.test.ts`, `computed.test.ts`, etc.). Completed.

## Active Decisions
- Using TypeScript for the library development.
- Initial `map` implementation excluded `subscribeKey` for size reasons.
- Tests and benchmarks are now organized by feature (`atom`, `computed`, `map`, `task`).
