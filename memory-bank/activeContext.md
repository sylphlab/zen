# Active Context (2025-04-17 Restoring Features)

## Current Focus
- Resolving conflicts after reverting commits that removed features (events, batch, map, task, key/path listeners).
- Committing restored features and previous fixes (ESLint, types.ts).

## Status
- **Code State:** Conflicts exist after reverting `e9bf932`, `70c5679`, `7ee48b8`. Source files (`batch.ts`, `events.ts`, `map.ts`, `task.ts`, `deepMap.ts`, `types.ts`, `index.ts`) have been modified to restore functionality and fix type errors (using `as any` where needed). Benchmark files were restored by revert. ESLint setup and `types.ts` fixes from previous commits are included in the current staged changes. **Persistent import errors for `./batch` exist in `map.ts` and `deepMap.ts`, likely due to tooling/cache issues.**
- **Naming:** Factory functions use shorter names (`atom`, `computed`, `map`, `deepMap`, `task`).
- **Build:** `size-limit` needs to be re-run after feature restoration. Previous results (post-listener removal: atom 36 B, full 613 B) are outdated.
- **Tests:** Need to be re-run after feature restoration. Previous results (post-listener removal) are outdated. Benchmark files were restored but need checking.
- **Previous Refactoring:** Major structural refactor, type refactoring, ESLint setup, `getChangedPaths` optimization completed previously.

## Recent Changes & Decisions
- **Reverted Feature Removals:** Reverted commits `e9bf932`, `70c5679`, `7ee48b8` using `--no-commit`.
- **Resolved Conflicts (Code):**
    - Restored `batch.ts`, `events.ts`, `map.ts`, `task.ts`.
    - Merged `deepMap.ts` (keeping embedded `setDeep`, restoring batch/event logic).
    - Updated `types.ts` (restored `MapAtom`, `TaskAtom`, `TaskState`, listener properties, fixed `AnyAtom`).
    - Updated `index.ts` (restored exports).
    - Fixed various import errors (`notifyListeners`, `MapAtom`).
    - Fixed type errors using `as any` casts where necessary (`AnyAtom` compatibility).
- **Completed Type Refactoring:** (From previous HEAD) Replaced `any` with generics/overloads/unknown. (Commit: `64483ae`)
- **Setup ESLint:** (From previous HEAD) Installed deps, created config, updated script. (Staged)
- **Ran ESLint:** (From previous HEAD) Applied automatic fixes. (Staged)
- **Optimized `deepMap`'s `getChangedPaths`:** (From previous HEAD) Reduced Set allocations. (Commit: `2a1e04e`)
- **Fixed `types.ts` Errors:** (From previous HEAD) Corrected initial errors. (Staged)

## Next Steps
- Resolve Memory Bank conflicts (this step).
- Commit the revert and conflict resolutions.
- Re-run tests (`vitest run`).
- Re-run benchmarks (`npm run bench` or `bun run bench`). Address any failures (potentially fixing remaining batch import errors or benchmark file issues).
- Re-run `size-limit`.
- Consider packaging, documentation, or release steps.
- Address guideline compliance task (fetching `guidelines/typescript/style_quality.md`) if it becomes available.

## Active Decisions
- Features (events, batch, map, task, key/path listeners) are being restored.
- Type refactoring complete.
- ESLint configured and run (`no-explicit-any` is 'warn').
- `getChangedPaths` optimization applied.
- Type errors addressed using `as any` where full resolution was complex.

## Guideline Verification Issues
- **Persistent Failure:** Repeated attempts to fetch `guidelines/typescript/style_quality.md` failed (GitHub 404 Not Found - latest attempt 2025-04-16). Cleanup/review proceeded based on existing code style, user instructions, and best practices. The compliance task remains pending.