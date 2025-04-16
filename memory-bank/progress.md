# Latest Benchmark & Size Results (Post Type Refactor - 2025-04-16)

## Refactoring (Type Safety - Remove `any`)
- **Completed:** Reviewed all `.ts` files in `packages/zen-core/src`.
- Replaced `any` with generics (including `Args` for `TaskAtom`), overloads (`get`, `subscribe`), or `unknown` where feasible.
- Retained some internal `any` where strict typing was impractical (e.g., `deepMapInternal`, `internalUtils`, WeakMap keys/values).
- Resolved resulting type errors via inlining or casting.

## Refactoring (Remove Patching) - Previous
- Complete for core, events, batch.

## Refactoring (Object Literal Creation) - Previous
- Complete for atom, computed.

## Refactoring (Functional API) - Previous
- **Core:** `atom`, `computed`, `batch`, `task`, `events`, `map`, `deepMap` refactored.
- **Tests:** All tests updated and passing.
- **Benchmarks:** All benchmarks updated.

## Performance (`npm run bench` Results - Post Major Refactor)
- Significant improvements observed across most operations after major refactoring. Performance is highly competitive. `deepMap`'s `getChangedPaths` remains a potential future optimization target.

## Size (`size-limit`, brotlied - Post Type Refactor - 2025-04-16)
- **`zen (atom only)`**: **52 B**
- **`zen (full)`**: **667 B**

## Current Status
- Type refactoring complete.
- `size-limit` checked.
- Ready for commit.

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
32. **Setup ESLint:** Install deps, create config (`eslint.config.cjs`), add `no-explicit-any` rule, update script. (Done - *Needs commit*)
33. **Run ESLint Fix:** Apply automatic fixes. (Done - *Needs commit*)
34. **Commit ESLint Setup & Fixes.** (Next step)
35. **Address Remaining ESLint Errors/Warnings.** (Optional)
36. **Consider Packaging/Documentation/Release.**
37. **Potentially revisit `deepMap`'s `getChangedPaths` optimization.**