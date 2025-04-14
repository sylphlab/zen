# Active Context: zen Library

## Current Focus
- Planning and implementing performance optimizations (creation, subscribe/unsubscribe).
- Implementing `computed` subscription cleanup.

## Recent Changes
- **Build Tool:** Switched to `tsup`. Build successful.
- **Bundle Size:** Gzipped size (`atom` + basic `computed` via `tsup`) is **406 Bytes** (Reverted `set` optimization to prioritize size over slight `set` speed gain).
- **Benchmarking:**
    - Installed `jotai`, `react`, `@types/react`, `@testing-library/react`, `jsdom`.
    - Updated benchmark file (`src/index.bench.ts`) to include Jotai comparisons and set `jsdom` environment.
    - Ran all checks (`build`, `test`, `bench`, `size`). All tests pass.
    - **Benchmark Analysis (Final - Reverted `set` Opt.):**
        - `zen` excels in raw Get, Set (slightly slower than `for..of` but faster than Nano), Computed Get, and **Computed Update Propagation (fastest)**.
        - `zen` still lags significantly in Atom Creation and Subscribe/Unsubscribe vs competitors. Class refactor improved sub/unsub but hurt creation/size.
        - Current state prioritizes minimal size (406B) and good overall performance.

## Next Steps (Immediate)
1.  ~~Implement Computed Cleanup~~ (Functionality already exists and is tested).
2.  ~~Performance Optimization~~ (Multiple attempts: Class refactor hurt creation/size despite sub/unsub gains. `set` opt. hurt size. Reverted both for best size/perf balance).
3.  ~~Run all checks~~ (Done).
4.  ~~Investigate Size Increase~~ (Reverted `set` optimization, size back to 406B).
5.  Plan further features (`map`, `task`).

## Active Decisions
- Using TypeScript for the library development.
