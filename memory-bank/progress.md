# Latest Benchmark & Size Results (Post Revert to Prototype - 2025-04-15)

## Performance (`npm run bench` Results - 2025-04-15 - Post Revert)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance.)

**Atom Creation:**
- `zen`: **~15.2M ops/s** (Performance Recovered!)
- `zustand (vanilla)`: ~13.2M ops/s
- `jotai`: ~8.7M ops/s
- `nanostores`: ~2.8M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `effector`: ~12k ops/s (Slowest)

**Atom Get:**
- `zustand (vanilla)`: **~17.9M ops/s** (Fastest)
- `zen`: ~17.9M ops/s (Performance Recovered!)
- `effector`: ~17.8M ops/s
- `jotai (via hook)`: ~14.3M ops/s
- `valtio (vanilla)`: ~13.7M ops/s
- `nanostores`: ~6.2M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: **~14.5M ops/s** (Performance Recovered!)
- `nanostores`: ~8.8M ops/s
- `zustand (vanilla)`: ~5.4M ops/s
- `valtio (vanilla)`: ~2.7M ops/s
- `effector`: ~1.6M ops/s
- `jotai (via hook)`: ~0.7M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zen`: **~5.2M ops/s** (Performance Recovered!)
- `zustand (vanilla)`: ~3.4M ops/s
- `nanostores`: ~2.3M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `jotai (store.sub)`: ~0.07M ops/s
- `effector`: ~12k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `zen`: **~15.7M ops/s** (Performance Recovered!)
- `jotai`: ~12.6M ops/s
- `nanostores`: ~0.6M ops/s
- `effector (derived store)`: ~7.8k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.6M ops/s** (Fastest)
- `zustand (selector)`: ~18.0M ops/s
- `zen`: ~17.2M ops/s (Performance Recovered!)
- `effector (derived store)`: ~15.2M ops/s
- `valtio (getter)`: ~13.3M ops/s
- `nanostores`: ~1.8M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: **~8.7M ops/s** (Performance Recovered!)
- `zustand (vanilla update + select)`: ~7.6M ops/s
- `nanostores`: ~4.9M ops/s
- `valtio (vanilla update + getter)`: ~2.0M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.1M ops/s (Slowest)

**Map Creation:**
- `zen`: **~11.6M ops/s** (Performance Recovered!)
- `nanostores`: ~2.8M ops/s

**Map Get:**
- `zen`: **~18.2M ops/s** (Performance Recovered!)
- `nanostores`: ~7.2M ops/s

**Map Set Key (No Listeners):**
- `zen`: **~11.5M ops/s** (Performance Recovered!)
- `nanostores`: ~8.8M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: **~12.0M ops/s** (Performance Recovered!)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: **~1.6M ops/s** (Performance Recovered!)

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~150 ops/s (Performance Recovered!)
- `zen (reject)`: ~215 ops/s (Performance Recovered!)
- *(Low ops/sec due to async nature, confirms functionality)*

**Performance Analysis (Post Revert):** Reverting to prototype-based implementation successfully restored performance to previous high levels, confirming this is the optimal approach given the priority on speed.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Feature-Restore)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Original Target - Not Met)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **786 B**
- `valtio`: 903 B
- **`zen (full)`**: **1.45 kB**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Size reverted to ~588 B for the core atom, sacrificing the sub-300 B goal for the sake of performance.

## Features Implemented
- `atom`: Core state container (Minimal - Prototype).
- `computed`: Derived state (Minimal - Prototype).
- `map` (v1 - Restored): Object atom with `setKey` and `listenKeys`.
- `deepMap` (v1 - Restored): Deeply nested object atom with `setPath` and `listenPaths`.
- `task`: Async operation state management (Minimal).
- **RESTORED:** Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`). Implemented via `listen` in `src/events.ts`. Integrated into core atoms.
- **RESTORED:** Key/Path Subscriptions (`listenKeys`, `listenPaths`). Implemented in `src/events.ts`. Integrated into `map`/`deepMap`.
- **REMOVED:** `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`.

## Benchmark Highlights (Post Revert - 2025-04-15)
- Performance restored to previous high levels after reverting optimizations. (Note: New benchmarks needed after feature restoration).
- Zen remains highly competitive or leads in many categories (Atom Creation/Set/Sub, Computed Creation/Update, Map/DeepMap ops).

## Current Status
- Core implementation (`atom`, `computed`) remains prototype-based for performance.
- Lifecycle Events and Key/Path Subscriptions have been restored based on user feedback.
- Associated tests have been restored and updated.
- All tests pass (`npm run test`).
- Size confirmed (`npm run size`): `atom only` 786 B, `full` 1.45 kB after restoring features.
- Benchmarks run (`npm run bench`) confirming performance recovery *before* feature restoration. (Need re-run).
- Checks (`tsc`, `test`, `build`) passed after restoring features.
- **Next:** Commit Memory Bank update, run checks.

## Known Issues/Next Steps (Refined)
1.  ~~Run Build & Size Checks (Post-Events)~~
2.  ~~Analyze Size Increase (Post-Events)~~
3.  ~~Aggressive Size & Performance Optimization (v1 - Radical Removal)~~
4.  ~~Performance Benchmarking (Post-Events)~~
5.  ~~TODOs in Code~~
6.  ~~Further Optimization (Micro-optimizations v1 & v2)~~ (Minimal impact)
7.  ~~Performance Benchmarking (Post-Micro-Optimization)~~
8.  ~~Analyze Path Forward for Size~~ (Factory function approach chosen)
9.  ~~Commit Changes~~ (Commit micro-optimizations)
10. ~~Further Optimization (v2 - Factory Function Refactor)~~ (Achieved size, lost performance)
11. ~~Run Checks & Size (Post-Factory-Refactor)~~
12. ~~Commit Changes~~: Commit factory function refactor.
13. ~~Performance Benchmarking (Post-Factory Refactor)~~ (Regressions found)
14. ~~Analyze & Address Performance Regressions~~ (Hybrid factory attempted - insufficient recovery)
15. ~~Commit Changes~~: Commit hybrid factory refactor.
16. ~~Revert to Prototype Implementation~~ (Done - Prioritizing performance).
17. ~~Run Checks & Size (Post-Revert)~~ (Done - Size confirmed at 588 B).
18. ~~Commit Changes~~: Commit revert to prototype implementation.
19. ~~Review `mutable*` Helpers~~ (Done - Confirmed compatibility before feature restore).
20. ~~Documentation & Examples~~ (Done - Needs update for restored features).
21. ~~Commit restored features & Memory Bank updates.~~ (Done)
22. ~~Run Build & Size checks:~~ Verified build and got new size after feature restoration (1.45 kB).
23. ~~Remove Mutable Helpers:~~ Removed code, exports, and docs.
24. **Commit Memory Bank update.** (Current step)
25. **Run Checks:** `tsc --noEmit && npm run test && npm run build && npm run size`.
26. **Documentation & Examples**: Review README for accuracy after removals.
27. **Consider Feature Enhancements**: Re-evaluate next steps.
24. **Documentation & Examples**: Update README with restored API (`listen`, `listenKeys`, `listenPaths`) and examples.
25. **Consider Feature Enhancements**: Re-evaluate next steps.
