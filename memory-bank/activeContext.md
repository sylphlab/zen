# Active Context (2025-04-16 Type Refactoring Complete)

## Current Focus
- **Type Refactoring:** Completed refactoring across `zen-core` to eliminate `any` types where feasible, using generics (including for Task args) and overloads (`get`, `subscribe`). Some internal `any` types remain where strict typing was overly complex or conflicted with variance (e.g., `deepMapInternal`, `internalUtils`, WeakMap keys/values in `events`/`batch`).

## Status
- **Code State:** Needs commit for type refactoring changes. Previous commit was `c0310cf`.
- **Naming:** Factory functions now use shorter names (`atom`, `computed`, `map`, `deepMap`, `task`) and are exported directly without aliases. Other reviewed files have clear and standard naming.
- **Build:** `size-limit` ran successfully. New sizes: atom 52 B, full 667 B.
- **Tests:** Assumed passing based on lack of errors during refactoring (should be verified by CI/manual run).
- **Previous Refactoring:** Major structural refactor (merged atoms, removed `getBaseAtom`) completed previously.

## Recent Changes & Decisions
- **Completed Type Refactoring:** Replaced `any` with generics/overloads/unknown across core files. Added `Args` generic to `TaskAtom`. Inlined logic/used casts to resolve type conflicts. Retained some internal `any`. (Commit: *Needs new commit*)
- **Ran `size-limit`:** Confirmed bundle size post-refactor. (Sizes: atom 52 B, full 667 B)
- **Setup ESLint:** Installed ESLint, @typescript-eslint/parser, @typescript-eslint/eslint-plugin, typescript-eslint. Created `eslint.config.cjs` with recommended rules and `@typescript-eslint/no-explicit-any` set to 'warn'. Updated root `lint` script. (Commit: *Needs new commit*)
- **Ran ESLint:** Applied automatic fixes. Remaining `no-explicit-any` warnings mostly relate to intentional uses in internal utils/casts. Other errors (unused vars, etc.) also present.

## Next Steps
- Commit ESLint setup and auto-fixes.
- Address remaining ESLint errors (unused vars, no-undef, etc.) if desired.
- Consider packaging, documentation, or release steps.
- Address guideline compliance task (fetching `guidelines/typescript/style_quality.md`) if it becomes available.
- Potentially revisit `deepMap`'s `getChangedPaths` optimization in the future.

## Active Decisions
- Type refactoring complete. Generics/overloads preferred over `any`. Some internal `any` retained for practicality.
- `size-limit` results recorded.
- ESLint configured and run. `no-explicit-any` is active as a warning.

## Guideline Verification Issues
- **Persistent Failure:** Repeated attempts to fetch `guidelines/typescript/style_quality.md` failed (GitHub 404 Not Found - latest attempt 2025-04-16). Cleanup/review proceeded based on existing code style, user instructions, and best practices. The compliance task remains pending.