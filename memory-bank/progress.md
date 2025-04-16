# Latest Benchmark & Size Results (Post Final Optimization - 2025-04-16)

## Performance (`npm run bench` Results - 2025-04-16 - Post Final Optimization)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance.)

**Atom Creation:**
- `zen`: **~7.5M ops/s** (Slightly lower than previous run, but still very fast)
- `zustand (vanilla)`: ~6.2M ops/s
- `jotai`: ~5.9M ops/s
- `nanostores`: ~1.0M ops/s
- `valtio (vanilla)`: ~0.15M ops/s
- `effector`: ~6.7k ops/s (Slowest)

**Atom Get:**
- `zen`: **~20.7M ops/s** (Fastest)
- `jotai (via hook)`: ~17.2M ops/s
- `zustand (vanilla)`: ~17.0M ops/s
- `effector`: ~16.4M ops/s
- `valtio (vanilla)`: ~11.6M ops/s
- `nanostores`: ~8.4M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: **~9.0M ops/s** (Fastest)
- `nanostores`: ~7.9M ops/s
- `zustand (vanilla)`: ~4.3M ops/s
- `valtio (vanilla)`: ~2.4M ops/s
- `effector`: ~1.6M ops/s
- `jotai (via hook)`: ~0.67M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zustand (vanilla)`: **~3.1M ops/s** (Fastest)
- `zen`: ~2.8M ops/s
- `nanostores`: ~1.4M ops/s
- `valtio (vanilla)`: ~0.26M ops/s
- `jotai (store.sub)`: ~0.07M ops/s
- `effector`: ~9.2k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `jotai`: **~13.0M ops/s** (Fastest)
- `zen`: ~12.0M ops/s
- `nanostores`: ~0.5M ops/s
- `effector (derived store)`: ~6.5k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.0M ops/s** (Fastest)
- `effector (derived store)`: ~17.4M ops/s
- `zen`: ~17.3M ops/s
- `zustand (selector)`: ~16.6M ops/s
- `valtio (getter)`: ~14.6M ops/s
- `nanostores`: ~2.2M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zustand (vanilla update + select)`: **~5.7M ops/s** (Fastest)
- `zen`: ~4.5M ops/s (Maintains significant improvement)
- `nanostores`: ~4.3M ops/s
- `valtio (vanilla update + getter)`: ~2.1M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.15M ops/s (Slowest)

**DeepMap Creation:**
- `zen`: **~7.5M ops/s** (Fastest)
- `nanostores`: ~2.4M ops/s

**DeepMap setPath (shallow):**
- `zen`: **~9.0M ops/s** (Fastest)
- `nanostores`: ~2.4M ops/s

**DeepMap setPath (1 level deep - name):**
- `zen`: **~6.1M ops/s** (Fastest)
- `nanostores`: ~2.5M ops/s

**DeepMap setPath (2 levels deep - age):**
- `zen`: **~4.8M ops/s** (Fastest)
- `nanostores`: ~2.5M ops/s

**DeepMap setPath (array index):**
- `zen`: **~10.9M ops/s** (Fastest)
- `nanostores`: ~2.2M ops/s

**DeepMap setPath (creating path):**
- `zen`: **~8.3M ops/s** (Fastest)
- `nanostores`: ~2.5M ops/s

**Map Creation:**
- `zen`: **~7.5M ops/s** (Fastest)
- `nanostores`: ~2.4M ops/s

**Map Get:**
- `zen`: **~20.7M ops/s** (Fastest)
- `nanostores`: ~6.4M ops/s

**Map Set Key (No Listeners):**
- `nanostores`: **~10.9M ops/s** (Fastest)
- `zen`: ~9.0M ops/s (Remains close)

**Map Set Full Object (No Listeners):**
- `zen`: **~5.0M ops/s**
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: **~13.5M ops/s**

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~156 ops/s
- `zen (reject)`: ~153 ops/s
- *(Low ops/sec due to async nature. Consistent with previous optimized run)*

**Performance Analysis (Post Final Optimizations):** The final optimizations and test fixes have solidified the library's "monster performance". Zen consistently leads or is highly competitive across almost all benchmarks, especially in core atom operations, deep map manipulations, and computed gets. The computed update propagation remains significantly improved. While Nanostores still edges out Zen slightly in Map Set Key, the overall performance profile is exceptionally strong and surpasses competitors in most areas.

## Size (`size-limit`, brotlied - 2025-04-16 Post-Final-Optimization)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Original Target - Not Met)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **786 B** (Stable)
- `valtio`: 903 B
- **`zen (full)`**: **1.45 kB** (Stable)
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Size remains stable at 1.45 kB after final fixes. This is an acceptable trade-off for the restored features and exceptional performance.

## Features Implemented
- `atom`: Core state container (Optimized Prototype).
- `computed`: Derived state (Optimized Prototype).
- `map`: Object atom with `setKey` and `listenKeys` (Optimized).
- `deepMap`: Deeply nested object atom with `setPath` and `listenPaths` (Optimized).
- `task`: Async operation state management (Optimized).
- Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`). Implemented via `listen` in `src/events.ts`. Integrated into core atoms.
- Key/Path Subscriptions (`listenKeys`, `listenPaths`). Implemented in `src/events.ts`. Integrated into `map`/`deepMap`.

## Benchmark Highlights (Post Final Optimizations - 2025-04-16)
- Performance is excellent across the board after final optimizations and test fixes.
- Zen leads or is top-tier in Atom Creation/Get/Set, Computed Get, all DeepMap operations, Map Creation/Get.
- Computed Update Propagation performance is vastly improved and competitive.
- Map Set Key performance is close to Nanostores.
- All tests pass.

## Current Status
- Core implementation (`atom`, `computed`) uses optimized prototype delegation.
- Lifecycle Events and Key/Path Subscriptions are fully functional and optimized.
- All performance bottlenecks identified previously have been addressed.
- All checks (`tsc`, `test`, `build`, `size`) pass.
- The library achieves "monster performance" while maintaining full features and correctness.

## Known Issues/Next Steps (Refined)
1.  ~~Run Build & Size Checks (Post-Events)~~
2.  ~~Analyze Size Increase (Post-Events)~~
3.  ~~Aggressive Size & Performance Optimization (v1 - Radical Removal)~~
4.  ~~Performance Benchmarking (Post-Events)~~
5.  ~~TODOs in Code~~
6.  ~~Further Optimization (Micro-optimizations v1 & v2)~~
7.  ~~Performance Benchmarking (Post-Micro-Optimization)~~
8.  ~~Analyze Path Forward for Size~~
9.  ~~Commit Changes~~ (Commit micro-optimizations)
10. ~~Further Optimization (v2 - Factory Function Refactor)~~
11. ~~Run Checks & Size (Post-Factory-Refactor)~~
12. ~~Commit Changes~~: Commit factory function refactor.
13. ~~Performance Benchmarking (Post-Factory Refactor)~~
14. ~~Analyze & Address Performance Regressions~~
15. ~~Commit Changes~~: Commit hybrid factory refactor.
16. ~~Revert to Prototype Implementation~~
17. ~~Run Checks & Size (Post-Revert)~~
18. ~~Commit Changes~~: Commit revert to prototype implementation.
19. ~~Review `mutable*` Helpers~~
20. ~~Documentation & Examples~~
21. ~~Commit restored features & Memory Bank updates.~~
22. ~~Run Build & Size checks:~~
23. ~~Remove Mutable Helpers:~~
24. ~~Commit Memory Bank update.~~
25. ~~Run Checks:~~ `tsc --noEmit && npm run test && npm run build && npm run size` passed.
26. ~~**Commit final Memory Bank update.**~~
27. ~~**Documentation & Examples**: Review README for accuracy after removals.~~
28. ~~**Consider Feature Enhancements**: Re-evaluate next steps (e.g., re-run benchmarks).~~
29. ~~**Investigate Performance Regressions**: Analyze causes for drops.~~
30. ~~**Optimize Performance**: Attempt to mitigate regressions.~~
31. ~~**Optimize `emitKeys` / `emitPaths`**: Focus on Map/DeepMap Set performance.~~
32. ~~**Optimize `emitPaths`**: Focus on DeepMap Set performance.~~
33. ~~**Investigate Map `setKey` Performance**: Analyze `map.ts` for bottlenecks.~~
34. ~~**Investigate Computed Update Performance**: Analyze `computed.ts` / `core.ts` for bottlenecks.~~
35. ~~**Fix Failing Tests**: Address issues in `deepMap.test.ts` and `events.test.ts`.~~ (Done)
36. ~~**Run Final Checks**: `npm run test` and `npm run bench`.~~ (Done - All tests pass, benchmarks confirm excellent performance)
37. **Update Memory Bank**: Reflect final optimized state and benchmark results. (This step)
38. **Consider Further Map Optimizations**: Analyze remaining gap with nanostores Map Set Key performance. (Optional)
39. **Consider Packaging Improvements**: Explore options for tree shaking, bundle optimization, or feature flags. (Optional)
40. **Release Planning**: Prepare for next release with performance and feature improvements.
