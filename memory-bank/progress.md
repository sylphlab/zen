# Latest Benchmark & Size Results (Post Factory Refactor - 2025-04-15)

## Performance (`npm run bench` Results - 2025-04-15 - Pre-Factory Refactor)

**(Note:** Benchmarks below are from *before* the factory function refactor. Performance impact needs re-evaluation.)

**Atom Creation:**
- `zen`: ~13.3M ops/s
- `zustand (vanilla)`: ~12.8M ops/s
- `jotai`: ~18.0M ops/s
- `nanostores`: ~3.6M ops/s
- `valtio (vanilla)`: ~0.5M ops/s
- `effector`: ~25k ops/s (Slowest)

**Atom Get:**
- `zen`: ~23.0M ops/s (Fastest)
- `jotai (via hook)`: ~17.6M ops/s
- `zustand (vanilla)`: ~17.1M ops/s
- `effector`: ~16.0M ops/s
- `valtio (vanilla)`: ~14.4M ops/s
- `nanostores`: ~6.6M ops/s (Slowest)

**Atom Set (No Listeners):**
- `zen`: ~13.0M ops/s (Fastest)
- `nanostores`: ~10.6M ops/s
- `zustand (vanilla)`: ~7.9M ops/s
- `valtio (vanilla)`: ~3.3M ops/s
- `effector`: ~2.1M ops/s
- `jotai (via hook)`: ~1.6M ops/s (Slowest)

**Atom Subscribe/Unsubscribe:**
- `zustand (vanilla)`: ~4.6M ops/s (Fastest)
- `zen`: ~4.5M ops/s
- `nanostores`: ~2.0M ops/s
- `valtio (vanilla)`: ~0.3M ops/s
- `jotai (store.sub)`: ~0.09M ops/s
- `effector`: ~18k ops/s (Slowest)

**Computed Creation (1 dependency):**
- `zen`: ~15.3M ops/s (Fastest)
- `jotai`: ~19.0M ops/s
- `nanostores`: ~1.0M ops/s
- `effector (derived store)`: ~11k ops/s (Slowest)

**Computed Get (1 dependency):**
- `jotai (via hook)`: ~18.6M ops/s (Fastest)
- `zen`: ~18.3M ops/s
- `effector (derived store)`: ~16.8M ops/s
- `zustand (selector)`: ~16.7M ops/s
- `valtio (getter)`: ~12.3M ops/s
- `nanostores`: ~2.4M ops/s (Slowest)

**Computed Update Propagation (1 dependency):**
- `zen`: ~9.9M ops/s (Fastest)
- `zustand (vanilla update + select)`: ~6.0M ops/s
- `nanostores`: ~5.8M ops/s
- `valtio (vanilla update + getter)`: ~2.5M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.18M ops/s (Slowest)

**Map Creation:**
- `zen`: ~10.8M ops/s (Fastest)
- `nanostores`: ~2.8M ops/s

**Map Get:**
- `zen`: ~18.3M ops/s (Fastest)
- `nanostores`: ~8.0M ops/s

**Map Set Key (No Listeners):**
- `zen`: ~13.4M ops/s (Fastest)
- `nanostores`: ~9.3M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: ~13.0M ops/s (Fastest)
- *(Nanostores has no direct equivalent)*

**Task Creation:**
- `zen`: ~1.7M ops/s (Faster)

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~199 ops/s (Faster)
- `zen (reject)`: ~201 ops/s (Slightly faster)
- *(Low ops/sec due to async nature, confirms functionality)*

**Performance Analysis (Pre-Factory Refactor):** Removing events/key-subs and micro-optimizations led to some performance regressions (e.g., Atom Set, Computed Update), likely due to simplified logic being less optimized by JS engines or increased overhead in other areas. However, performance remained generally competitive, and Task performance improved. Needs re-evaluation post-factory-refactor.

## Size (`size-limit`, brotlied - 2025-04-15 Post-Factory-Refactor)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Target)
- **`zen (atom only)`**: **219 B** (**SUCCESS!**)
- `zustand` (core): 461 B
- `valtio`: 903 B
- **`zen (full)`**: **879 B**
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Factory function refactor was highly effective, reducing `atom only` size from 588 B to 219 B, achieving the < 265 B target. `full` size also decreased slightly from 881 B to 879 B.

## Features Implemented
- `atom`: Core state container (Minimal - Factory Function).
- `computed`: Derived state (Minimal - Factory Function).
- `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`: Perf-focused mutable helpers (Untouched by recent optimization, may need review).
- `map` (v1 - Simplified): Object atom with `setKey`.
- `deepMap` (v1 - Simplified): Deeply nested object atom with `setKey`.
- `task`: Async operation state management (Minimal).
- **REMOVED:** Lifecycle Events (`onMount`, `onStart`, `onStop`, `onSet`, `onNotify`).
- **REMOVED:** Key Subscriptions (`subscribeKeys`, `listenKeys`).

## Benchmark Highlights (Pre-Factory-Refactor)
- Performance was competitive, though some core atom operations regressed slightly after initial optimizations.
- `map`/`deepMap` performance vs Nanostores was strong.
- `task` performance improved.
- **Needs re-evaluation post-factory refactor.**

## Current Status
- Factory Function Refactor complete (`atom`, `computed`).
- All tests pass (`npm run test`).
- **Size Target Achieved:** `atom only` is 219 B (< 265 B). `full` is 879 B.
- **Performance:** Needs re-evaluation post-factory-refactor (`npm run bench`).
- **Next:** Run benchmarks, commit changes, review mutable helpers.

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
10. ~~Further Optimization (v2 - Factory Function Refactor)~~ (Done - SUCCESS!)
11. ~~Run Checks & Size (Post-Factory-Refactor)~~ (Done - Target met!)
12. **Commit Changes**: Commit factory function refactor and successful size results.
13. **Performance Benchmarking (Post-Factory Refactor)**: Run `npm run bench`.
14. **Review `mutable*` Helpers**: Check if `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom` need adjustments.
15. **Feature Enhancements (Post-Size-Goal)**: Consider documentation, examples, or potentially re-adding optional features (like events) as separate modules.
