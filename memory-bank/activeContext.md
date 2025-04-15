# Active Context: zen Library

## Current Focus
- Prioritize performance after reverting core structure.

## Recent Changes
- **Build Tool:** Switched to `tsup`.
- **Benchmarking Setup:** Installed necessary dependencies for comparisons.
- **Core Features Implemented:** `atom`, `computed`, `map` (v1 - Restored), `task` (v1), `deepMap` (v1 - Restored).
- **Mutable Helpers Removed:** `mutableArrayAtom`, `mutableMapAtom`, `mutableObjectAtom` removed as requested.
- **Lifecycle Events Restored:** Implemented `onMount`, `onStart`, `onStop`, `onSet`, `onNotify`. Integrated into `atom`, `computed`, `map`, `deepMap`. Handled batching.
- **Key/Path Subscription API (v1 - Removed then Restored):** Implemented `listenKeys` (for `map`), `listenPaths` (for `deepMap`). Integrated into `map`, `deepMap`. Handled batching.
- **Radical Optimization (v1):**
    - Removed Event System and Key Subscription system.
    - Simplified core methods and helpers.
    - Fixed resulting type errors and tests.
- **Factory Function Refactor (Optimization v2):**
    - Refactored `atom` and `computed` to factory functions.
    - Achieved size target (< 265 B) but caused major performance regressions.
- **Hybrid Factory Refactor (Optimization v3):**
    - Attempted hybrid factory approach. Minor size improvement, performance recovery insufficient.
- **Revert to Prototype Implementation (Prioritizing Performance):**
    - Reverted `src/atom.ts` and `src/computed.ts` back to the prototype-based implementation (commit `903760e`) based on user feedback prioritizing performance.
    - **Decision:** Prioritize performance over absolute minimal size, accepting the larger prototype-based size (~588 B) for better speed.
- **Checks & Size Measurement (Post-Revert):**
    - Ran `npx tsc --noEmit`: Passed.
    - Ran `npm run test`: All tests passed.
    - Ran `npm run build && npm run size`: Build successful.
    - **`zen (atom only)`: 588 B** (brotlied) - Confirmed revert to prototype size.
    - **`zen (full)`: 881 B** (brotlied) - Confirmed revert to prototype size.
    - **Analysis:** Code reverted successfully to the faster prototype-based version. Size target (< 265 B) is sacrificed for performance.

## Next Steps (Immediate)
1.  ~~Implement `map` helper (v1).~~
2.  ~~Implement `task` helper (v1).~~
3.  ~~Implement `deepMap` helper (v1) & Add Benchmarks.~~
4.  ~~Implement Lifecycle Events (v1).~~ (Removed)
5.  ~~Implement Key Subscription API (v1 - Simplified).~~ (Removed)
6.  ~~Run checks & benchmarks post-features.~~
7.  ~~**Plan & Implement Optimizations (v1 - Radical Removal)**~~
8.  ~~**Git Commit:** Commit key subscription.~~
9.  ~~**Git Commit:** Commit radical optimization.~~
10. ~~**Further Optimization (Micro-optimizations v1 & v2)**~~
11. ~~**Run Benchmarks:** Post micro-optimizations.~~
12. ~~**Further Optimization (v2 - Factory Function Refactor)**~~ (Achieved size, lost performance)
13. ~~**Git Commit:** Commit factory function refactor.~~
14. ~~**Performance Benchmarking (Post-Factory Refactor):**~~
15. ~~**Analyze & Address Performance Regressions (v3 - Hybrid Factory)**~~ (Minor recovery, still slow)
16. ~~**Git Commit:** Commit hybrid factory refactor.~~
17. ~~**Revert to Prototype Implementation**~~ (Done - Prioritizing performance).
18. **Restore Features:** Re-implemented Lifecycle Events and Key/Path Subscriptions based on user feedback.
    - Restored/Updated `src/events.ts`, `src/keys.ts`, `src/deepMapInternal.ts`.
    - Modified `src/core.ts`, `src/atom.ts`, `src/computed.ts`, `src/map.ts`, `src/deepMap.ts` to integrate features and handle batching correctly.
    - Restored/Updated tests in `src/events.test.ts`, `src/map.test.ts`, `src/deepMap.test.ts`. Fixed related issues.
    - Updated benchmarks in `src/deepMap.bench.ts` (`setKey` -> `setPath`).
19. ~~**Run Checks:**~~ `tsc --noEmit && npm run test` passed after restoring features.
20. ~~**Git Commit:**~~ Committed restored features and Memory Bank updates.
21. ~~**Remove Mutable Helpers:**~~ Removed `mutable*` functions, deleted `src/mutable.ts`, removed from `src/index.ts` export, updated README.
22. ~~**Update Memory Bank:**~~ Reflected removal of mutable helpers.
23. ~~**Git Commit:**~~ Committed removal of mutable helpers and docs update.
24. **Run Checks:** `tsc --noEmit && npm run test && npm run build && npm run size` passed after fixes. Final size: 1.45 kB.
25. **Update Memory Bank:** Reflect final status and size. (Current step)
26. **Git Commit:** Commit final Memory Bank update.
27. **Documentation & Examples**: Review README for accuracy after removals. (Done, minor review needed).
28. **Feature Enhancements**: Re-evaluate next steps.

## Active Decisions
- Using TypeScript for the library development.
- V1 implementations of map/deepMap exclude fine-grained key notification.
- Tests and benchmarks organized by feature.
- **Decision:** Reverted factory function pattern back to prototype-based implementation to prioritize performance over absolute minimum size.
- **Decision:** Restored Lifecycle Events and Key/Path Subscriptions based on user feedback prioritizing functionality.
- **Decision:** Removed `mutable*` helpers as they were deemed unnecessary for external use.
