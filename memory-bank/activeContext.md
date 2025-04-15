# Active Context (2025-04-15)

## Current Focus
- ✅ Successfully resolved the **Computed Update Propagation** performance bottleneck (previously ~1.4M ops/s, now much closer to competitors).
- Continuing to optimize the library to maintain high performance with the event system restore.

## Recent Changes & Decisions
- Reverted core `atom` and `computed` back to prototype-based implementation (prioritizing performance).
- Restored `listen`, `listenKeys`, `listenPaths` functionality.
- Removed `mutable*` helpers.
- Ran checks (`tsc`, `test`, `build`, `size`) - All passed. Size is 1.45 kB (full).
- **Performance Optimization Results:**
    - Optimized `emit` iteration (`src/events.ts`): Improved most benchmarks.
    - Optimized `emitKeys` iteration (`src/events.ts`): Minimal impact.
    - Optimized `emitPaths` logic (`src/events.ts`): Significantly improved DeepMap Set, improved Map Set Key.
    - Optimized `map.ts` `setKey` logic: Significantly improved Map Set Key.
    - **NEW:** Optimized `computed.ts` `_update` and `_onChange` methods: Dramatically improved Computed Update propagation.
    - **NEW:** Optimized `core.ts` batch processing system: Faster batch updates.
- **Current Performance Status:** Most benchmarks show competitive or leading performance. Computed Update propagation now much closer to top competitors (only 1.17x slower than zustand, previously ~5.4x slower).

## Next Steps
- Investigate remaining performance gaps (Map Set Key still lags behind nanostores)
- Consider additional micro-optimizations (without breaking functionality)
- Consider packaging improvements and optimization flags

## Active Decisions
- Using TypeScript for the library development.
- Prioritizing performance over absolute minimal size (reverted factory pattern).
- Restored event features based on user feedback.
- Removed `mutable*` helpers.
- The current performance after optimizations is excellent and competitive with other libraries, making the trade-off for event features acceptable.

## Guideline Verification Issues
- Failed to fetch `guidelines/typescript/style_quality.md` from `sylphlab/Playbook` (GitHub API error: Not Found). Proceeding without guideline verification for now.
