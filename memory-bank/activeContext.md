# Active Context (2025-04-16)

## Current Focus
- Finalized separation of batching logic using patching (v7).
- Resolved circular dependency between core.ts and batch.ts.
- Removed all batching logic traces from `map.ts` and `deepMap.ts`.
- Removed corresponding batching tests for map/deepMap.
- Ran checks (`test`, `build`, `size`). All checks passed.

## Recent Changes & Decisions
- **Batching Implementation (v7 - Patching - Final):** Batching logic separated into `batch.ts`, applied via patching triggered by core `set`. Circular dependency resolved. Applies only to plain atoms.
- **Map/DeepMap Batching:** Explicitly removed batching support for map/deepMap listeners to simplify patching and maximize core atom minimalism.
- **Build Optimization:** Terser minification correctly enabled by user.
- **Interface to Type Conversion:** All type definitions use `type` aliases.
- **Atom Factory Location:** `atom()` factory resides in `atom.ts`.
- **Lifecycle Event API (v5 - Patching - Final):** Dynamic patching via `onEvent` functions.
- **AtomProto Consolidation & Simplification:** Done.
- **Size Impact (Final - Terser Enabled):**
    - `zen (atom only)`: 596 B (Excellent minimal core size)
    - `zen (full)`: 1.12 kB (Excellent final size, smallest yet)
- **Size Limit:** Kept limit at 1.8 kB in `package.json`.
- **Decision:** This final separated, patching-based architecture is optimal for size and separation.

## Next Steps
- Consider optional further optimizations (e.g., Map Set Key performance).
- Consider packaging improvements.
- **Refactoring Complete:** Reviewed and refactored all core `.ts` files in `src` for clarity and consistency.
- Prepare for release planning.

## Active Decisions
- Final architecture uses patching for events and batching (plain atoms only).
- `atom()` factory resides in `atom.ts`.
- `AtomProto` defined only in `core.ts`, minimal implementation.
- All definitions use `type` aliases.
- Terser minification is enabled.
- `size-limit` for the full bundle is 1.8 kB.

## Guideline Verification Issues
- Failed to fetch `guidelines/typescript/style_quality.md` from `sylphlab/Playbook` (GitHub API error: Not Found). Proceeding without guideline verification for now.
- **(Repeated Failure 2025-04-16 06:06):** Attempt to fetch `guidelines/typescript/style_quality.md` failed again (Not Found). Proceeding with refactoring based on general best practices and existing project style. Task added to address guideline compliance later.**
