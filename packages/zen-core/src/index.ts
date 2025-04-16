// Main entry point for the functional zen state management library.
// This file re-exports all public APIs.

// --- Core Types ---
export type { Atom, ReadonlyAtom, ComputedAtom, MapAtom, DeepMapAtom, AnyAtom, Listener, Unsubscribe } from './core'; // Remove TaskState from here
export { AtomTypes } from './core'; // Export AtomTypes enum/const
export type { TaskState } from './task'; // Import TaskState from task.ts
export type { LifecycleListener, KeyListener, PathListener } from './events';
export type { Path } from './deepMapInternal'; // Export Path type

// --- Core Factories ---
export { createAtom } from './atom'; // Renamed
export { createComputed } from './computed'; // Renamed
export { createMap } from './map'; // Renamed
export { createDeepMap } from './deepMap'; // Renamed
export { createTask } from './task'; // Renamed

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
