// Main entry point for the functional zen state management library.
// This file re-exports all public APIs.

// --- Core Types ---
// Base types
export type { Listener, Unsubscribe, AtomWithValue, AnyAtom } from './types'; // Removed TaskState
// Specific atom types
export type { Atom } from './atom';
export type { ReadonlyAtom, ComputedAtom } from './computed';
export type { DeepMapAtom } from './types'; // Removed MapAtom and TaskAtom
// Event listener types removed
// Other types
export type { Path } from './deepMap'; // Updated Path export

// --- Core Factories ---
export { atom } from './atom';
export { computed } from './computed';
// Removed map factory
export { deepMap } from './deepMap';
// Removed task factory

// --- Core Functions ---
export { get, set, subscribe } from './atom'; // Core functions
// Removed Map-specific functions
export { setPath as setDeepMapPath, set as setDeepMapValue } from './deepMap'; // DeepMap-specific functions, removed listenDeepMapPaths
// Removed Task-specific functions
// Removed batch export

// --- Event Functions Removed ---

// Note: Internal functions like notifyListeners are not exported.
