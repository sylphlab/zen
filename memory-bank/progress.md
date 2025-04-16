# Latest Benchmark & Size Results (Post Patching Refactor - 2025-04-16)

## Refactoring (Remove Patching)
- Modified `core.ts` to integrate event triggers (`onSet`, `onStart`, `onStop`, `onNotify`) directly into prototype methods (`set`, `subscribe`, `_notify`).
- Modified `events.ts` to remove patching logic (`ensurePatched`). Event listener functions now directly manipulate atom properties.
- Modified `batch.ts` to remove global prototype patching. It now uses a `Map` (`batchQueue`) to track atoms changed during a batch and their original values. `core.ts`'s `set` method now checks `isInBatch()` and calls `queueAtomForBatch()` instead of notifying directly when inside a batch.
- Successfully ran `bun run test` after refactoring.

## Benchmark Run (2025-04-16 Post Refactor)
- Successfully ran `bun run bench`.

## Performance (`npm run bench` Results - 2025-04-16 Post Refactor)

**(Note:** Full benchmark output available in execution history. Key observations below.)

**Atom Operations:**
- Core performance remains excellent, comparable to pre-refactor baseline.

**Computed Operations:**
- Performance remains excellent.

**Map/DeepMap Operations:**
- Performance remains excellent.

**Batching:**
- `zen batch` performance is slightly lower than the previous patching implementation but still significantly faster than sequential sets, especially with listeners. This trade-off is acceptable for improved code structure and engine optimization potential.

**Events:**
- Event overhead remains similar.

## Size (`size-limit`, brotlied - 2025-04-16 Post Refactor)
- `jotai` (atom): 170 B (Reference)
- `nanostores` (atom): **265 B** (Reference)
- `zustand` (core): 461 B (Reference)
- **`zen (atom only)`**: **633 B** (Slight increase from 523 B baseline)
- `valtio`: 903 B (Reference)
- **`zen (full)`**: **1.17 kB** (Slight increase from 1.09 kB baseline)
- `effector`: 5.27 kB (Reference)
- `@reduxjs/toolkit`: 6.99 kB (Reference)
- **Size Analysis**: Slight size increase (~100 B) due to integrating event logic directly into core prototypes. This is acceptable given the removal of dynamic patching.

## Features Implemented (Post Refactor)
- `atom` (Factory in `atom.ts`, core logic includes event triggers)
- `computed` (Core logic includes event triggers)
- `map`, `deepMap` (Core logic includes event triggers, key/path listeners via WeakMap)
- `task`
- Lifecycle Events (`onStart`, etc.) - Via direct listener sets.
- Batching (`batch()`) - Via internal queue, no prototype patching.
- Key/Path Subscriptions (`listenKeys`, `listenPaths`).

## Benchmark Highlights (Post Refactor)
- Core `zen` performance remains excellent.
- Dynamic patching successfully removed.
- Code structure simplified and potentially more optimizable by JS engines.

## Current Status
- Refactoring to remove dynamic patching is complete.
- Tests and benchmarks pass.
- Performance is confirmed high, size impact is minimal and acceptable.

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
14. ~~Fix Benchmark Tests (Jotai Overhead, Import Error)~~ (Done)
15. ~~Record Baseline Size~~ (Done: atom 523 B, full 1.09 kB)
16. ~~Refactor Core: Remove Dynamic Patching~~ (Done)
17. ~~Verify Refactoring (Tests, Benchmarks, Size)~~ (Done)
18. **Investigate Size Discrepancy**: Why was the original 1.45 kB measurement different? (Lower priority)
19. **Consider Further Map Optimizations**: Analyze remaining gap with nanostores Map Set Key performance. (Optional)
20. **Consider Packaging Improvements**: Explore options for tree shaking, bundle optimization, or feature flags. (Optional)
21. **Release Planning**: Prepare for next release.