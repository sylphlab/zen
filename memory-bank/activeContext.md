# Active Context: zen Library

## Current Focus
- Begin size and performance optimization phase.

## Recent Changes
- **Build Tool:** Switched to `tsup`.
- **Benchmarking Setup:** Installed necessary dependencies for comparisons.
- **Core Features Implemented:** `atom`, `computed`, `map` (v1), `task` (v1), `deepMap` (v1).
- **Mutable Helpers Added:** `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`.
- **Lifecycle Events (v1):** Implemented `onMount`, `onStart`, `onStop`, `onSet`, `onNotify` APIs and core logic. Fixed related bugs.
- **Key Subscription API (v1 - Simplified):** Implemented `subscribeKeys`, `listenKeys` APIs using a simplified approach (checks all changes).
- **Testing:** All feature tests pass (`npm run test`). Benchmarks cover core features, map, deepMap, task. `deepMap` benchmarks include Nanostores comparison showing significant performance advantage for Zen.
- **Radical Optimization (v1):**
    - Removed Event System (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`) from `atom`, `computed`, `core`.
    - Removed Key Subscription system (`subscribeKeys`, `listenKeys`) from `atom`, `map`, `deepMap`, `core`, `keys`.
    - Simplified `set` and `_notify` methods in `atom`, `computed`, `map`, `deepMap`.
    - Simplified batching logic in `atom`.
    - Emptied `src/events.ts` and `src/keys.ts`.
    - Updated and fixed related tests (`events.test.ts` emptied, others adjusted).
- **Checks & Size Measurement (Post-Radical-Optimization):**
    - Ran `npx tsc --noEmit`: Passed.
    - Ran `npm run test`: All tests passed.
    - Ran `npm run build && npm run size`: Build successful.
    - **`zen (atom only)`: 588 B** (brotlied) - Post micro-optimization v2. Still > 265 B target.
    - **`zen (full)`: 881 B** (brotlied) - Post micro-optimization v2.
    - **Analysis:** Micro-optimizations provided minor gains. Factory function refactor needed.
- **Factory Function Refactor (Optimization v2):**
    - Refactored `atom` and `computed` from prototype-based to factory function pattern with closures.
    - Fixed resulting type errors and tests.
- **Checks & Size Measurement (Post-Factory-Refactor):**
    - Ran `npx tsc --noEmit`: Passed.
    - Ran `npm run test`: All tests passed.
    - Ran `npm run build && npm run size`: Build successful.
    - **`zen (atom only)`: 219 B** (brotlied) - **SUCCESS! Below 265 B target.**
    - **`zen (full)`: 879 B** (brotlied) - Further reduction.
    - **Analysis:** Factory function pattern was highly effective for size reduction, achieving the core goal.

## Next Steps (Immediate)
1.  ~~Implement `map` helper (v1).~~
2.  ~~Implement `task` helper (v1).~~
3.  ~~Implement `deepMap` helper (v1) & Add Benchmarks.~~
4.  ~~Implement Lifecycle Events (v1).~~ (Removed)
5.  ~~Implement Key Subscription API (v1 - Simplified).~~ (Removed)
6.  ~~Run checks & benchmarks post-features.~~
7.  ~~**Plan & Implement Optimizations (v1 - Radical Removal)**~~
8.  ~~**Git Commit:** Commit key subscription and latest checks.~~
9.  ~~**Git Commit:** Commit radical optimization changes.~~
10. ~~**Further Optimization (Micro-optimizations v1 & v2)**~~ (Done - minimal impact).
11. ~~**Run Benchmarks:** Re-run `npm run bench` after micro-optimizations.~~ (Done - mostly stable).
12. ~~**Further Optimization (v2 - Factory Function Refactor)**~~ (Done - SUCCESS!).
13. **Git Commit:** Commit factory function refactor and successful size results.
14. **Performance Benchmarking (Post-Factory Refactor):** Run `npm run bench` to assess performance impact of factory pattern.
15. **Review `mutable*` Helpers**: Check if `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom` need adjustments after core changes.
16. **Feature Enhancements (Post-Size-Goal)**: Consider next steps like documentation or revisiting optional features.

## Active Decisions
- Using TypeScript for the library development.
- V1 implementations of map/deepMap exclude fine-grained key notification.
- Tests and benchmarks organized by feature.
+ **Decision:** Removed event system and key subscription entirely to prioritize core size.
+ **Decision:** Switched from prototype-based `atom`/`computed` to factory function pattern for significant size reduction.
