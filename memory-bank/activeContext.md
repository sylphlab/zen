# Active Context (2025-04-17 Removed Key/Path Listeners)

## Current Focus
- **Simplification:** Completed removal of key/path specific listeners (`listenKeys`, `listenPaths`) from Map/DeepMap atoms for maximum code simplification and potential performance gains.

## Status
- **Code State:** Needs commit for key/path listener removal. Previous commit was `2a1e04e` (getChangedPaths optimization).
- **Naming:** Factory functions now use shorter names (`atom`, `computed`, `map`, `deepMap`, `task`) and are exported directly without aliases. Other reviewed files have clear and standard naming.
- **Build:** `size-limit` needs to be re-run after listener removal. Previous sizes: atom 52 B, full 667 B.
- **Tests:** Tests related to `listenKeys` and `listenPaths` will fail and need removal/update. Other tests should be verified.
- **Previous Refactoring:** Major structural refactor (merged atoms, removed `getBaseAtom`), type refactoring, ESLint setup, and `getChangedPaths` optimization completed previously.

## Recent Changes & Decisions
- **Completed Type Refactoring:** Replaced `any` with generics/overloads/unknown across core files. Added `Args` generic to `TaskAtom`. Inlined logic/used casts to resolve type conflicts. Retained some internal `any`. (Commit: `64483ae`)
- **Ran `size-limit`:** Confirmed bundle size post-type refactor. (Sizes: atom 52 B, full 667 B)
- **Setup ESLint:** Installed ESLint, @typescript-eslint/parser, @typescript-eslint/eslint-plugin, typescript-eslint. Created `eslint.config.cjs` with recommended rules and `@typescript-eslint/no-explicit-any` set to 'warn'. Updated root `lint` script. (Commit status unclear, likely uncommitted)
- **Ran ESLint:** Applied automatic fixes. Remaining `no-explicit-any` warnings mostly relate to intentional uses in internal utils/casts. Other errors (unused vars, etc.) also present. (Commit status unclear, likely uncommitted)
- **Optimized `deepMap`'s `getChangedPaths`:** Reduced Set allocations during key comparison. (Commit: `2a1e04e`)
- **Removed Key/Path Listeners:** Eliminated `listenKeys`, `listenPaths`, and associated logic from `events.ts`, `map.ts`, `deepMap.ts`. (Commit: *Needs new commit*)

## Next Steps
- Commit key/path listener removal.
- Update/remove tests related to `listenKeys` and `listenPaths`.
- Run all tests to verify changes.
- Run `size-limit` to measure impact of simplification.
- Commit ESLint setup and auto-fixes (if not already done).
- Address remaining ESLint errors (unused vars, no-undef, etc.) if desired.
- Consider packaging, documentation, or release steps.
- Address guideline compliance task (fetching `guidelines/typescript/style_quality.md`) if it becomes available.

## Active Decisions
- Key/path specific listeners removed for simplification.
- `getChangedPaths` optimization applied.
- Type refactoring complete. Generics/overloads preferred over `any`. Some internal `any` retained for practicality.
- `size-limit` results recorded (pre-listener removal).
- ESLint configured and run. `no-explicit-any` is active as a warning.

## Guideline Verification Issues
- **Persistent Failure:** Repeated attempts to fetch `guidelines/typescript/style_quality.md` failed (GitHub 404 Not Found - latest attempt 2025-04-16). Cleanup/review proceeded based on existing code style, user instructions, and best practices. The compliance task remains pending.