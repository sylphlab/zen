# Latest Benchmark & Size Results (Post Object Literal Refactor - 2025-04-16)

## Refactoring (Remove Patching)
- Modified `core.ts` to integrate event triggers directly into prototype methods.
- Modified `events.ts` to remove patching logic.
- Modified `batch.ts` to use an internal queue instead of global prototype patching.

## Refactoring (Object Literal Creation)
- Modified `atom.ts` and `computed.ts` factory functions to use object literals instead of `Object.create()`, copying methods from the prototype directly onto the instance.
- Successfully ran `bun run test` after refactoring.

## Benchmark Run (2025-04-16 Post Object Literal Refactor)
- Successfully ran `bun run bench`.

## Performance (`npm run bench` Results - 2025-04-16 Post Object Literal Refactor)

**(Note:** Full benchmark output available in execution history. Key observations below.)

**Atom/Computed Creation:**
- **Significant Improvement:** Creation speed increased substantially (closer to Jotai) compared to the `Object.create()` approach, confirming V8's preference for object literals with stable shapes.

**Other Operations (Get/Set/Subscribe/Update/Batching):**
- Performance remains largely unchanged, still excellent.

## Size (`size-limit`, brotlied - 2025-04-16 Post Object Literal Refactor)
- `jotai` (atom): 170 B (Reference)
- `nanostores` (atom): **265 B** (Reference)
- `zustand` (core): 461 B (Reference)
- **`zen (atom only)`**: **675 B** (Slight increase from 633 B post-patching-refactor)
- `valtio`: 903 B (Reference)
- **`zen (full)`**: **1.23 kB** (Slight increase from 1.17 kB post-patching-refactor)
- `effector`: 5.27 kB (Reference)
- `@reduxjs/toolkit`: 6.99 kB (Reference)
- **Size Analysis**: Minor size increase (~40-60 B) due to methods being copied onto each instance instead of shared via prototype. This is an acceptable trade-off for the significant creation performance gain.

## Features Implemented (Post Object Literal Refactor)
- `atom` (Factory uses object literal)
- `computed` (Factory uses object literal)
- `map`, `deepMap` (Still use `Object.create` internally via `atom()` base)
- `task`
- Lifecycle Events (`onStart`, etc.) - Integrated into core methods.
- Batching (`batch()`) - Via internal queue, no prototype patching.
- Key/Path Subscriptions (`listenKeys`, `listenPaths`).

## Benchmark Highlights (Post Object Literal Refactor)
- Atom/Computed creation significantly faster.
- Other core performance remains excellent.
- Dynamic patching successfully removed.
- Code structure simplified and potentially more optimizable by JS engines.

## Current Status
- Refactoring to remove dynamic patching is complete.
- Refactoring to use object literals for atom/computed creation is complete.
- Tests and benchmarks pass.
- Performance profile improved (faster creation), size impact minimal and acceptable.

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
18. ~~Refactor Core: Use Object Literals for Creation~~ (Done for atom/computed)
19. ~~Verify Object Literal Refactoring (Tests, Benchmarks, Size)~~ (Done)
20. **Refactor Map/DeepMap:** Consider changing `map()` and `deepMap()` to also use object literals for consistency, or keep as is if `Object.create` overhead is negligible there.
21. **Investigate Size Discrepancy**: Why was the original 1.45 kB measurement different? (Lower priority)
22. **Consider Further Map Optimizations**: Analyze remaining gap with nanostores Map Set Key performance. (Optional)
23. **Consider Packaging Improvements**: Explore options for tree shaking, bundle optimization, or feature flags. (Optional)
24. **Release Planning**: Prepare for next release.