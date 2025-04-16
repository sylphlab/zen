# Latest Benchmark & Size Results (Mid-Functional Refactor - 2025-04-16)

## Refactoring (Remove Patching)
- Complete for core, events, batch.

## Refactoring (Object Literal Creation)
- Complete for atom, computed.

## Refactoring (Functional API)
- **Core:** `atom`, `computed`, `batch`, `task`, `events` refactored.
- **Tests:** `atom.test.ts`, `computed.test.ts`, `batch.test.ts`, `task.test.ts`, `events.test.ts` updated and passing.
- **Benchmarks:** `atom.bench.ts`, `batch.bench.ts`, `computed.bench.ts`, `deepMap.bench.ts` updated.
- **Remaining:**
    - Update remaining benchmark files (`map.bench.ts`, `events.bench.ts`, `task.bench.ts`) to use functional API.
    - Refactor `map.test.ts` and `deepMap.test.ts` to use functional API (currently failing).
    - Refactor `map.ts` and `deepMap.ts` key/path listener trigger logic if tests still fail after test refactor.

## Performance (`npm run bench` Results - Not run after latest benchmark updates)
- Previous runs showed core performance maintained, creation improved, slight batching trade-off.

## Size (`size-limit`, brotlied - Post Object Literal Refactor)
- **`zen (atom only)`**: **675 B**
- **`zen (full)`**: **1.23 kB**

## Current Status
- Core functional refactoring largely complete.
- Tests for core components pass.
- Benchmark files partially updated.
- `map`/`deepMap` tests still failing due to pending test/source refactoring.
- Handing over task.

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
23. ~~**Update Benchmarks:** Update `map.bench.ts`, `events.bench.ts`, `task.bench.ts`. (Done)~~~
24. ~~**Refactor Tests:** Update `map.test.ts`, `deepMap.test.ts`. (Done - Tests passed)~~~
25. ~~**Fix Key/Path Listeners:** Debug and fix `map`/`deepMap` listener trigger logic if tests still fail. (Not needed, tests passed after refactor)~~~
26. ~~**Final Verification:** Run all tests, benchmarks, size checks. (Done - Tests passed, benchmarks ran, size: atom 143B, full 687B)~~~
27. ~~**Commit Final Refactoring.** (Done - commit `2dd2a24`)~~~
28. ~~**Refactor Modules & Optimize Creation:** Separate types/utils, remove type markers, delay listener init. (Done - commit `36e5650`)~~~
29. **Consider Further Optimizations/Packaging/Release.** (Next potential step)