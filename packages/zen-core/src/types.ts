import type { BatchedZen } from './batched'; // Import BatchedZen
import type { ComputedZen } from './computed'; // Only import ComputedZen
// Base type definitions shared across the library.
// import type { LifecycleListener, KeyListener, PathListener } from './events'; // Remove unused imports
import type { Zen } from './zen';
// ReadonlyZen will be an alias, DeepMapZen defined below

/** Callback function type for zen listeners. */
export type Listener<T> = (value: T, oldValue?: T | null) => void;

/** Function to unsubscribe a listener. */
export type Unsubscribe = () => void;

/** Base structure for zens that directly hold value and listeners. */
export type ZenWithValue<T> = {
  /** Distinguishes zen types for faster checks */
  _kind: 'zen' | 'computed' | 'map' | 'deepMap' | 'task' | 'batched'; // Add 'batched'
  /** Current value */
  _value: T; // Value type enforced by generic, no null default
  /** Value listeners (Set for efficient add/delete/has) */
  _listeners?: Set<Listener<T>>;
  // Restore lifecycle listener properties using broader types for simplicity
  // biome-ignore lint/suspicious/noExplicitAny: Listener sets use any for simplicity
  _startListeners?: Set<any>; // Use Set<any> or Set<Function>
  // biome-ignore lint/suspicious/noExplicitAny: Listener sets use any for simplicity
  _stopListeners?: Set<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Listener sets use any for simplicity
  _setListeners?: Set<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Listener sets use any for simplicity
  _notifyListeners?: Set<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Listener sets use any for simplicity
  _mountListeners?: Set<any>;
  // Add properties for map/deepMap listeners using broader types
  // biome-ignore lint/suspicious/noExplicitAny: Listener maps use any for simplicity
  _keyListeners?: Map<any, Set<any>>;
  // biome-ignore lint/suspicious/noExplicitAny: Listener maps use any for simplicity
  _pathListeners?: Map<any, Set<any>>;
  // biome-ignore lint/suspicious/noExplicitAny: Listener maps use any for simplicity
  _mountCleanups?: Map<any, (() => void) | undefined>;
};

/** Represents the possible states of a TaskZen. */
export type TaskState<T = unknown> =
  // Add TaskState back
  | { loading: true; error?: undefined; data?: undefined }
  | { loading: false; error: Error; data?: undefined }
  | { loading: false; error?: undefined; data: T }
  | { loading: false; error?: undefined; data?: undefined }; // Initial state

// --- Merged Zen Type Definitions ---

/** Represents a Map Zen directly holding state and listeners. */
export type MapZen<T extends object = object> = ZenWithValue<T> & {
  // Add MapZen back
  _kind: 'map';
  // No extra properties needed, structure matches ZenWithValue<Object>
};

/** Represents a DeepMap Zen directly holding state and listeners. */
export type DeepMapZen<T extends object = object> = ZenWithValue<T> & {
  // Default to object, not any
  _kind: 'deepMap';
  // No extra properties needed, structure matches ZenWithValue<Object>
};

/** Represents a Task Zen holding state and the async function. */
export type TaskZen<T = void, Args extends unknown[] = unknown[]> = ZenWithValue<TaskState<T>> & {
  // Add TaskZen back
  _kind: 'task';
  _asyncFn: (...args: Args) => Promise<T>;
};

/** Utility type to extract the value type from any zen type. */
export type ZenValue<A extends AnyZen> = A extends ZenWithValue<infer V> ? V : never;

/** Union type for any kind of zen structure recognized by the library. */
// This union represents the structure, use ZenValue<A> to get the value type.
export type AnyZen =
  // biome-ignore lint/suspicious/noExplicitAny: Base union type requires any
  | Zen<any>
  // biome-ignore lint/suspicious/noExplicitAny: Base union type requires any
  | ComputedZen<any>
  | MapZen<object>
  | DeepMapZen<object>
  // biome-ignore lint/suspicious/noExplicitAny: Base union type requires any
  | TaskZen<any, any>
  // biome-ignore lint/suspicious/noExplicitAny: Base union type requires any
  | BatchedZen<any>; // Add BatchedZen<any>
