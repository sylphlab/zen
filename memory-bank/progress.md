# Latest Benchmark & Size Results (Comprehensive Comparison)

## Performance (`vitest bench --run`)

**Atom Creation:**
- `zen`: **21.1M ops/s** (Fastest)
- `zustand (vanilla)`: 19.0M ops/s (1.11x slower)
- `jotai`: 16.2M ops/s (1.30x slower)
- `nanostores`: 2.6M ops/s (7.92x slower)
- `valtio (vanilla)`: 0.4M ops/s (51.29x slower)
- `effector`: 20.3k ops/s (1039x slower)

**Atom Get:**
- `zustand (vanilla)`: **21.7M ops/s** (Fastest)
- `jotai (via hook)`: 21.6M ops/s (~1.00x slower)
- `zen`: 21.6M ops/s (~1.01x slower)
- `effector`: 20.0M ops/s (1.08x slower)
- `valtio (vanilla)`: 17.7M ops/s (1.22x slower)
- `nanostores`: 9.5M ops/s (2.28x slower)

**Atom Set (No Listeners):**
- `zen`: **21.0M ops/s** (Fastest)
- `nanostores`: 12.4M ops/s (1.69x slower)
- `zustand (vanilla)`: 7.6M ops/s (2.76x slower)
- `valtio (vanilla)`: 3.4M ops/s (6.10x slower)
- `effector`: 2.0M ops/s (10.33x slower)
- `jotai (via hook)`: 1.3M ops/s (16.19x slower)

**Atom Subscribe/Unsubscribe:**
- `zen`: **7.2M ops/s** (Fastest)
- `zustand (vanilla)`: 5.8M ops/s (1.25x slower)
- `nanostores`: 2.3M ops/s (3.06x slower)
- `valtio (vanilla)`: 0.4M ops/s (17.17x slower)
- `jotai (store.sub)`: 0.1M ops/s (59.39x slower)
- `effector`: 20.1k ops/s (361.73x slower)

**Computed Creation (1 dependency):**
- `zen`: **18.0M ops/s** (Fastest)
- `jotai`: 16.9M ops/s (1.06x slower)
- `nanostores`: 0.6M ops/s (28.38x slower)
- `effector (derived store)`: 9.3k ops/s (1928x slower)

**Computed Get (1 dependency):**
- `jotai (via hook)`: **22.2M ops/s** (Fastest)
- `zustand (selector)`: 22.1M ops/s (~1.00x slower)
- `zen`: 21.1M ops/s (1.05x slower)
- `effector (derived store)`: 20.1M ops/s (1.11x slower)
- `valtio (getter)`: 16.5M ops/s (1.34x slower)
- `nanostores`: 2.3M ops/s (9.28x slower)

**Computed Update Propagation (1 dependency):**
- `zen`: **15.3M ops/s** (Fastest)
- `zustand (vanilla update + select)`: 8.3M ops/s (1.84x slower)
- `nanostores`: 6.9M ops/s (2.21x slower)
- `valtio (vanilla update + getter)`: 2.5M ops/s (6.00x slower)
- `effector (event + derived read)`: 1.0M ops/s (13.95x slower)
- `jotai (via hook update)`: 0.1M ops/s (101.27x slower)

**Note:** Hook-based benchmarks (Jotai, typical Zustand usage) include React/testing library overhead. Vanilla benchmarks offer a more direct comparison of core mechanics but may not fully reflect real-world usage patterns, especially for derived state where APIs differ significantly.

## Size (`size-limit`, brotlied, core import cost)
- **`jotai`**: 170 B (`{ atom }`) - *Relies heavily on React context/hooks, core `atom` is minimal.*
- **`nanostores`**: 265 B (`{ atom }`)
- **`zustand` (core)**: 461 B (`{ create }`, excluding React)
- **`zen`**: 660 B (`{ atom }`)
- **`valtio`**: 903 B (`{ proxy }`)
- **`effector`**: 5.27 kB (`{ createStore, createEvent }`)
- **`@reduxjs/toolkit`**: 6.99 kB (`{ configureStore, createSlice }`)
- **Analysis**: `zen` (660 B) currently has a larger core import cost than `jotai`, `nanostores`, and `zustand`. Reducing bundle size further, particularly below `nanostores`, remains the primary challenge.

## Extreme Optimizations Applied (Previous Rounds)
1. Direct property access via `this`
2. Removed all Set copying in notification loop
3. Inlined all critical functions
4. Optimized hot paths for maximum speed
5. Maintained type safety while minimizing overhead

## Benchmark Highlights
- Atom creation: 7.81x faster
- Subscribe/unsubscribe: 1.91x faster
- Computed updates: 1.32x faster than Nanostores
- All tests pass with no regressions
