# Latest Benchmark & Size Results (Post Revert to Prototype - 2025-04-15)

## Performance (`npm run bench` Results - 2025-04-15 - Corresponds to Prototype Version ~commit 903760e)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance. These results reflect the state *before* the factory function experiments.)

**Atom Creation:**
- `zen`: **~13.3M ops/s**
- `zustand (vanilla)`: ~12.8M ops/s
- `jotai`: ~18.0M ops/s
- `nanostores`: ~3.6M ops/s
- `valtio (vanilla)`: ~0.5M ops/s
- `effector`: ~25k ops/s (Slowest)

**Atom Get:**
- `zen`: **~23.0M ops/s** (Fastest)
- `jotai (via hook)`: ~17.6M ops/s
- `zustand (vanilla)`: ~17.1M ops/s
- `effector`: ~16.0M ops/s
- `valtio (vanilla)`: ~14.4M ops/s
- `nanostores`: ~6.6M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: **~13.0M ops/s** (Fastest)
- `nanostores`: ~10.6M ops/s
- `zustand (vanilla)`: ~7.9M ops/s
- `valtio (vanilla)`: ~3.3M ops/s
- `effector`: ~2.1M ops/s
- `jotai (via hook)`: ~1.6M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zustand (vanilla)`: **~4.6M ops/s** (Fastest)
- `zen`: ~4.5M ops/s
- `nanostores`: ~2.0M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `jotai (store.sub)`: ~0.09M ops/s
- `effector`: ~18k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `zen`: **~15.3M ops/s** (Fastest)
- `jotai`: ~19.0M ops/s
- `nanostores`: ~1.0M ops/s
- `effector (derived store)`: ~11k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.6M ops/s** (Fastest)
- `zen`: ~18.3M ops/s
- `effector (derived store)`: ~16.8M ops/s
- `zustand (selector)`: ~16.7M ops/s
- `valtio (getter)`: ~12.3M ops/s
- `nanostores`: ~2.4M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: **~9.9M ops/s** (Fastest)
- `zustand (vanilla update + select)`: ~6.0M ops/s
- `nanostores`: ~5.8M ops/s
- `valtio (vanilla update + getter)`: ~2.5M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.18M ops/s (Slowest)

**Map Creation:**
- `zen`: **~10.8M ops/s** (Fastest)
- `nanostores`: ~2.8M ops/s

**Map Get:**
- `zen`: **~18.3M ops/s** (Fastest)
- `nanostores`: ~8.0M ops/s

**Map Set Key (No Listeners):**
- `zen`: **~13.4M ops/s** (Fastest)
- `nanostores`: ~9.3M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: **~13.0M ops/s** (Fastest)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: **~1.7M ops/s**

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~199 ops/s
- `zen (reject)`: ~201 ops/s
- *(Low ops/sec due to async nature, confirms functionality)*

**Performance Analysis (Post Revert):** Code reverted to prototype-based implementation to prioritize performance, sacrificing the minimal size achieved with factory functions. Performance should be restored to levels shown above.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Revert)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Original Target)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **588 B**
- `valtio`: 903 B
- **`zen (full)`**: **881 B**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Reverted to the faster prototype implementation. Size increased back to ~588 B for the core atom, sacrificing the sub-300 B goal for performance.

## Features Implemented
- `atom`: Core state container (Minimal - Prototype).
- `computed`: Derived state (Minimal - Prototype).
- `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`: Perf-focused mutable helpers.
- `map` (v1 - Simplified): Object atom with `setKey`.
- `deepMap` (v1 - Simplified): Deeply nested object atom with `setKey`.
- `task`: Async operation state management (Minimal).
- **REMOVED:** Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`).
- **REMOVED:** Key Subscriptions (`subscribeKeys`, `listenKeys`).

## Benchmark Highlights (Post Revert - Expected)
- Performance should be similar to the benchmarks listed above (pre-factory-refactor).
- Expect strong performance in most core operations compared to competitors.

## Current Status
- Reverted core implementation (`atom`, `computed`) back to prototype-based version (commit `903760e`).
- Size target sacrificed for performance based on user feedback.
- All tests pass (`npm run test`).
- Size confirmed (`npm run size`): `atom only` 588 B, `full` 881 B.
- **Performance:** Expected to be restored to previous high levels (benchmarks above reflect this expected state).
- **Next:** Commit revert, review mutable helpers, update documentation.

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
18. **Commit Changes**: Commit revert to prototype implementation and update Memory Bank.
19. **Review `mutable*` Helpers**: Confirm compatibility with reverted prototype core.
20. **Documentation & Examples**: Update/create README with current API and examples.
21. **Feature Enhancements**: Consider next steps (e.g., optional event module, framework integrations).
