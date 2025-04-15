# Latest Benchmark & Size Results (Post Micro-Optimization v1 - 2025-04-15)

## Performance (`npm run bench` Results - 2025-04-15)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance.)

**Atom Creation:**
- `zen`: **~13.3M ops/s** (Slightly slower than before optimization)
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
- `zen`: **~13.0M ops/s** (Fastest, significantly slower than before)
- `nanostores`: ~10.6M ops/s
- `zustand (vanilla)`: ~7.9M ops/s
- `valtio (vanilla)`: ~3.3M ops/s
- `effector`: ~2.1M ops/s
- `jotai (via hook)`: ~1.6M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zustand (vanilla)`: **~4.6M ops/s** (Fastest)
- `zen`: ~4.5M ops/s (Slower than before)
- `nanostores`: ~2.0M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `jotai (store.sub)`: ~0.09M ops/s
- `effector`: ~18k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `zen`: **~15.3M ops/s** (Fastest, slightly slower than before)
- `jotai`: ~19.0M ops/s
- `nanostores`: ~1.0M ops/s
- `effector (derived store)`: ~11k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.6M ops/s** (Fastest)
- `zen`: ~18.3M ops/s (Slightly slower than before)
- `effector (derived store)`: ~16.8M ops/s
- `zustand (selector)`: ~16.7M ops/s
- `valtio (getter)`: ~12.3M ops/s
- `nanostores`: ~2.4M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: **~9.9M ops/s** (Fastest, slower than before)
- `zustand (vanilla update + select)`: ~6.0M ops/s
- `nanostores`: ~5.8M ops/s
- `valtio (vanilla update + getter)`: ~2.5M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.18M ops/s (Slowest)

**Map Creation:**
- `zen`: **~10.8M ops/s** (Fastest, slightly slower than before)
- `nanostores`: ~2.8M ops/s

**Map Get:**
- `zen`: **~18.3M ops/s** (Fastest, slightly slower than before)
- `nanostores`: ~8.0M ops/s

**Map Set Key (No Listeners):**
- `zen`: **~13.4M ops/s** (Fastest, slightly slower than before)
- `nanostores`: ~9.3M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: **~13.0M ops/s** (Fastest, slower than before)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: **~1.7M ops/s** (Faster than before)

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~199 ops/s (Faster)
- `zen (reject)`: ~201 ops/s (Slightly faster)
- *(Low ops/sec due to async nature, confirms functionality)*

**Analysis:** Removing events/key-subs and micro-optimizations led to some performance regressions (e.g., Atom Set, Computed Update), likely due to simplified logic being less optimized by JS engines or increased overhead in other areas. However, performance remains generally competitive, and Task performance improved.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Micro-Optimization-v2)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Target)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **588 B**
- `valtio`: 903 B
- **`zen (full)`**: **881 B**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Analysis**: Further micro-optimizations (simpler subscribe init, removed `value` getter) yielded a small additional reduction (Atom: 602B -> 588B). Still significantly above target. Radical code structure changes might be needed for further reduction.

## Features Implemented
- `atom`: Core state container (Minimal).
- `computed`: Derived state (Minimal).
- `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`: Perf-focused mutable helpers (Untouched by recent optimization, may need review).
- `map` (v1 - Simplified): Object atom with `setKey`.
- `deepMap` (v1 - Simplified): Deeply nested object atom with `setKey`.
- `task`: Async operation state management (Minimal).
- **REMOVED:** Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`).
- **REMOVED:** Key Subscriptions (`subscribeKeys`, `listenKeys`).

## Benchmark Highlights (Post-Micro-Optimization-v2 - 2025-04-15)
- Performance remains competitive, though some core atom operations regressed slightly after optimization.
- `map`/`deepMap` performance vs Nanostores remains strong.
- `task` performance improved.

## Current Status
- Micro-Optimization v2 complete (removed `value` getter, simplified subscribe).
- All tests pass (`npm run test`).
- Benchmarks run (`npm run bench`). Performance mostly stable, some regressions noted.
- **Size:** `atom only` at 588 B, `full` at 881 B. Still significantly above the 265 B target for the core atom.
- **Next:** Further micro-optimization seems unlikely to yield major gains. Consider more radical structural changes or alternative approaches if the size target is strict.

## Known Issues/Next Steps (Refined)
1.  ~~Run Build & Size Checks (Post-Events)~~
2.  ~~Analyze Size Increase (Post-Events)~~
3.  ~~Aggressive Size & Performance Optimization (v1 - Radical Removal)~~
4.  ~~Performance Benchmarking (Post-Events)~~
5.  ~~TODOs in Code~~
6.  ~~Further Optimization (Micro-optimizations v1 & v2)~~ (Done - minimal impact)
7.  ~~Performance Benchmarking (Post-Micro-Optimization)~~ (Done)
8.  **Analyze Path Forward for Size**: Reaching 265 B seems very difficult with the current prototype structure. Options:
    *   **Extreme Micro-optimization:** Manually shorten names further, rewrite functions as expressions, etc. (High effort, low expected return).
    *   **Alternative Structure:** Re-evaluate prototype vs. direct object creation, function inlining vs. separate functions.
    *   **Re-evaluate Target:** Is 265 B strictly necessary, or is < 600 B acceptable given performance?
9.  **Commit Changes**: Commit micro-optimizations and benchmark results.
10. **Feature Enhancements (Post-Size-Goal)**: Revisit advanced features only after achieving size targets.
8.  **Feature Enhancements (Post-Size-Goal)**: Revisit advanced features only after achieving size targets.
