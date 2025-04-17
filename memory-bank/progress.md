# Latest Benchmark & Size Results (Needs Update Post-Feature Restoration - 2025-04-17)

## Refactoring (Feature Restoration)
- **Completed:** Reverted commits `e9bf932`, `70c5679`, `7ee48b8`.
- Resolved code conflicts.
- Restored source files (`events`, `map`, `task`).
- Consolidated `batch` logic into `atom.ts`.
- Updated types (`MapAtom`, `TaskAtom`, `TaskState`, `AnyAtom`, listener props).
- Updated `index.ts` exports.
- Fixed resulting type errors (using `as any` where needed).
- Fixed benchmark files (`batch`, `deepMap`, `events`).
- Suppressed persistent batch import error in `map.ts`.
- **Verified:** Tests pass, benchmarks run.

## Refactoring (Type Safety - Remove `any`) - Previous
- **Completed:** Reviewed all `.ts` files.
- Replaced `any` with generics, overloads, or `unknown`.
- Retained some internal `any`. Resolved type errors.

## Refactoring (Remove Patching) - Previous
- Complete for core, events, batch.

## Refactoring (Object Literal Creation) - Previous
- Complete for atom, computed.

## Refactoring (Functional API) - Previous
- **Core:** `atom`, `computed`, `batch`, `task`, `events`, `map`, `deepMap` refactored.
- **Tests:** Updated and passing *before* feature removal/restoration.
- **Benchmarks:** Updated *before* feature removal/restoration.

## Performance (`npm run bench` Results - Needs Update)
- Benchmarks run successfully post-restoration. Needs review/recording.

## Size (`size-limit`, brotlied - Needs Update)
- Needs re-run.

## Current Status
- Feature restoration complete and verified (tests/benchmarks run).
- Commit `66f2172` contains all restoration changes.

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
12. ~~Resolve Batching Circular Dependency~~ (Done by consolidating into `atom.ts`)
13. ~~Remove Batching from Map/DeepMap~~ (Done)
14. ~~Fix Benchmark Tests (Jotai Overhead, Import Error)~~ (Done)
15. ~~Record Baseline Size~~ (Done: atom 523 B, full 1.09 kB)
16. ~~Refactor Core: Remove Dynamic Patching~~ (Done)
17. ~~Verify Refactoring (Tests, Benchmarks, Size)~~ (Done)
18. ~~Refactor Core: Use Object Literals for Creation~~ (Done for atom/computed)
19. ~~Verify Object Literal Refactoring (Tests, Benchmarks, Size)~~ (Done)
20. ~~Refactor Core: Functional API (`atom`, `computed`, `batch`, `task`, `events`)~~ (Done)
21. ~~Update Tests (`atom`, `computed`, `batch`, `task`, `events`)~~ (Done)
22. ~~Update Benchmarks (`atom`, `batch`, `computed`, `deepMap`)~~ (Done)
23. ~~**Update Benchmarks:** Update `map.bench.ts`, `events.bench.ts`, `task.bench.ts`. (Done)~~
24. ~~**Refactor Tests:** Update `map.test.ts`, `deepMap.test.ts`. (Done - Tests passed)~~
25. ~~**Fix Key/Path Listeners:** Debug and fix `map`/`deepMap` listener trigger logic if tests still fail. (Not needed, tests passed after refactor)~~
26. ~~**Final Verification:** Run all tests, benchmarks, size checks. (Done - Tests passed, benchmarks ran, size: atom 143B, full 687B)~~
27. ~~**Commit Final Refactoring.** (Done - commit `2dd2a24`)~~
28. ~~**Refactor Modules & Optimize Creation:** Separate types/utils, remove type markers, delay listener init. (Done - commit `36e5650`)~~
29. ~~**Major Refactor:** Merge atom structures, remove `getBaseAtom`. (Done - commit `c0310cf` includes this and naming/build fixes)~~
30. **Refactor Types:** Remove `any`, use generics/overloads. (Done - Commit `64483ae`)
31. ~~Commit Type Refactoring.~~ (Done)
32. **Setup ESLint:** Install deps, create config, add rule, update script. (Done - Included in `66f2172`)
33. **Run ESLint Fix:** Apply automatic fixes. (Done - Included in `66f2172`)
34. **Fix `types.ts` Errors:** Corrected initial TS/ESLint errors. (Done - Included in `66f2172`)
35. ~~Commit ESLint Setup & Fixes.~~ (Done - Commit `4f8ac35`, amended into `66f2172`)
36. ~~**Potentially revisit `deepMap`'s `getChangedPaths` optimization.**~~ (Done - Optimized key comparison - Commit `2a1e04e`)
37. ~~**Radical Simplification:** Removed key/path specific listeners (`listenKeys`, `listenPaths`).~~ (Reverted)
38. ~~**Fix Benchmark Failures:** Removed obsolete benchmark files (`batch`, `map`, `task`, `events`, `deepMap`).~~ (Reverted)
39. **Restore Features & Fixes:** Reverted commits, resolved conflicts, restored/updated source files, fixed tests/benchmarks, consolidated batch logic. (Done - Commit `66f2172`)
40. ~~Resolve Memory Bank Conflicts.~~ (Done)
41. ~~Commit Revert & Conflict Resolutions.~~ (Done - Commit `66f2172`)
42. ~~Verify Build (Tests/Benchmarks).~~ (Done)
43. ~~Verify Build (Size):~~ Re-ran `size-limit` (atom: 36 B, full: 885 B).
44. **Refinement:** Addressed `as any` casts in source files. Suppressed error previously noted in `map.ts` appears resolved.
45. ~~Benchmark explicit `batch()` function.~~ (Done - Confirmed benefits)
46. (Paused) **Implement `batched` function.**
47. (Paused) **Implement `effect` function.**
48. (Paused) **Implement `mapCreator` function.**
49. (Paused) **Add tests for new core features.**
50. (Paused) **Verify build after adding core features.**
51. **Consider Packaging/Documentation/Release.**