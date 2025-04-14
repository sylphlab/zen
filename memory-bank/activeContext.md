# Active Context: zen Library

## Current Focus
- Planning and implementing performance optimizations (creation, subscribe/unsubscribe).
- Implementing `computed` subscription cleanup.

## Recent Changes
- **Build Tool:** Switched to `tsup`. Build successful.
- **Bundle Size:** Gzipped size (`atom` + basic `computed` via `tsup`) is now **409 Bytes** (increased from 297 Bytes after `set` optimization). Needs investigation if size is critical.
- **Benchmarking:**
    - Installed `jotai`, `react`, `@types/react`, `@testing-library/react`, `jsdom`.
    - Updated benchmark file (`src/index.bench.ts`) to include Jotai comparisons and set `jsdom` environment.
    - Ran all checks (`build`, `test`, `bench`, `size`). All tests pass.
    - **Benchmark Analysis (After `set` Optimization):**
        - `zen` excels in raw Get/Set (improved), Computed Get, and **Computed Update Propagation (fastest)**.
        - `zen` still lags significantly in Atom Creation (vs Jotai, Nanostores) and Subscribe/Unsubscribe (vs Nanostores).
        - Performance regression remains fixed.

## Next Steps (Immediate)
1.  ~~Implement Computed Cleanup~~ (Functionality already exists and is tested).
2.  ~~Performance Optimization~~ (Attempted `set` optimization - improved speed but increased size). Further optimization on creation/subscribe needed if performance targets aren't met.
3.  ~~Run all checks~~ (Done).
4.  **Investigate Size Increase:** Determine why `set` optimization increased bundle size. Revert if necessary or accept trade-off.
5.  Plan further features (`map`, `task`).

## Active Decisions
- Using TypeScript for the library development.
