# Progress: zen Library

## Current Status
- Basic project structure and core `atom` function implemented.
- Moving to build and test setup.

## What Works
- Memory Bank setup.
- `package.json` initialization.
- TypeScript setup (`tsconfig.json`).
- `src/index.ts` with:
    - `atom<Value>(initialValue)` function.
    - `get()` method.
    - `set(newValue)` method with basic change check and listener notification.
    - `subscribe(listener)` method that adds listener, calls it with current value, and returns unsubscribe function.
- Build setup (ESBuild, `build.js`, `package.json` scripts/outputs).
- Test setup (Vitest, `package.json` scripts) and passing tests for `atom`.
- Benchmark setup (Vitest Bench, `package.json` scripts, Nanostores installed).
- Initial benchmark tests (`src/index.bench.ts`) executed. Results:
    - Creation: Nanostores faster (~1.3x).
    - Get: **zen faster (~1.7x)**.
    - Set (0 listeners): **zen slightly faster (~1.1x)**.
    - Set (1 listener): zen faster (~1.7x -> ~1.9x).
    - Subscribe/Unsubscribe: Nanostores faster (~1.7x -> ~1.6x).
- **Computed Benchmarks (After `set` Optimization):**
    - Creation: **zen faster (~1.3x)** (Jotai fastest overall).
    - Get: **zen significantly faster (~10.1x vs Nano, ~1x vs Jotai hook)** (Jotai hook slightly faster).
    - Update Propagation: **zen FASTEST (~1.4x vs Nano, ~10.3x vs Jotai hook)**. Regression fixed.
- **Build Tool:** Switched to `tsup`.
- **Bundle Size:** Gzipped size (`atom` + basic `computed` via `tsup`): **409 Bytes** (Increased after `set` optimization).
- **Benchmarking:** Added `jotai` comparison. `jsdom` environment added for hook testing. Ran again after fixing regression.
    - **Key Findings:** `zen` excels in raw Get/Set (improved), Computed Get, and **Computed Update Propagation**. Lags in Atom Creation and Subscribe/Unsubscribe vs competitors. `set` optimization increased bundle size. Jotai hook benchmarks include React overhead.

## What's Left / Next Steps
**Immediate:**
1.  ~~Investigate & Fix Computed Update Regression~~ (Done)
2.  ~~Implement Computed Cleanup~~ (Functionality already exists and is tested).
3.  ~~Performance Optimization~~ (Attempted `set` optimization - improved speed but increased size). Further optimization on creation/subscribe needed if performance targets aren't met.
4.  ~~Run all checks~~ (Done).
**Subsequent:**
5.  **Investigate Size Increase:** Determine why `set` optimization increased bundle size. Revert if necessary or accept trade-off.
6.  Plan/implement further features (`map`, `task`, etc.).
5.  Refine API.
6.  Set up CI/CD.

## Known Issues / Blockers
- None currently.
