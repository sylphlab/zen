# Latest Benchmark & Size Results (Post map/task v1)

## Performance (`npm run bench` Results - 2025-04-15)

**(Note:** Ops/sec (hz) can vary between runs. Focus on relative performance.)

**Atom Creation:**
- `zustand (vanilla)`: **~20.9M ops/s** (Fastest)
- `zen`: ~20.2M ops/s (Slightly slower than Zustand)
- `jotai`: ~18.0M ops/s
- `nanostores`: ~3.6M ops/s
- `valtio (vanilla)`: ~0.5M ops/s
- `effector`: ~25k ops/s (Slowest)

**Atom Get:**
- `zen`: **~23.0M ops/s** (Fastest)
- `effector`: ~22.7M ops/s
- `jotai (via hook)`: ~22.7M ops/s
- `zustand (vanilla)`: ~19.3M ops/s
- `valtio (vanilla)`: ~18.4M ops/s
- `nanostores`: ~9.6M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: **~21.6M ops/s** (Fastest)
- `nanostores`: ~15.1M ops/s
- `zustand (vanilla)`: ~7.9M ops/s
- `valtio (vanilla)`: ~3.3M ops/s
- `effector`: ~2.1M ops/s
- `jotai (via hook)`: ~1.6M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zen`: **~9.4M ops/s** (Fastest)
- `zustand (vanilla)`: ~7.5M ops/s
- `nanostores`: ~3.5M ops/s
- `valtio (vanilla)`: ~0.5M ops/s
- `jotai (store.sub)`: ~0.15M ops/s
- `effector`: ~22k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `zen`: **~19.4M ops/s** (Fastest)
- `jotai`: ~19.0M ops/s
- `nanostores`: ~1.0M ops/s
- `effector (derived store)`: ~11k ops/s (Slowest)

**Computed Get (1 dependency):**
- `zustand (selector)`: **~24.6M ops/s** (Fastest)
- `zen`: ~24.1M ops/s
- `effector (derived store)`: ~23.6M ops/s
- `jotai (via hook)`: ~21.1M ops/s
- `valtio (getter)`: ~19.0M ops/s
- `nanostores`: ~3.7M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: **~12.5M ops/s** (Fastest)
- `zustand (vanilla update + select)`: ~9.0M ops/s
- `nanostores`: ~8.2M ops/s
- `valtio (vanilla update + getter)`: ~2.5M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.18M ops/s (Slowest)

**Map Creation:**
- `zen`: **~11.3M ops/s** (Fastest)
- `nanostores`: ~2.2M ops/s (Significantly slower)

**Map Get:**
- `zen`: **~19.7M ops/s** (Fastest)
- `nanostores`: ~7.3M ops/s (Significantly slower)

**Map Set Key (No Listeners):**
- `zen`: **~14.9M ops/s** (Fastest)
- `nanostores`: ~10.5M ops/s (Slower)

**Map Set Full Object (No Listeners):**
- `zen`: **~15.9M ops/s** (Fastest)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: **~1.3M ops/s** (Fast, no direct comparisons)

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~119 ops/s
- `zen (reject)`: ~190 ops/s
- *(Low ops/sec due to async nature, confirms functionality)*

**Note:** Benchmarks below are from *before* the radical optimization. Performance impact needs re-evaluation.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Optimization-v1)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Target)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **602 B**
- `valtio`: 903 B
- **`zen (full)`**: **893 B**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Analysis**: Radical optimization (removing events/key-subs) significantly reduced size (`atom`: ~1.28kB -> 602B, `full`: ~1.36kB -> 893B). However, core `atom` size is still more than double the Nanostores target. Further micro-optimization is critical.

## Features Implemented
- `atom`: Core state container (Simplified).
- `computed`: Derived state (Simplified).
- `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`: Perf-focused mutable helpers (Untouched by recent optimization, may need review).
- `map` (v1 - Simplified): Object atom with `setKey`.
- `deepMap` (v1 - Simplified): Deeply nested object atom with `setKey`.
- `task`: Async operation state management (Simplified internal usage).
- **REMOVED:** Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`).
- **REMOVED:** Key Subscriptions (`subscribeKeys`, `listenKeys`).

## Benchmark Highlights (Pre-Optimization - Needs Re-run)
- `zen` led or was competitive in most core `atom`/`computed` operations.
- `zen` `map` operations were faster than Nanostores.
- **Expectation:** Performance *might* have improved slightly due to simpler code paths, but needs verification.

## Current Status
- Radical Optimization v1 complete: Event system and Key Subscription system removed.
- Core (`atom`, `computed`, `core`) and helpers (`map`, `deepMap`, `task`) simplified.
- Related helper files (`events.ts`, `keys.ts`) emptied.
- All tests pass (`npm run test`).
- **Performance:** Needs re-evaluation post-optimization (`npm run bench`).
- **Size:** Significantly reduced but core `atom` (602 B) still exceeds target (265 B).
- **Next:** Focus on micro-optimizations for `atom`/`core` to further reduce size.

## Known Issues/Next Steps (Refined)
1.  ~~**Run Build & Size Checks (Post-Events)**~~
2.  ~~**Analyze Size Increase (Post-Events)**~~
3.  ~~**Aggressive Size & Performance Optimization (v1 - Radical Removal)**~~ (Done)
4.  ~~**Performance Benchmarking (Post-Events)**~~ (Results noted, but now outdated).
5.  ~~**TODOs in Code**: Implement `onMount`/`onStop` debounce. Handle `oldValue`/`payload` in `_notifyBatch`.~~ (Removed by optimization).
6.  **Further Optimization (Micro-optimizations)**: Focus on `src/atom.ts` and `src/core.ts` for byte-level savings. Investigate Terser options.
7.  **Performance Benchmarking (Post-Micro-Optimization)**: Run `npm run bench`.
8.  **Feature Enhancements (Post-Size-Goal)**: Revisit advanced features only after achieving size targets.
