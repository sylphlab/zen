// Main entry point for the zen state management library.
// This file re-exports all public APIs.

// --- Core ---
export { atom } from './atom';
export type { Atom, ReadonlyAtom, Listener, Unsubscribe } from './core';
export { batch } from './batch';

// --- Computed ---
export { computed } from './computed';
// Note: Computed atoms are ReadonlyAtom, type already exported via core.

// --- Map ---
export { map } from './map';
export type { MapAtom } from './map';

// --- Deep Map ---
export { deepMap } from './deepMap';
export type { DeepMap } from './deepMap';
// Internal deep map types/helpers are not exported.

// --- Task ---
export { task } from './task';
export type { TaskState, TaskAtom } from './task';

// --- Events & Listeners ---
export { onStart, onStop, onSet, onNotify, onMount, listenKeys, listenPaths } from './events';
export type { KeyListener, PathListener, LifecycleListener } from './events';

// --- Utility Symbols ---
// Primarily for internal use or advanced scenarios, but exported.
export { STORE_MAP_KEY_SET } from './keys';
