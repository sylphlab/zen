# Active Context (2025-04-16 Major Refactor Complete)

## Current Focus
- **Naming Review Complete:** Reviewed all core `src` files. Renamed core factory functions (`createAtom` -> `atom`, `createComputed` -> `computed`, etc.) to align better with community standards and improve conciseness. Removed compatibility aliases from `index.ts`.
- **Build Fix:** Updated `size-limit` configuration in `package.json` to use the new, shorter factory function names, resolving build errors.
- **Optimization Concluded:** Previous attempts at micro-optimizations were reverted as they caused performance regressions in core paths. The stable baseline is commit `1d82136`.

## Status
- **Code State:** Current commit is `c0310cf` ("fix(build): update size-limit config to use new function names"). This commit includes the naming changes and the build fix.
- **Naming:** Factory functions now use shorter names (`atom`, `computed`, `map`, `deepMap`, `task`) and are exported directly without aliases. Other reviewed files have clear and standard naming.
- **Build:** `size-limit` configuration updated.
- **Tests:** All tests passing after updating calls to renamed factory functions (`atom`, `computed`, etc.) and fixing imports.
- **Previous Optimization Attempts:** Reverted as documented previously.
- **Major Refactor:** Completed refactoring to merge atom structures (MapAtom, DeepMapAtom, TaskAtom) with AtomWithValue properties. Eliminated `_internalAtom`, `_stateAtom`, and the `getBaseAtom` function. All core functions now operate directly on the atom object, using `_kind` for dispatch where necessary.
- **Retained Optimizations:** Kept targeted `_kind` dispatch in `get` and manual orchestration in `map.ts`'s `setKey`.
- **Performance:** Significant improvements observed across most benchmarks after refactoring, including `Subscribe/Unsubscribe`. `deepMap`'s `getChangedPaths` remains a potential future optimization target.
- **Previous State:** Functional API refactoring, module separation, and creation optimization were complete before optimization attempts.

## Recent Changes & Decisions
- **Fixed `size-limit` Config:** Updated `package.json` to use new function names in `size-limit` imports. (Commit: `c0310cf`)
- **Finalized Naming:** Applied shorter, conventional names (`atom`, `computed`, etc.) to factory functions and removed compatibility aliases from `index.ts`. (Commit: `75be59c`, amended into `c0310cf` implicitly by the fix commit)
- **Reverted Inlining Optimization:** Reverted the last optimization attempt before renaming. (Reset to `1d82136`)
- **Decision:** Concluded micro-optimization attempts. Adopted final shorter factory function names. Naming review complete. Build configuration fixed.

## Next Steps
- Run `size-limit` to check bundle size after refactoring.
- Consider packaging, documentation, or release steps for the current version (`c0310cf`).
- Address guideline compliance task (fetching `guidelines/typescript/style_quality.md`) if it becomes available.
- Potentially revisit `deepMap`'s `getChangedPaths` optimization in the future.

## Active Decisions
- Factory functions renamed and exported directly. Naming review complete.
- Optimization phase concluded.
- `size-limit` configuration fixed.
- Tests fixed.
- Applied `get` and `setKey` optimizations.
- Completed major refactor (merged atom structures, removed `getBaseAtom`).

## Guideline Verification Issues
- **Persistent Failure:** Repeated attempts to fetch `guidelines/typescript/style_quality.md` failed (GitHub 404 Not Found). Cleanup/review proceeded based on existing code style and best practices. The compliance task remains pending.