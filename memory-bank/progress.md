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

**Note:** Hook-based benchmarks include React testing overhead. Vanilla benchmarks offer a better core comparison. Effector/Valtio/Zustand derived state patterns differ, making some comparisons less direct.

## Size (`size-limit`, brotlied, `{ atom }` import cost - 2025-04-15)
- `jotai`: 170 B
- `nanostores`: 265 B
- `zustand` (core): 461 B
- **`zen`**: **660 B**
- `valtio`: 903 B
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Analysis**: `{ atom }` import cost remains 660 B. This is misleading as it doesn't reflect the added size of `map`/`task`. Still significantly larger than Nanostores/Jotai core atom. **Accurate full library size measurement is the immediate priority.**

## Features Implemented
- `atom`: Core state container.
- `computed`: Derived state.
- `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom`: Perf-focused mutable helpers.
- `map` (v1): Object atom with `setKey`.
- `deepMap` (v1): Deeply nested object atom with `setKey`.
- `task`: Async operation state management.

## Benchmark Highlights (Post map/task v1)
- `zen` leads or is highly competitive in most core `atom`/`computed` operations (Set, Sub/Unsub, Creation, Update Propagation).
- `zen` `map` operations (Creation, Get, SetKey) are significantly faster than Nanostores `map`.
- Performance profile remains very strong.

## Current Status
- Core features + `map` (v1) + `deepMap` (v1) + `task` implemented and tested.
- All core tests pass (excluding placeholders in `index.test.ts` which now just contain a dummy test).
- **Performance:** Ran benchmarks including grouped `deepMap` vs Nanostores `deepMap`. Zen's `deepMap` operations are significantly faster (**2.9x - 10.2x**) than Nanostores' across all tested scenarios (creation, shallow/deep setKey, array index, path creation). Overall library performance remains strong.
- **Size:** `zen (full)` size including `deepMap` is **953 B** (brotlied). Size reduction remains the **highest priority**, focusing on the core `atom` (660 B).

## Known Issues/Next Steps (Refined)
1.  ~~**Run Build & Size Checks**: Execute `npm run build && npm run size` to get updated size metrics including `deepMap`.~~ (Done - 953 B)
2.  **Analyze Size Increase (Post-`deepMap`)**: `deepMap` itself added minimal or negative size cost (953 B vs 964 B pre-`deepMap`). Focus remains on core `atom` and `computed`.
3.  **Aggressive Size Optimization**: Continue focusing on reducing core (`atom`, `computed`) size. Re-evaluate `deepMap` helpers (`getDeep`, `setDeep`) for potential size savings, although they seem efficient currently. Explore `tsup` minify options. Target < Nanostores `{ atom }` size for the core.
4.  **Performance Benchmarking (Post-`deepMap`)**: ~~Create `deepMap.bench.ts`~~ (Done). Benchmarks including grouped Nanostores comparison executed.
5.  **Feature Enhancements (Post-Optimization)**: Revisit `map`/`deepMap` v2 (`subscribeKey`), documentation, etc., only after achieving size goals.
