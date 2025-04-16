// Ultra-optimized state management library - Monster Performance Edition

// Re-export core types and functions
export { atom } from './atom'; // Export atom from atom.ts
export type { Atom, ReadonlyAtom, Listener, Unsubscribe } from './core';
export { batch } from './batch'; // Export batch

// Re-export computed
export { computed } from './computed';

// Re-export map
export { map } from './map';
export type { MapAtom } from './map';

// Re-export deepMap
export { deepMap } from './deepMap';
export type { DeepMap } from './deepMap';

// Re-export task
export { task } from './task';
export type { TaskState, TaskAtom } from './task';

// Re-export lifecycle events
export { onStart, onStop, onSet, onNotify, onMount, listenKeys, listenPaths } from './events'; // Export onEvent functions
export type { KeyListener, PathListener, LifecycleListener } from './events'; // Keep types

// Re-export utility symbols
export { STORE_MAP_KEY_SET } from './keys';
