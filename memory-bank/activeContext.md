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
- **`deepMap` Helper (v1 Implemented):**
    - Added `src/deepMap.ts` with initial `deepMap` implementation (using `setKey` for deep updates). Relies on a recursive `setDeep` helper for immutable updates.
    - Added tests in `src/deepMap.test.ts`. Required multiple iterations to fix implementation bugs (`get`/`subscribe` were missing due to incorrect extension) and TypeScript errors related to nested optional types in tests (resolved using `@ts-ignore`).
    - Fixed a related test failure in `map.test.ts` regarding setting the same object reference.
    - Exported `deepMap` from `src/index.ts`.
    - Cleaned up placeholder tests in `src/index.test.ts`.
- **Checks:** Ran `npm run test`. All core tests now pass. Ran `npm run build && npm run size`. Build successful.
- **Bundle Size Measurement (Post-`deepMap`):**
    - `zen (atom only)`: **660 B** (No change)
    - `zen (full)`: **953 B** (Slight decrease from 964 B)
    - **Analysis**: The addition of `deepMap` did not increase size, likely due to optimizations in `setDeep` or minor measurement variance. The core `atom` size remains the primary target for optimization.
- **Benchmarking (Post-`deepMap`):**
    - Updated `src/deepMap.bench.ts` to include direct comparisons with Nanostores `deepMap` for each operation type (Creation, shallow/deep setKey, etc.). Grouped benchmarks by operation.
    - Ran `npm run bench`. Zen's `deepMap` significantly outperforms Nanostores (2.9x - 10.2x faster). Updated `progress.md` with detailed comparison results.

## Next Steps (Immediate)
1.  ~~Implement `map` helper (initial version without `subscribeKey`) in a new file `src/map.ts`.~~
2.  ~~Add basic tests for `map` in `src/index.test.ts`.~~ (Moved to `map.test.ts`)
3.  ~~Export `map` from `src/index.ts`.~~
4.  ~~Implement `task` helper in a new file `src/task.ts`.~~
5.  ~~Add basic tests for `task` in `src/index.test.ts`.~~ (Moved to `task.test.ts`, Includes fixing test)
6.  ~~Export `task` from `src/index.ts`.~~
7.  ~~Run build, test, size checks after `task` implementation.~~
8.  ~~**Re-evaluate Bundle Size:** Configure `size-limit` to measure the full library cost.~~ (Done - 964 B initially)
9.  ~~**Performance Benchmarking:** Re-run `npm run bench` to get updated performance numbers.~~ (Done, results in `progress.md`)
10. ~~**Implement `deepMap` Helper (v1):** Create `src/deepMap.ts`, add `setKey`, export, add tests (`src/deepMap.test.ts`), fix implementation/TS errors, fix related `map` test, clean up `index.test.ts`.~~
11. ~~**Run Build & Size Checks (Post-`deepMap`)**: Execute `npm run build && npm run size`.~~ (Done - 953 B)
12. ~~**Add & Run Benchmarks (Post-`deepMap`)**: Create `deepMap.bench.ts`, run `npm run bench`, update `progress.md`.~~ (Done)
13. ~~**Refine Benchmarks & Re-run**: Update `deepMap.bench.ts` to group Zen vs Nanostores, re-run `npm run bench`, update `progress.md`.~~ (Done)
14. **Analyze Size Increase (Post-`deepMap`)**:
    *   `deepMap` and helpers (`getDeep`, `setDeep`) added minimal or negative size impact after minification and optimizations.
    *   **Preliminary Findings**:
        *   Core `atom` (`atom.ts`, parts of `core.ts`) logic likely constitutes the bulk of the 660 B `{ atom }` import cost.
        *   `computed` (`computed.ts`) adds significant logic for dependency tracking and updates.
        *   `map` (`map.ts`) implementation is relatively small, primarily adding `setKey`.
        *   `task` (`task.ts`) adds async handling logic, contributing size but less than core/computed.
        *   Mutable helpers are currently *not* included in the `zen (full)` size measurement.
    *   **Conclusion**: Optimization MUST focus heavily on `atom.ts` and `computed.ts` implementations and potentially build/minification settings to reduce the core 660 B size.
    *   **Conclusion**: Optimization MUST focus heavily on `atom.ts` and `computed.ts` implementations and potentially build/minification settings to reduce the core 660 B size.
15. **Plan & Implement Size Optimizations (Highest Priority)**:
    *   **Review `tsup` config**: Check minify options (`terser` options if used implicitly by `tsup --minify`) for potential improvements (e.g., `mangle`, `compress` options like `passes`, `pure_funcs`).
    *   **Code Review (`atom.ts`, `computed.ts`)**: Look for possibilities to shorten code, reduce helper functions, or use alternative patterns with smaller footprint, without sacrificing significant performance. (e.g., Can `AtomProto` and `ComputedAtomProto` be simplified? Can `subscribe` logic be smaller? Inline small functions?).
    *   **Target**: Aim to drastically reduce the `zen (atom only)` size first, ideally below Nanostores (265 B).
16. **Git Commit:** Commit the `deepMap` implementation including updated benchmarks.
17. **(Next Task)** Begin size optimization focus.

(Steps renumbered)

## Active Decisions
- Using TypeScript for the library development.
- Initial `map` implementation excluded `subscribeKey` for size reasons.
- Tests and benchmarks are now organized by feature (`atom`, `computed`, `map`, `task`).
