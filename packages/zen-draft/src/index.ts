// Export public API

// Types
export type { Patch, ProduceOptions, ProduceResult } from './types';

// Core produce function
export { produce } from './produce';

// Patch application function
export { applyPatches } from './patch';

// Zen integration function
export { produceZen } from './zen';

// Note: Internal utilities from utils.ts are not exported
