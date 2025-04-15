# Latest Benchmark & Size Results (Post Hybrid Factory Refactor - 2025-04-15)

## Performance (`npm run bench` Results - 2025-04-15 - Post-Hybrid Refactor)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance. Performance partially recovered compared to pure factory.)

**Atom Creation:**
- `zustand (vanilla)`: **~14.0M ops/s** (Fastest)
- `jotai`: ~10.0M ops/s
- `nanostores`: ~2.9M ops/s
- `zen`: ~0.8M ops/s (Still major regression vs prototype, slight regression vs pure factory)
- `valtio (vanilla)`: ~0.2M ops/s
- `effector`: ~14k ops/s (Slowest)

**Atom Get:**
- `jotai (via hook)`: **~18.3M ops/s** (Fastest)
- `zen`: ~18.0M ops/s (Slight recovery vs pure factory, still regression vs prototype)
- `zustand (vanilla)`: ~15.5M ops/s
- `effector`: ~16.6M ops/s
- `valtio (vanilla)`: ~13.7M ops/s
- `nanostores`: ~4.7M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: **~12.6M ops/s** (Fastest, slight regression vs pure factory)
- `nanostores`: ~10.3M ops/s
- `zustand (vanilla)`: ~7.0M ops/s
- `valtio (vanilla)`: ~2.7M ops/s
- `effector`: ~1.8M ops/s
- `jotai (via hook)`: ~1.0M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zustand (vanilla)`: **~3.8M ops/s** (Fastest)
- `nanostores`: ~1.9M ops/s
- `zen`: ~0.9M ops/s (Slight recovery vs pure factory, still major regression vs prototype)
- `valtio (vanilla)`: ~0.4M ops/s
- `jotai (store.sub)`: ~0.08M ops/s
- `effector`: ~14k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `jotai`: **~13.4M ops/s** (Fastest)
- `zen`: ~0.7M ops/s (Slight recovery vs pure factory, still major regression vs prototype)
- `nanostores`: ~0.5M ops/s
- `effector (derived store)`: ~7.2k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.4M ops/s** (Fastest)
- `zustand (selector)`: ~18.0M ops/s
- `zen`: ~16.2M ops/s (Minor recovery vs pure factory, still regression vs prototype)
- `effector (derived store)`: ~15.2M ops/s
- `valtio (getter)`: ~12.8M ops/s
- `nanostores`: ~1.5M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: **~6.8M ops/s** (Fastest, slight regression vs pure factory)
- `zustand (vanilla update + select)`: ~5.8M ops/s
- `nanostores`: ~5.0M ops/s
- `valtio (vanilla update + getter)`: ~1.9M ops/s
- `effector (event + derived read)`: ~0.7M ops/s
- `jotai (via hook update)`: ~0.1M ops/s (Slowest)

**Map Creation:**
- `nanostores`: **~2.6M ops/s** (Fastest)
- `zen`: ~1.0M ops/s (Slight regression vs pure factory)

**Map Get:**
- `zen`: **~16.6M ops/s** (Fastest, regression vs pure factory)
- `nanostores`: ~7.1M ops/s

**Map Set Key (No Listeners):**
- `zen`: **~9.6M ops/s** (Fastest, regression vs pure factory)
- `nanostores`: ~8.3M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: **~10.6M ops/s** (Fastest, regression vs pure factory)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: ~0.7M ops/s (Stable vs pure factory, still regression vs prototype)

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~199 ops/s (Recovered vs pure factory)
- `zen (reject)`: ~163 ops/s (Slight recovery vs pure factory)
- *(Low ops/sec due to async nature, confirms functionality)*

**Performance Analysis (Post-Hybrid Refactor):** Hybrid factory approach provided only marginal performance recovery compared to the pure factory function, and performance remains significantly worse than the original prototype version for critical operations like creation and subscription. The size benefit (215 B) comes at a notable performance cost.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Hybrid Refactor)
- `jotai` (atom): 170 B
- `nanostores` (atom): 265 B (Target)
- **`zen (atom only)`**: **215 B** (**Target Achieved!**)
- `zustand` (core): 461 B
- `valtio`: 903 B
- **`zen (full)`**: **876 B**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Hybrid factory approach maintained the excellent size reduction (215 B), meeting the core size target.

## Features Implemented
- `atom`: Core state container (Minimal - Hybrid Factory).
- `computed`: Derived state (Minimal - Hybrid Factory, adapted).
- `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`: Perf-focused mutable helpers (Untouched by recent optimization, may need review).
- `map` (v1 - Simplified): Object atom with `setKey`.
- `deepMap` (v1 - Simplified): Deeply nested object atom with `setKey`.
- `task`: Async operation state management (Minimal).
- **REMOVED:** Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`).
- **REMOVED:** Key Subscriptions (`subscribeKeys`, `listenKeys`).

## Benchmark Highlights (Post-Hybrid Refactor - 2025-04-15)
- **Size target met!** Core atom is 215 B.
- **Performance partially recovered** compared to pure factory, but still **significant regressions** vs original prototype version, especially creation/subscription.
- Get/Set performance remains acceptable.

## Current Status
- Hybrid Factory Refactor complete (`atom`, `computed`).
- Size target achieved (215 B for atom).
- All tests pass (`npm run test`).
- Benchmarks run (`npm run bench`). Performance partially recovered but still shows significant regressions vs prototype.
- **Decision Point:** Accept the current state (ultra-small size, compromised performance) or revert to the faster prototype version (larger size: 588 B)? Given the project goal is *minimal size*, the current state (215 B) is arguably more aligned, despite the performance trade-off.
- **Next:** Commit hybrid refactor results. Review mutable helpers.

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
10. ~~Further Optimization (v2 - Factory Function Refactor)~~ (Size target met, perf regression)
11. ~~Run Checks & Size (Post-Factory-Refactor)~~
12. ~~Commit Changes~~: Commit factory function refactor.
13. ~~Performance Benchmarking (Post-Factory Refactor)~~.
14. ~~Analyze & Address Performance Regressions~~ (Hybrid factory attempted - minor recovery).
15. **Commit Changes**: Commit hybrid factory refactor and benchmark results.
16. **Review `mutable*` Helpers**: Check if `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom` need adjustments (Lower priority).
17. **Feature Enhancements**: Add basic documentation and usage examples for the minimal API.
18. **(Future)** Consider optional modules for features like events if size permits.
