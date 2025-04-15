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
- **Checks & Size Measurement (Post-Keys):**
    - Ran `npm run test`: All tests passed.
    - Ran `npm run build && npm run size` (with optimized tsup config): Build successful.
    - **`zen (atom only)`: 1.05 kB** (brotlied) - Exceeds 1kB limit. Increase is mainly due to event system.
    - **`zen (full)`: 1.36 kB** (brotlied) - Increased due to events and key subscription logic.
    - **Analysis:** Event system significantly impacted size and performance. Key subscription added further size. Optimization is critical.

## Next Steps (Immediate)
1.  ~~Implement `map` helper (v1).~~
2.  ~~Implement `task` helper (v1).~~
3.  ~~Implement `deepMap` helper (v1) & Add Benchmarks.~~
4.  ~~Implement Lifecycle Events (v1).~~
5.  ~~Implement Key Subscription API (v1 - Simplified).~~
6.  ~~Run checks & benchmarks post-features.~~ (Done)
7.  **Plan & Implement Optimizations (Size & Performance - Highest Priority)**:
    *   **Review `tsup` config**: Revert aggressive compression changes as they didn't help size significantly. Consider simpler config.
    *   **Code Review (Core & Events & Keys)**: Aggressively look for simplification opportunities. Focus on `atom.ts`, `computed.ts`, `events.ts`.
    *   **Target**: Drastically reduce `zen (atom only)` size (goal < 265 B) and recover performance.
8.  **Git Commit:** Commit key subscription and latest checks.
9.  **(Next Task)** Begin optimization focus.

## Active Decisions
- Using TypeScript for the library development.
- V1 implementations of map/deepMap exclude fine-grained key notification for now.
- Tests and benchmarks organized by feature.
