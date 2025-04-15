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
    - **`zen (atom only)`: 602 B** (brotlied) - Significant reduction, but still > 265 B target.
    - **`zen (full)`: 893 B** (brotlied) - Significant reduction.
    - **Analysis:** Radical optimization successful functionally and reduced size considerably. Core `atom` size still needs further aggressive reduction.

## Next Steps (Immediate)
1.  ~~Implement `map` helper (v1).~~
2.  ~~Implement `task` helper (v1).~~
3.  ~~Implement `deepMap` helper (v1) & Add Benchmarks.~~
4.  ~~Implement Lifecycle Events (v1).~~
5.  ~~Implement Key Subscription API (v1 - Simplified).~~
6.  ~~Run checks & benchmarks post-features.~~
7.  ~~**Plan & Implement Optimizations (v1 - Radical Removal)**~~ (Done)
    *   ~~Removed Event System.~~
    *   ~~Removed Key Subscription.~~
    *   ~~Simplified core methods.~~
    *   ~~Fixed resulting type errors and tests.~~
8.  ~~**Git Commit:** Commit key subscription and latest checks.~~ (Done)
9.  **Git Commit:** Commit radical optimization changes.
10. **Further Optimization (Micro-optimizations - Highest Priority)**:
    *   **Re-analyze `src/atom.ts` and `src/core.ts`**: Look for byte-level savings (e.g., variable names, function structures, prototype usage).
    *   **Consider Terser options**: Explore specific Terser flags that might yield better results *now* with the simpler codebase (e.g., `unsafe`, specific mangling).
    *   **Target**: Reduce `zen (atom only)` size as close to 265 B as possible without breaking functionality.
11. **Run Benchmarks:** Re-run `npm run bench` after further optimization to check performance impact.

## Active Decisions
- Using TypeScript for the library development.
- V1 implementations of map/deepMap exclude fine-grained key notification for now.
- Tests and benchmarks organized by feature.
