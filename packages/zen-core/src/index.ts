// Main entry point for the functional zen state management library.
// This file re-exports all public APIs.

// --- Core Types ---
// Base types
export type { Listener, Unsubscribe, TaskState, AtomWithValue, AnyAtom } from './types';
// Specific atom types
export type { Atom } from './atom';
export type { ReadonlyAtom, ComputedAtom } from './computed';
export type { MapAtom } from './map';
export type { DeepMapAtom } from './deepMap';
export type { TaskAtom } from './task';
// Event listener types
export type { LifecycleListener, KeyListener, PathListener } from './events';
// Other types
export type { Path } from './deepMapInternal'; // Export Path type

// --- Core Factories ---
export { atom } from './atom';
export { computed } from './computed';
export { map } from './map';
export { deepMap } from './deepMap';
export { task } from './task';

// --- Core Functions ---
export { get, set, subscribe } from './atom'; // Renamed
export { get as getMapValue, setKey as setMapKey, set as setMapValue, subscribe as subscribeToMap, listenKeys as listenMapKeys } from './map'; // Renamed + added listenKeys
export { get as getDeepMapValue, setPath as setDeepMapPath, set as setDeepMapValue, subscribe as subscribeToDeepMap, listenPaths as listenDeepMapPaths } from './deepMap'; // Renamed + added listenPaths
export { getTaskState, subscribeToTask, runTask } from './task'; // Added runTask
export { batch } from './batch';

// --- Event Functions ---
// listenKeys and listenPaths are now exported from map/deepMap respectively
export { onStart, onStop, onSet, onNotify, onMount } from './events';

// Note: Internal functions like notifyListeners, getBaseAtom, _emitKeyChanges, _emitPathChanges are not exported.
