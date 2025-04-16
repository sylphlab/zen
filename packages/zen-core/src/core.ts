// This file re-exports core types and internal utilities from their new locations.
// It should not contain actual implementations anymore.

// Base types from types.ts
export type { Listener, Unsubscribe, TaskState, AtomWithValue } from './types';

// Specific atom types from their respective files
export type { Atom } from './atom';
export type { ReadonlyAtom, ComputedAtom } from './computed';
export type { MapAtom } from './map';
export type { DeepMapAtom } from './deepMap';
export type { TaskAtom } from './task';

// Union type (assuming it will be defined and exported from types.ts later)
export type { AnyAtom } from './types';

// Type guards from typeGuards.ts
export { isAtom, isComputedAtom, isMapOrDeepMapAtom, isTaskAtom } from './typeGuards';

// Internal utilities from internalUtils.ts (re-exported for internal use only)
// These should NOT be part of the public API exported via index.ts
export { getBaseAtom, notifyListeners } from './internalUtils';

// Lifecycle listener type (needed by AtomWithValue in types.ts)
// Re-export from events.ts
export type { LifecycleListener } from './events';