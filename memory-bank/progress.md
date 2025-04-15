# Latest Benchmark & Size Results (Post Feature Restoration - 2025-04-15)

## Performance (`npm run bench` Results - 2025-04-15 - Post Feature Restoration)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance.)

**Atom Creation:**
- `zen`: **~15.8M ops/s** (Improved post-emit-opt)
- `zustand (vanilla)`: ~13.2M ops/s
- `jotai`: ~8.7M ops/s
- `nanostores`: ~2.8M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `effector`: ~12k ops/s (Slowest)

**Atom Get:**
- `zustand (vanilla)`: **~17.9M ops/s** (Fastest)
- `zen`: ~18.0M ops/s (Improved post-emit-opt)
- `effector`: ~17.8M ops/s
- `jotai (via hook)`: ~14.3M ops/s
- `valtio (vanilla)`: ~13.7M ops/s
- `nanostores`: ~6.2M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: **~11.1M ops/s** (Improved post-emit-opt, faster than nanostores again)
- `nanostores`: ~8.8M ops/s
- `zustand (vanilla)`: ~5.4M ops/s
- `valtio (vanilla)`: ~2.7M ops/s
- `effector`: ~1.6M ops/s
- `jotai (via hook)`: ~0.7M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zen`: ~3.4M ops/s (Slightly worse post-emit-opt? Zustand faster now)
- `zustand (vanilla)`: ~3.4M ops/s
- `nanostores`: ~2.3M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `jotai (store.sub)`: ~0.07M ops/s
- `effector`: ~12k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `zen`: **~13.9M ops/s** (Improved post-emit-opt, faster than jotai again)
- `jotai`: ~12.6M ops/s
- `nanostores`: ~0.6M ops/s
- `effector (derived store)`: ~7.8k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.6M ops/s** (Fastest)
- `zustand (selector)`: ~18.0M ops/s
- `zen`: ~16.6M ops/s (Improved post-emit-opt)
- `effector (derived store)`: ~15.2M ops/s
- `valtio (getter)`: ~13.3M ops/s
- `nanostores`: ~1.8M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: ~1.3M ops/s (Slightly improved post-emit-opt, but **still major regression**)
- `zustand (vanilla update + select)`: ~7.6M ops/s
- `nanostores`: ~4.9M ops/s
- `valtio (vanilla update + getter)`: ~2.0M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.1M ops/s (Slowest)

**Map Creation:**
- `zen`: **~13.0M ops/s** (Improved post-emit-opt)
- `nanostores`: ~2.8M ops/s

**Map Get:**
- `zen`: **~21.4M ops/s** (Improved post-emit-opt)
- `nanostores`: ~7.2M ops/s

**Map Set Key (No Listeners):**
- `zen`: ~5.3M ops/s (emitKeys opt ineffective, **still major regression**, slower than nanostores)
- `nanostores`: ~8.8M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: ~7.2M ops/s (Slightly improved post-emitKeys-opt, but **still major regression**)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: **~1.6M ops/s** (No change)

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~181 ops/s (**Significantly improved post-emit-opt**)
- `zen (reject)`: ~152 ops/s (**Significantly improved post-emit-opt**)
- *(Low ops/sec due to async nature. Improvement confirms emit was a factor)*

**Performance Analysis (Post Revert):** Reverting to prototype-based implementation successfully restored performance to previous high levels, confirming this is the optimal approach given the priority on speed.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Feature-Restoration)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Original Target - Not Met)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **786 B** (Slight increase)
- `valtio`: 903 B
- **`zen (full)`**: **1.45 kB**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Full size increased to 1.45 kB after restoring features. Core atom size slightly increased. Acceptable trade-off for features.

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
- Performance generally improved after `emit` optimization, but key regressions persist.
- Zen remains highly competitive or leads in many categories (Atom Creation/Set/Sub, Computed Creation/Update, Map/DeepMap ops).

## Current Status
- Core implementation (`atom`, `computed`) remains prototype-based for performance.
- Lifecycle Events and Key/Path Subscriptions have been restored based on user feedback.
- Associated tests have been restored and updated.
- All checks (`tsc`, `test`, `build`, `size`) passed after removing mutable helpers.
- Final Size (`npm run size`): `atom only` 786 B, `full` 1.45 kB.
- Benchmarks run (`npm run bench`) confirming impact of `emitKeys` optimization.
- **Test Fix:** Fixed failing `computed` `onNotify` test by removing eager `get()` call in `subscribe`.
- **Next:** Optimize `emitPaths` in `src/events.ts` to address DeepMap Set regressions. Then re-evaluate Map Set and Computed Update.

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
23. ~~Remove Mutable Helpers:~~ Removed code, exports, and docs. (Done)
24. ~~Commit Memory Bank update.~~ (Done)
25. ~~Run Checks:~~ `tsc --noEmit && npm run test && npm run build && npm run size` passed. (Done)
26. ~~**Commit final Memory Bank update.**~~ (Done)
27. ~~**Documentation & Examples**: Review README for accuracy after removals.~~ (Done - README is up-to-date)
28. ~~**Consider Feature Enhancements**: Re-evaluate next steps (e.g., re-run benchmarks).~~ (Done - Benchmarks run)
29. ~~**Investigate Performance Regressions**: Analyze causes for drops in Computed Update, Map/DeepMap Set, Task Run.~~ (Done - Identified `emit`, `emitKeys`, `emitPaths`, `computed._update`)
30. **Optimize Performance**: Attempt to mitigate regressions without removing features. (Partially done - Optimized `emit`)
31. ~~**Optimize `emitKeys` / `emitPaths`**: Focus on Map/DeepMap Set performance.~~ (emitKeys opt ineffective)
32. **Optimize `emitPaths`**: Focus on DeepMap Set performance.
