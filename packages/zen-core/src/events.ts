// Removed unused: import type { ReadonlyZen } from './computed';
// Removed unused: import type { MapZen } from './map';
// Removed unused: import type { DeepMapZen } from './deepMap';
import type {
  /* Listener, */ AnyZen,
  DeepMapZen,
  MapZen,
  Unsubscribe,
  ZenValue,
  ZenWithValue,
} from './types'; // Import ZenValue, remove unused Listener, ADD MapZen back
// Event system implementation for functional zens.
import type { Zen } from './zen'; // Import specific types
// getBaseZen removed
// Removed import { STORE_MAP_KEY_SET } from './keys';
// Removed import { Path, PathArray, getDeep } from './deepMapInternal'; // Utilities for deepMap - getDeep is now local
// DELETE THIS LINE -> import { Path, PathArray, getDeep } from './deepMapInternal'; // Utilities for deepMap

// --- getDeep Helper (from deepMapInternal.ts) ---
/**
 * Gets a value from a nested object based on a path.
 * @param obj The object to read from.
 * @param path The path (string or array) to the desired value.
 * @returns The value at the path, or undefined if the path doesn't exist.
 * @internal
 */
export const getDeep = (obj: unknown, path: PathArray): unknown => {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    // Use type assertion for indexing
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
};

// --- Path Types (copied from deepMap.ts) ---
export type PathString = string;
export type PathArray = (string | number)[];
/** Represents a path within a nested object, either as a dot-separated string or an array of keys/indices. */
export type Path = PathString | PathArray;

// --- Types ---

/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = unknown> = (value?: T) => void; // Keep unknown
/** Listener for deepMap path changes. */
export type PathListener<T extends object, V = unknown> = (value: V, path: Path, obj: T) => void; // Add constraint T extends object
/** Listener for map key changes. */
// Use generics for KeyListener value type (T[K] is already specific)
export type KeyListener<T extends object, K extends keyof T = keyof T> = (
  value: T[K] | undefined,
  key: K,
  obj: T,
) => void; // Add constraint T extends object

// --- Type Guard ---

// Removed isMutableZen type guard as onSet now only accepts Zen<T>

// --- Internal Helper for Removing Listeners ---
// Update _unsubscribe to use generics properly
function _unsubscribe<A extends AnyZen>(
  a: A,
  listenerSetProp:
    | '_startListeners'
    | '_stopListeners'
    | '_setListeners'
    | '_notifyListeners'
    | '_mountListeners',
  fn: LifecycleListener<ZenValue<A>>, // Use ZenValue<A>
): void {
  // Operate directly on zen 'a'
  const baseZen = a as ZenWithValue<ZenValue<A>>; // Cast using ZenValue<A>
  const ls = baseZen[listenerSetProp]; // Type is Set<LifecycleListener<ZenValue<A>>> | undefined
  if (ls) {
    ls.delete(fn); // Use Set delete
    if (!ls.size) delete baseZen[listenerSetProp]; // Clean up if empty
  }
}

// --- Exported Lifecycle Listener Functions ---
// These functions now directly add/remove listeners to the zen's properties via getBaseZen.

/** Attaches a listener triggered when the first subscriber appears. */
export function onStart<A extends AnyZen>(a: A, fn: LifecycleListener<ZenValue<A>>): Unsubscribe {
  const baseZen = a as ZenWithValue<ZenValue<A>>; // Use ZenValue
  baseZen._startListeners ??= new Set();
  baseZen._startListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_startListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered when the last subscriber disappears. */
export function onStop<A extends AnyZen>(a: A, fn: LifecycleListener<ZenValue<A>>): Unsubscribe {
  const baseZen = a as ZenWithValue<ZenValue<A>>; // Use ZenValue
  baseZen._stopListeners ??= new Set();
  baseZen._stopListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_stopListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered *before* a mutable zen's value is set (only outside batch). */
// Keep specific Zen<T> type here for type safety
export function onSet<T>(a: Zen<T>, fn: LifecycleListener<T>): Unsubscribe {
  // a is already ZenWithValue<T>
  a._setListeners ??= new Set();
  a._setListeners.add(fn);
  // _unsubscribe expects A extends AnyZen and Listener<ZenValue<A>>.
  // Cast 'a' to AnyZen, and 'fn' to any to satisfy the generic signature.
  // biome-ignore lint/suspicious/noExplicitAny: Internal _unsubscribe requires any for listener
  return () => _unsubscribe(a as AnyZen, '_setListeners', fn as any);
}

/** Attaches a listener triggered *after* an zen's value listeners have been notified. */
export function onNotify<A extends AnyZen>(a: A, fn: LifecycleListener<ZenValue<A>>): Unsubscribe {
  const baseZen = a as ZenWithValue<ZenValue<A>>; // Use ZenValue
  baseZen._notifyListeners ??= new Set();
  baseZen._notifyListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_notifyListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered immediately and only once upon attachment. */
export function onMount<A extends AnyZen>(a: A, fn: LifecycleListener<ZenValue<A>>): Unsubscribe {
  const baseZen = a as ZenWithValue<ZenValue<A>>; // Use ZenValue
  baseZen._mountListeners ??= new Set();
  baseZen._mountListeners.add(fn); // Add correctly typed listener
  // _unsubscribe expects A extends AnyZen and Listener<ZenValue<A>>.
  // 'a' is A extends AnyZen, 'fn' is Listener<ZenValue<A>>. Should match directly.
  return () => _unsubscribe(a, '_mountListeners', fn);
}

// --- Key/Path Listeners (Primarily for Map/DeepMap) ---

// WeakMaps to store listeners associated with specific map/deepMap *internal* zens.
// Update WeakMap types to be more specific
// Key is the Map/DeepMap zen itself, Value maps path string to Set of specific PathListeners
const pathListeners = new WeakMap<
  // biome-ignore lint/suspicious/noExplicitAny: WeakMap key requires any here
  MapZen<any> | DeepMapZen<any>,
  // biome-ignore lint/suspicious/noExplicitAny: PathListener generic requires any here
  Map<string, Set<PathListener<any, any>>>
>(); // Add MapZen back
// Key is the Map/DeepMap zen, Value maps key to Set of specific KeyListeners
const keyListeners = new WeakMap<
  // biome-ignore lint/suspicious/noExplicitAny: WeakMap key requires any here
  MapZen<any> | DeepMapZen<any>,
  // biome-ignore lint/suspicious/noExplicitAny: KeyListener generic requires any here
  Map<keyof any, Set<KeyListener<any, any>>>
>(); // Add MapZen back

/**
 * Listens to changes at specific paths within a deepMap zen.
 * Relies on the internal zen having the `STORE_MAP_KEY_SET` symbol.
 */
// Use generic A constrained to MapZen | DeepMapZen, use ZenValue<A> for listener
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function listenPaths<A extends MapZen<any> | DeepMapZen<any>>(
  // Add MapZen back
  a: A,
  paths: Path[],
  fn: PathListener<ZenValue<A>>, // Use ZenValue<A>
): Unsubscribe {
  // Check if it's a Map or DeepMap zen by checking _kind property
  if (a._kind !== 'map' && a._kind !== 'deepMap') {
    // Add 'map' check back
    return () => {}; // Return no-op unsubscribe
  }

  // Get or create listeners map for this specific zen 'a'
  let zenPathListeners = pathListeners.get(a);
  if (!zenPathListeners) {
    zenPathListeners = new Map();
    pathListeners.set(a, zenPathListeners);
  }

  // Normalize paths to strings using null character separator for arrays
  const pathStrings = paths.map((p) =>
    Array.isArray(p) ? p.join('\0') : String(p).split('.').join('\0'),
  ); // Normalize string paths too

  for (const ps of pathStrings) {
    let listenersForPath = zenPathListeners?.get(ps);
    if (!listenersForPath) {
      listenersForPath = new Set();
      zenPathListeners?.set(ps, listenersForPath);
    }
    // Add the correctly typed listener
    // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
    listenersForPath.add(fn as PathListener<any, any>); // Cast needed due to WeakMap/Set variance issues
  }

  return () => {
    // Return function starts here
    const currentZenListeners = pathListeners.get(a);
    if (!currentZenListeners) return;

    for (const ps of pathStrings) {
      const listenersForPath = currentZenListeners.get(ps);
      if (listenersForPath) {
        // Delete the correctly typed listener
        // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
        listenersForPath.delete(fn as PathListener<any, any>); // Cast needed
        if (!listenersForPath.size) {
          currentZenListeners.delete(ps); // Clean up path entry
        }
      }
    }

    if (!currentZenListeners.size) {
      pathListeners.delete(a); // Clean up zen entry
    }
  }; // Return function ends here
}

/** @internal */
function _isPrefixMatch(
  registeredPathArray: string[],
  changedPathArray: (string | number)[],
): boolean {
  const registeredPathLength = registeredPathArray.length;
  if (registeredPathLength > changedPathArray.length) {
    return false; // Cannot be a prefix if longer
  }
  for (let i = 0; i < registeredPathLength; i++) {
    // Ensure consistent string comparison
    if (String(registeredPathArray[i]) !== String(changedPathArray[i])) {
      return false;
    }
  }
  return true;
}

/** @internal */
// biome-ignore lint/suspicious/noExplicitAny: Inherited from WeakMap definition
function _notifyPathListeners(
  listenersSet: Set<PathListener<any, any>>,
  valueAtPath: unknown,
  changedPath: Path,
  finalValue: object, // Cast from ZenValue<A>
): void {
  for (const listener of listenersSet) {
    try {
      listener(valueAtPath, changedPath, finalValue);
    } catch (_err) {}
  }
}

/**
 * Internal function called by map/deepMap `set` functions to emit path changes.
 * @param a The *internal* zen of the map/deepMap.
 * @param changedPaths Array of paths that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
// Update _emitPathChanges signature
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function _emitPathChanges<A extends MapZen<any> | DeepMapZen<any>>(
  // Add MapZen back
  a: A,
  changedPaths: Path[],
  finalValue: ZenValue<A>, // Use ZenValue
): void {
  const zenPathListeners = pathListeners.get(a);
  if (!zenPathListeners?.size || !changedPaths.length) return;

  // Normalize changed paths for efficient lookup (stringified with null char separator)
  const normalizedChanged = new Map<string, { path: Path; array: PathArray }>();
  for (const p of changedPaths) {
    const arrayPath = Array.isArray(p) ? p : String(p).split('.'); // Assume dot notation if string
    normalizedChanged.set(arrayPath.join('\0'), { path: p, array: arrayPath });
  }

  // Iterate through registered listener paths (also stringified with null char separator)
  for (const [registeredPathString, listenersSet] of zenPathListeners) {
    const registeredPathArray = registeredPathString.split('\0');
    // const registeredPathLength = registeredPathArray.length; // Removed unused variable

    // Check each changed path against the registered path
    for (const [, { path: changedPath, array: changedPathArray }] of normalizedChanged.entries()) {
      // --- Path Matching Logic ---
      // A listener for path 'a.b' should be notified if 'a.b', 'a.b.c', or 'a.b[0]' changes.
      // Therefore, we check if the *registered* path is a prefix of (or equal to) the *changed* path.
      const isMatch = _isPrefixMatch(registeredPathArray, changedPathArray);

      if (isMatch) {
        const valueAtPath = getDeep(finalValue, changedPathArray);
        _notifyPathListeners(listenersSet, valueAtPath, changedPath, finalValue as object);
        // Optimization note remains valid conceptually, but logic is now in helpers.
      }
    }
  }
}

/**
 * Listens to changes for specific keys within a map zen.
 * Relies on the internal zen having the `STORE_MAP_KEY_SET` symbol.
 */
// Update listenKeys signature
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function listenKeys<A extends MapZen<any> | DeepMapZen<any>, K extends keyof ZenValue<A>>(
  // Add MapZen back
  a: A,
  keys: K[],
  fn: KeyListener<ZenValue<A>, K>, // Use ZenValue<A>
): Unsubscribe {
  // Check if it's a Map or DeepMap zen by checking _kind property
  if (a._kind !== 'map' && a._kind !== 'deepMap') {
    // Add 'map' check back
    return () => {}; // Return no-op unsubscribe
  }

  // Get or create listeners map for this specific zen 'a'
  let zenKeyListeners = keyListeners.get(a);
  if (!zenKeyListeners) {
    zenKeyListeners = new Map();
    keyListeners.set(a, zenKeyListeners);
  }

  for (const k of keys) {
    let listenersForKey = zenKeyListeners?.get(k);
    if (!listenersForKey) {
      listenersForKey = new Set();
      zenKeyListeners?.set(k, listenersForKey);
    }
    // Add the correctly typed listener
    // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
    listenersForKey.add(fn as KeyListener<any, any>); // Cast needed due to WeakMap/Set variance issues
  }

  return () => {
    // Return function starts here
    const currentZenListeners = keyListeners.get(a);
    if (!currentZenListeners) return;

    for (const k of keys) {
      const listenersForKey = currentZenListeners.get(k);
      if (listenersForKey) {
        // Delete the correctly typed listener
        // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
        listenersForKey.delete(fn as KeyListener<any, any>); // Cast needed
        if (!listenersForKey.size) {
          currentZenListeners.delete(k); // Clean up key entry
        }
      }
    }

    if (!currentZenListeners.size) {
      keyListeners.delete(a); // Clean up zen entry
    }
  }; // Return function ends here
}

/** @internal */
// biome-ignore lint/suspicious/noExplicitAny: Inherited from WeakMap definition
function _notifyKeyListenersForKey<T extends object, K extends keyof T>(
  listenersForKey: Set<KeyListener<any, any>>,
  valueAtKey: T[K] | undefined,
  k: K,
  finalValue: T,
): void {
  // Optimization for single listener
  if (listenersForKey.size === 1) {
    const listener = listenersForKey.values().next().value as KeyListener<T, K>;
    try {
      listener?.(valueAtKey, k, finalValue);
    } catch (_err) {}
  } else {
    // Iterate for multiple listeners
    for (const listener of listenersForKey) {
      const typedListener = listener as KeyListener<T, K>;
      try {
        typedListener?.(valueAtKey, k, finalValue);
      } catch (_err) {}
    }
  }
}

/**
 * Internal function called by map/deepMap `set` functions to emit key changes.
 * @param a The *internal* zen of the map/deepMap.
 * @param changedKeys Array of keys that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
// Update _emitKeyChanges signature
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function _emitKeyChanges<A extends MapZen<any> | DeepMapZen<any>>(
  // Add MapZen back
  a: A,
  changedKeys: ReadonlyArray<keyof ZenValue<A>>,
  finalValue: ZenValue<A>, // Use ZenValue
): void {
  const zenKeyListeners = keyListeners.get(a);
  if (!zenKeyListeners?.size) return;

  for (const k of changedKeys) {
    const listenersForKey = zenKeyListeners.get(k);
    if (listenersForKey?.size) {
      const valueAtKey = finalValue[k];
      _notifyKeyListenersForKey(
        listenersForKey,
        valueAtKey,
        k,
        finalValue, // Remove incorrect 'as object' cast
      );
    }
  }
}
