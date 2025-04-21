// Export public API

// Types
export type { Patch, ProduceOptions, ProduceResult } from './types';

// Core produce function
export { produce } from './produce';

// Patch application function
export { applyPatches } from './patch';

// Atom integration function
export { produceAtom } from './atom';

// Note: Internal utilities from utils.ts are not exported
