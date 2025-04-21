// Main entry point for the functional zen state management library.
// This file re-exports all public APIs.
// --- Core Types ---
export * from './types'; // Export all base types (Listener, Unsubscribe, AtomWithValue, AnyAtom, TaskState, MapAtom, DeepMapAtom, TaskAtom, etc.)
// --- Core Factories ---
// Import factories
import { zen as _zen } from './atom'; // Import zen
// Removed: import { map as _map } from './map';
// Re-export factories
export const zen = _zen; // Export zen
// Removed: export const map = _map;
// Keep others as direct re-export
export { map } from './map'; // Direct re-export
export { computed } from './computed';
export { deepMap } from './deepMap';
export { task } from './task';
export { mapCreator } from './mapCreator';
// --- Core Functions ---
// Import core functions from atom
import { batch as _batch, get as _get, set as _set, subscribe as _subscribe } from './atom';
// Re-export them
export const get = _get;
export const set = _set;
export const subscribe = _subscribe;
export const batch = _batch;
// Import map functions
import { listenKeys as _listenKeys, setKey as _setKey, set as _setMapValue } from './map';
// Re-export them
export const setKey = _setKey;
export const setMapValue = _setMapValue; // Keep alias for map's set
export const listenKeys = _listenKeys;
// Keep others as direct re-export
export { setPath as setDeepMapPath, set as setDeepMapValue } from './deepMap'; // Keep alias for deepMap set
export { runTask, getTaskState, subscribeToTask } from './task';
export { batchedUpdate } from './batchedUpdate';
export { batched } from './batched';
export { effect } from './effect';
// --- Event Functions ---
export { onStart, onStop, onSet, onNotify, onMount, listenPaths } from './events';
// Note: Internal functions are not exported.
