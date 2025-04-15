# Latest Benchmark & Size Results (Post-Optimization)

## Performance (Compared to Previous Version & Competitors)
- **Atom Creation:** `zen` 20.7M ops/s (1.41x faster than Jotai, 8.04x faster than Nanostores)
- **Atom Get:** `zen` 22.4M ops/s (1.04x slower than Jotai, 2.26x faster than Nanostores)
- **Atom Set (No Listeners):** `zen` 21.1M ops/s (1.59x faster than Nanostores, 83.42x faster than Jotai hook)
- **Atom Subscribe/Unsubscribe:** `zen` 8.1M ops/s (3.43x faster than Nanostores, 71.70x faster than Jotai store.sub)
- **Computed Creation (1 dep):** `zen` 18.8M ops/s (1.06x faster than Jotai, 28.86x faster than Nanostores)
- **Computed Get (1 dep):** `zen` 21.6M ops/s (1.08x slower than Jotai, 6.83x faster than Nanostores)
- **Computed Update Propagation (1 dep):** `zen` 16.0M ops/s (1.91x faster than Nanostores, 13.91x faster than Jotai hook)

## Size (`size-limit`, brotlied, core import cost)
- **`jotai`**: 170 B (`{ atom }`)
- **`nanostores`**: 265 B (`{ atom }`)
- **`zustand` (core)**: 461 B (`{ create }`, excluding React)
- **`zen`**: 660 B (`{ atom }`)
- **`valtio`**: 903 B (`{ proxy }`)
- **`effector`**: 5.27 kB (`{ createStore, createEvent }`)
- **`@reduxjs/toolkit`**: 6.99 kB (`{ configureStore, createSlice }`)
- **Note**: `zen` (660 B) is currently larger than `nanostores` (265 B), `jotai` (170 B), and `zustand` (461 B) for the basic core import according to `size-limit` (brotli compressed). Achieving smaller size than `nanostores` remains a core goal.

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
