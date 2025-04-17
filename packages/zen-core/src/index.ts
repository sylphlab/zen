// Main entry point for the functional zen state management library.
// This file re-exports all public APIs.

// --- Core Types ---
// Base types
export type { Listener, Unsubscribe, AtomWithValue, AnyAtom, TaskState } from './types'; // Add TaskState back
// Specific atom types
export type { Atom } from './atom';
export type { ReadonlyAtom, ComputedAtom } from './computed';
export type { MapAtom, DeepMapAtom, TaskAtom } from './types'; // Add MapAtom and TaskAtom back
// Event listener types
export type { LifecycleListener, KeyListener, PathListener } from './events'; // Add event listener types back
// Other types
export type { Path } from './deepMap'; // Path is also in events.ts now, but keep export from deepMap for consistency

// --- Core Factories ---
export { atom } from './atom';
export { computed } from './computed';
export { map } from './map'; // Add map factory back
export { deepMap } from './deepMap';
export { task } from './task'; // Add task factory back

// --- Core Functions ---
export { get, set, subscribe } from './atom'; // Core functions
// Map-specific functions
export { setKey, set as setMapValue, listenKeys } from './map'; // Add map functions back (alias set)
// DeepMap-specific functions
export { setPath as setDeepMapPath, set as setDeepMapValue } from './deepMap'; // Keep alias for deepMap set
// Task-specific functions
export { runTask, getTaskState, subscribeToTask } from './task'; // Add task functions back
// Batch function
export { batch } from './atom'; // Export batch from atom.ts
export { batched } from './batched'; // Export batched
export { effect } from './effect'; // Export effect

// --- Event Functions ---
export { onStart, onStop, onSet, onNotify, onMount, listenPaths } from './events'; // Add event functions back (listenKeys exported from map.ts)

// Note: Internal functions like notifyListeners, _emitKeyChanges, _emitPathChanges are not exported.
