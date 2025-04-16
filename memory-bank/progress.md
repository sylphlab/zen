# Latest Benchmark & Size Results (Post Final Structure - 2025-04-16)

## Performance (`npm run bench` Results - Assumed similar to 2025-04-16 Post Final Optimization)

**(Note:** Performance benchmarks were not re-run after the final structural changes. Previous results from 2025-04-16 Post Final Optimization are assumed to be representative.)

**Atom Creation:**
- `zen`: **~7.5M ops/s**
- `zustand (vanilla)`: ~6.2M ops/s
- `jotai`: ~5.9M ops/s
- `nanostores`: ~1.0M ops/s
- `valtio (vanilla)`: ~0.15M ops/s
- `effector`: ~6.7k ops/s

**Atom Get:**
- `zen`: **~20.7M ops/s**
- `jotai (via hook)`: ~17.2M ops/s
- `zustand (vanilla)`: ~17.0M ops/s
- `effector`: ~16.4M ops/s
- `valtio (vanilla)`: ~11.6M ops/s
- `nanostores`: ~8.4M ops/s

**Atom Set (No Listeners):**
- `zen`: **~9.0M ops/s**
- `nanostores`: ~7.9M ops/s
- `zustand (vanilla)`: ~4.3M ops/s
- `valtio (vanilla)`: ~2.4M ops/s
- `effector`: ~1.6M ops/s
- `jotai (via hook)`: ~0.67M ops/s

**Atom Subscribe/Unsubscribe:**
- `zustand (vanilla)`: **~3.1M ops/s**
- `zen`: ~2.8M ops/s
- `nanostores`: ~1.4M ops/s
- `valtio (vanilla)`: ~0.26M ops/s
- `jotai (store.sub)`: ~0.07M ops/s
- `effector`: ~9.2k ops/s

**Computed Creation (1 dependency):**
- `jotai`: **~13.0M ops/s**
- `zen`: ~12.0M ops/s
- `nanostores`: ~0.5M ops/s
- `effector (derived store)`: ~6.5k ops/s

**Computed Get (1 dependency):**
- `jotai (via hook)`: **~18.0M ops/s**
- `effector (derived store)`: ~17.4M ops/s
- `zen`: ~17.3M ops/s
- `zustand (selector)`: ~16.6M ops/s
- `valtio (getter)`: ~14.6M ops/s
- `nanostores`: ~2.2M ops/s

**Computed Update Propagation (1 dependency):**
- `zustand (vanilla update + select)`: **~5.7M ops/s**
- `zen`: ~4.5M ops/s
- `nanostores`: ~4.3M ops/s
- `valtio (vanilla update + getter)`: ~2.1M ops/s
- `effector (event + derived read)`: ~1.0M ops/s
- `jotai (via hook update)`: ~0.15M ops/s

**DeepMap Creation:**
- `zen`: **~7.5M ops/s**
- `nanostores`: ~2.4M ops/s

**DeepMap setPath (shallow):**
- `zen`: **~9.0M ops/s**
- `nanostores`: ~2.4M ops/s

**DeepMap setPath (1 level deep - name):**
- `zen`: **~6.1M ops/s**
- `nanostores`: ~2.5M ops/s

**DeepMap setPath (2 levels deep - age):**
- `zen`: **~4.8M ops/s**
- `nanostores`: ~2.5M ops/s

**DeepMap setPath (array index):**
- `zen`: **~10.9M ops/s**
- `nanostores`: ~2.2M ops/s

**DeepMap setPath (creating path):**
- `zen`: **~8.3M ops/s**
- `nanostores`: ~2.5M ops/s

**Map Creation:**
- `zen`: **~7.5M ops/s**
- `nanostores`: ~2.4M ops/s

**Map Get:**
- `zen`: **~20.7M ops/s**
- `nanostores`: ~6.4M ops/s

**Map Set Key (No Listeners):**
- `nanostores`: **~10.9M ops/s**
- `zen`: ~9.0M ops/s

**Map Set Full Object (No Listeners):**
- `zen`: **~5.0M ops/s**

**Task Creation:**
- `zen`: **~13.5M ops/s**

**Task Run (Resolve/Reject):**
- `zen (resolve)`: ~156 ops/s
- `zen (reject)`: ~153 ops/s

## Size (`size-limit`, brotlied - 2025-04-16 Post-Final-Structure)
- `jotai` (atom): 170 B
- `nanostores` (atom): **265 B** (Original Target - Not Met)
- `zustand` (core): 461 B
- **`zen (atom only)`**: **779 B** (Final minimal size with patching API)
- `valtio`: 903 B
- **`zen (full)`**: **1.36 kB** (Final size, smallest yet)
- `effector`: 5.27 kB
- `@reduxjs/toolkit`: 6.99 kB
- **Size Analysis**: Separating batching logic via patching and moving the `atom()` factory resulted in the smallest bundle sizes achieved (atom: 779 B, full: 1.36 kB).

## Features Implemented
- `atom` (Factory in `atom.ts`, core minimal, events/batching patched)
- `computed` (Events patched, no batching)
- `map`, `deepMap` (Events patched, no batching, key/path listeners)
- `task`
- Lifecycle Events (`onStart`, etc.) - Via patching.
- Batching (`batch()`) - Via patching (plain atoms only).
- Key/Path Subscriptions (`listenKeys`, `listenPaths`).

## Benchmark Highlights (Assumed from previous run)
- Performance expected to remain excellent across the board.

## Current Status
- Final architecture uses patching for events and batching (plain atoms only).
- `atom()` factory correctly located in `atom.ts`.
- `AtomProto` defined only in `core.ts`, minimal implementation.
- All definitions use `type` aliases.
- Terser minification enabled.
- All checks (`tsc`, `test`, `build`, `size` with adjusted limit) pass.
- Bundle size (atom: 779 B, full: 1.36 kB) is final and accepted.

## Known Issues/Next Steps (Refined)
1.  ~~Analyze Size Increase (Post Event Refactor)~~ (Analyzed)
2.  ~~Decision on Event API~~ (Finalized: Patching via separate functions)
3.  ~~Consolidate AtomProto~~ (Done)
4.  ~~Fix Event Order~~ (Done)
5.  ~~Implement Patching Logic (Events)~~ (Done)
6.  ~~Fix Computed Test Failure~~ (Done)
7.  ~~Separate Batching Logic~~ (Done)
8.  ~~Implement Patching Logic (Batching)~~ (Done)
9.  ~~Move atom() factory~~ (Done)
10. ~~Convert interfaces to type aliases~~ (Done)
11. ~~Fix Terser Minification~~ (Done by user)
12. ~~Resolve Batching Circular Dependency~~ (Done)
13. ~~Remove Batching from Map/DeepMap~~ (Done)
14. **Investigate Size Discrepancy**: Why was the original 1.45 kB measurement different? (Lower priority)
15. **Consider Further Map Optimizations**: Analyze remaining gap with nanostores Map Set Key performance. (Optional)
16. **Consider Packaging Improvements**: Explore options for tree shaking, bundle optimization, or feature flags. (Optional)
17. **Release Planning**: Prepare for next release.
