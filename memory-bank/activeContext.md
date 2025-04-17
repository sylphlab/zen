# Active Context (2025-04-17 Removed Key/Path Listeners)

## Current Focus
- **Simplification:** Completed removal of key/path specific listeners (`listenKeys`, `listenPaths`) from Map/DeepMap atoms for maximum code simplification and potential performance gains.

## Status
- **Code State:** Changes for key/path listener removal and test updates committed (`7ee48b8`, `01860fd`). Previous commit was `2a1e04e` (getChangedPaths optimization).
- **Naming:** Factory functions use shorter names (`atom`, `computed`, `map`, `deepMap`, `task`).
- **Build:** `size-limit` ran successfully after listener removal. New sizes: atom **36 B**, full **613 B**.
- **Tests:** Removed tests for `listenKeys`/`listenPaths`. All remaining tests passed (`vitest run`).
- **Previous Refactoring:** Major structural refactor (merged atoms, removed `getBaseAtom`), type refactoring, ESLint setup, and `getChangedPaths` optimization completed previously.

## Recent Changes & Decisions
- **Completed Type Refactoring:** Replaced `any` with generics/overloads/unknown. (Commit: `64483ae`)
- **Ran `size-limit`:** Confirmed bundle size post-type refactor. (Sizes: atom 52 B, full 667 B)
- **Setup ESLint:** Installed deps, created config, updated script. (Commit status unclear, likely uncommitted)
- **Ran ESLint:** Applied automatic fixes. (Commit status unclear, likely uncommitted)
- **Optimized `deepMap`'s `getChangedPaths`:** Reduced Set allocations. (Commit: `2a1e04e`)
- **Removed Key/Path Listeners:** Eliminated `listenKeys`, `listenPaths`, and associated logic. (Commit: `7ee48b8`)
- **Updated Tests:** Removed tests for key/path listeners. All tests pass. (Commit: `01860fd`)
- **Ran `size-limit`:** Confirmed bundle size post-listener removal. (Sizes: atom 36 B, full 613 B)

## Next Steps
- Commit Memory Bank updates.
- Commit ESLint setup and auto-fixes (if not already done).
- Address remaining ESLint errors (unused vars, no-undef, etc.) if desired.
- Consider packaging, documentation, or release steps.
- Address guideline compliance task (fetching `guidelines/typescript/style_quality.md`) if it becomes available.

## Active Decisions
- Key/path specific listeners removed for simplification.
- `getChangedPaths` optimization applied.
- Type refactoring complete.
- `size-limit` results updated (post-listener removal: atom 36B, full 613B).
- ESLint configured and run (`no-explicit-any` is 'warn').

## Guideline Verification Issues
- **Persistent Failure:** Repeated attempts to fetch `guidelines/typescript/style_quality.md` failed (GitHub 404 Not Found - latest attempt 2025-04-16). Cleanup/review proceeded based on existing code style, user instructions, and best practices. The compliance task remains pending.