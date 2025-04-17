# Progress & History

## Router Implementation (2025-04-17) [Resolved]
- **Created `@sylph/router` package:** [Resolved]
    - Basic structure (`package.json`, `tsconfig.json`, `tsup.config.ts`). [Resolved]
    - Implemented core `$router` store (`src/index.ts`). [Resolved]
    - Implemented URL utils (`src/utils.ts`). [Resolved]
    - Implemented history handling (`src/history.ts`). [Resolved]
    - Implemented route matching (`src/matcher.ts`). [Resolved]
    - Implemented route definition (`src/routes.ts`). [Resolved]
    - Integrated matcher/routes into history. [Resolved]
- **Created `@sylph/router-react` package:** [Resolved]
    - Basic structure (`package.json`, `tsconfig.json`, `tsup.config.ts`). [Resolved]
    - Implemented `useRouter` hook (`src/index.ts`). [Resolved]
- **Created `@sylph/router-preact` package:** [Resolved]
    - Basic structure (`package.json`, `tsconfig.json`, `tsup.config.ts`). [Resolved]
    - Implemented `useRouter` hook (`src/index.ts`). [Resolved]
- **Resolved Build Issues:** [Resolved]
    - Investigated persistent DTS generation/resolution errors between `@sylph/core` and `@sylph/router`. [Resolved]
    - Fixed by separating declaration generation (`tsc`) from JS bundling (`tsup`) in `@sylph/core` build script. [Resolved]
    - Ensured dependencies were correctly installed (`bun install`). [Resolved]
    - Full workspace build (`bun run build`) now successful. [Resolved]

## Refactoring (Feature Restoration - 2025-04-17) [Resolved]
- **Completed:** Reverted commits `e9bf932`, `70c5679`, `7ee48b8`. [Resolved]
- Resolved code conflicts. [Resolved]
- Restored source files (`events`, `map`, `task`). [Resolved]
- Consolidated `batch` logic into `atom.ts`. [Resolved]
- Updated types (`MapAtom`, `TaskAtom`, `TaskState`, `AnyAtom`, listener props). [Resolved]
- Updated `index.ts` exports. [Resolved]
- Fixed resulting type errors (using `as any` where needed). [Resolved]
- Fixed benchmark files (`batch`, `deepMap`, `events`). [Resolved]
- Suppressed persistent batch import error in `map.ts`. [Resolved]
- **Verified:** Tests pass, benchmarks run. [Resolved]
- Commit `66f2172` contains all restoration changes. [Resolved]

## Refactoring (Type Safety - Remove `any`) - Previous [Resolved]
- **Completed:** Reviewed all `.ts` files. [Resolved]
- Replaced `any` with generics, overloads, or `unknown`. [Resolved]
- Retained some internal `any`. Resolved type errors. [Resolved]
- Commit `64483ae`. [Resolved]

## Refactoring (Remove Patching) - Previous [Resolved]
- Complete for core, events, batch. [Resolved]

## Refactoring (Object Literal Creation) - Previous [Resolved]
- Complete for atom, computed. [Resolved]

## Refactoring (Functional API) - Previous [Resolved]
- **Core:** `atom`, `computed`, `batch`, `task`, `events`, `map`, `deepMap` refactored. [Resolved]
- **Tests:** Updated and passing *before* feature removal/restoration. [Resolved]
- **Benchmarks:** Updated *before* feature removal/restoration. [Resolved]
- Commit `2dd2a24`. [Resolved]

## Refactoring (Modules & Optimization) - Previous [Resolved]
- **Refactor Modules & Optimize Creation:** Separate types/utils, remove type markers, delay listener init. (Done - commit `36e5650`) [Resolved]
- **Major Refactor:** Merge atom structures, remove `getBaseAtom`. (Done - commit `c0310cf` includes this and naming/build fixes) [Resolved]

## ESLint Setup - Previous [Resolved]
- **Setup ESLint:** Install deps, create config, add rule, update script. (Done - Included in `66f2172`) [Resolved]
- **Run ESLint Fix:** Apply automatic fixes. (Done - Included in `66f2172`) [Resolved]
- **Fix `types.ts` Errors:** Corrected initial TS/ESLint errors. (Done - Included in `66f2172`) [Resolved]

## DeepMap Optimization - Previous [Resolved]
- **Potentially revisit `deepMap`'s `getChangedPaths` optimization.** (Done - Optimized key comparison - Commit `2a1e04e`) [Resolved]

## Performance (`npm run bench` Results - Needs Update)
- Benchmarks run successfully post-restoration. Needs review/recording.

## Size (`size-limit`, brotlied - Needs Update)
- Needs re-run. Previous: atom 143B, full 687B (commit `2dd2a24`). After feature restore: atom 36 B, full 885 B. Needs update after build fixes.

## Current Status
- Core features restored.
- Basic router, react-router, preact-router packages created.
- Build process fixed and successful.

## Known Issues/Next Steps (Refined)
- Add tests for router packages.
- Implement router link interception.
- Re-run benchmarks and size checks for all packages.
- Address remaining `as any` casts in `@sylph/core`.
- Address suppressed error in `@sylph/core/map.ts`.
- Address guideline compliance task (fetching `guidelines/typescript/style_quality.md`) if it becomes available.
- Consider Packaging/Documentation/Release.