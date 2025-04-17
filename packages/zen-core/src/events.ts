// Event system implementation for functional atoms.
import type { Atom } from './atom'; // Import specific types
// Removed unused: import type { ReadonlyAtom } from './computed';
// Removed unused: import type { MapAtom } from './map';
// Removed unused: import type { DeepMapAtom } from './deepMap';
import type { /* Listener, */ Unsubscribe, AnyAtom, AtomValue, AtomWithValue, MapAtom, DeepMapAtom } from './types'; // Import AtomValue, remove unused Listener
// getBaseAtom removed
import { STORE_MAP_KEY_SET } from './keys'; // Symbol to identify map/deepMap atoms
import { Path, PathArray, getDeep } from './deepMapInternal'; // Utilities for deepMap

// --- Types ---

/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = unknown> = (value?: T) => void; // Keep unknown
/** Listener for deepMap path changes. */
export type PathListener<T extends object, V = unknown> = (value: V, path: Path, obj: T) => void; // Add constraint T extends object
/** Listener for map key changes. */
// Use generics for KeyListener value type (T[K] is already specific)
export type KeyListener<T extends object, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void; // Add constraint T extends object

// --- Type Guard ---

// Removed isMutableAtom type guard as onSet now only accepts Atom<T>

// --- Internal Helper for Removing Listeners ---
// Update _unsubscribe to use generics properly
function _unsubscribe<A extends AnyAtom>(
  a: A,
  listenerSetProp: '_startListeners' | '_stopListeners' | '_setListeners' | '_notifyListeners' | '_mountListeners',
  fn: LifecycleListener<AtomValue<A>> // Use AtomValue<A>
): void {
  // Operate directly on atom 'a'
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Cast using AtomValue<A>
  const ls = baseAtom[listenerSetProp]; // Type is Set<LifecycleListener<AtomValue<A>>> | undefined
  if (ls) {
    ls.delete(fn); // Use Set delete
    if (!ls.size) delete baseAtom[listenerSetProp]; // Clean up if empty
  }
}

// --- Exported Lifecycle Listener Functions ---
// These functions now directly add/remove listeners to the atom's properties via getBaseAtom.

/** Attaches a listener triggered when the first subscriber appears. */
export function onStart<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._startListeners ??= new Set();
  baseAtom._startListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_startListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered when the last subscriber disappears. */
export function onStop<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._stopListeners ??= new Set();
  baseAtom._stopListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_stopListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
// Keep specific Atom<T> type here for type safety
export function onSet<T>(a: Atom<T>, fn: LifecycleListener<T>): Unsubscribe {
  // a is already AtomWithValue<T>
  a._setListeners ??= new Set();
  a._setListeners.add(fn);
  // Pass the specific Atom<T> to _unsubscribe, it fits A extends AnyAtom
  return () => _unsubscribe(a, '_setListeners', fn);
}

/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export function onNotify<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._notifyListeners ??= new Set();
  baseAtom._notifyListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_notifyListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered immediately and only once upon attachment. */
export function onMount<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._mountListeners ??= new Set();
  baseAtom._mountListeners.add(fn); // Add correctly typed listener
  try {
    fn(undefined); // Call immediately
  } catch (err) {
    console.error(`Error in onMount listener for atom ${String(a)}:`, err);
  }
  // Cast args for _unsubscribe (already unknown)
  return () => _unsubscribe(a, '_mountListeners', fn);
}


// --- Key/Path Listeners (Primarily for Map/DeepMap) ---

// WeakMaps to store listeners associated with specific map/deepMap *internal* atoms.
// Update WeakMap types to be more specific
// Key is the Map/DeepMap atom itself, Value maps path string to Set of specific PathListeners
const pathListeners = new WeakMap<MapAtom<any> | DeepMapAtom<any>, Map<string, Set<PathListener<any, any>>>>();
// Key is the Map/DeepMap atom, Value maps key to Set of specific KeyListeners
const keyListeners = new WeakMap<MapAtom<any> | DeepMapAtom<any>, Map<keyof any, Set<KeyListener<any, any>>>>();


/**
 * Listens to changes at specific paths within a deepMap atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
// Use generic A constrained to Map/DeepMap, use AtomValue<A> for listener
export function listenPaths<A extends MapAtom<any> | DeepMapAtom<any>>(
  a: A,
  paths: Path[],
  fn: PathListener<AtomValue<A>> // Use AtomValue<A>
): Unsubscribe {
  // Check if it's a Map/DeepMap atom by checking the marker
  if (!(a as any)[STORE_MAP_KEY_SET]) { // Keep runtime check
    console.warn('listenPaths called on an incompatible atom type. Listener ignored.');
    return () => {}; // Return no-op unsubscribe
  }

  // Get or create listeners map for this specific atom 'a'
  let atomPathListeners = pathListeners.get(a);
  if (!atomPathListeners) {
    atomPathListeners = new Map();
    pathListeners.set(a, atomPathListeners);
  }

  // Normalize paths to strings using null character separator for arrays
  const pathStrings = paths.map(p => Array.isArray(p) ? p.join('\0') : String(p));

  pathStrings.forEach(ps => {
    let listenersForPath = atomPathListeners!.get(ps);
    if (!listenersForPath) {
      listenersForPath = new Set();
      atomPathListeners!.set(ps, listenersForPath);
    }
    // Add the correctly typed listener
    listenersForPath.add(fn as PathListener<any, any>); // Cast needed due to WeakMap/Set variance issues
  });

  return () => { // Return function starts here
    const currentAtomListeners = pathListeners.get(a);
    if (!currentAtomListeners) return;

    pathStrings.forEach(ps => {
      const listenersForPath = currentAtomListeners.get(ps);
      if (listenersForPath) {
        // Delete the correctly typed listener
        listenersForPath.delete(fn as PathListener<any, any>); // Cast needed
        if (!listenersForPath.size) {
          currentAtomListeners.delete(ps); // Clean up path entry
        }
      }
    });

    if (!currentAtomListeners.size) {
      pathListeners.delete(a); // Clean up atom entry
    }
  }; // Return function ends here
}

/**
 * Internal function called by map/deepMap `set` functions to emit path changes.
 * @param a The *internal* atom of the map/deepMap.
 * @param changedPaths Array of paths that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
// Update _emitPathChanges signature
export function _emitPathChanges<A extends MapAtom<any> | DeepMapAtom<any>>(
  a: A, changedPaths: Path[], finalValue: AtomValue<A> // Use AtomValue
): void {
  const atomPathListeners = pathListeners.get(a);
  if (!atomPathListeners?.size || !changedPaths.length) return;

  // Normalize changed paths for efficient lookup (stringified with null char separator)
  const normalizedChanged = new Map<string, {path: Path, array: PathArray}>();
  changedPaths.forEach(p => {
    const arrayPath = Array.isArray(p) ? p : String(p).split('.'); // Assume dot notation if string
    normalizedChanged.set(arrayPath.join('\0'), {path: p, array: arrayPath});
  });

  // Iterate through registered listener paths (also stringified with null char separator)
  atomPathListeners.forEach((listenersSet, registeredPathString) => {
    const registeredPathArray = registeredPathString.split('\0');
    const registeredPathLength = registeredPathArray.length;

    // Check each changed path against the registered path
    for (const [ , {path: changedPath, array: changedPathArray}] of normalizedChanged.entries()) {
      // --- Path Matching Logic ---
      // A listener for path 'a.b' should be notified if 'a.b', 'a.b.c', or 'a.b[0]' changes.
      // Therefore, we check if the *registered* path is a prefix of (or equal to) the *changed* path.
      let isPrefixMatch = registeredPathLength <= changedPathArray.length;
      if (isPrefixMatch) {
        for (let i = 0; i < registeredPathLength; i++) {
          // Ensure consistent string comparison for array indices vs. string keys
          if (String(registeredPathArray[i]) !== String(changedPathArray[i])) {
            isPrefixMatch = false;
            break;
          }
        }
      }
      // --- End Path Matching Logic ---

      if (isPrefixMatch) {
        // If it's a match, get the value at the *changed* path and notify listeners
        // This ensures listeners for 'a.b' get the value of 'a.b.c' if that's what changed.
        const valueAtPath = getDeep(finalValue, changedPathArray);
        listenersSet.forEach(listener => {
          try {
            // Pass the original changed path (string or array) back to the listener
            // Cast finalValue to expected object type for listener
            listener(valueAtPath, changedPath, finalValue as object);
          } catch (err) {
            console.error(`Error in path listener for path "${registeredPathString}" on atom ${String(a)}:`, err);
          }
        });
        // Optimization: If a specific changed path matches, no need to check further changed paths for *this* registered listener path.
        // However, different registered paths might match the same changed path, so we don't break the outer loop.
      }
    }
  });
}

/**
 * Listens to changes for specific keys within a map atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
// Update listenKeys signature
export function listenKeys<A extends MapAtom<any> | DeepMapAtom<any>, K extends keyof AtomValue<A>>(
  a: A,
  keys: K[],
  fn: KeyListener<AtomValue<A>, K> // Use AtomValue<A>
): Unsubscribe {
   // Check if it's a Map/DeepMap atom by checking the marker
  if (!(a as any)[STORE_MAP_KEY_SET]) { // Keep runtime check
    console.warn('listenKeys called on an incompatible atom type. Listener ignored.');
    return () => {}; // Return no-op unsubscribe
  }

  // Get or create listeners map for this specific atom 'a'
  let atomKeyListeners = keyListeners.get(a);
  if (!atomKeyListeners) {
    atomKeyListeners = new Map();
    keyListeners.set(a, atomKeyListeners);
  }

  keys.forEach(k => {
    let listenersForKey = atomKeyListeners!.get(k);
    if (!listenersForKey) {
      listenersForKey = new Set();
      atomKeyListeners!.set(k, listenersForKey);
    }
    // Add the correctly typed listener
    listenersForKey.add(fn as KeyListener<any, any>); // Cast needed due to WeakMap/Set variance issues
  });

  return () => { // Return function starts here
    const currentAtomListeners = keyListeners.get(a);
    if (!currentAtomListeners) return;

    keys.forEach(k => {
      const listenersForKey = currentAtomListeners.get(k);
      if (listenersForKey) {
        // Delete the correctly typed listener
        listenersForKey.delete(fn as KeyListener<any, any>); // Cast needed
        if (!listenersForKey.size) {
          currentAtomListeners.delete(k); // Clean up key entry
        }
      }
    });

    if (!currentAtomListeners.size) {
      keyListeners.delete(a); // Clean up atom entry
    }
  }; // Return function ends here
}

/**
 * Internal function called by map/deepMap `set` functions to emit key changes.
 * @param a The *internal* atom of the map/deepMap.
 * @param changedKeys Array of keys that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
// Update _emitKeyChanges signature
export function _emitKeyChanges<A extends MapAtom<any> | DeepMapAtom<any>>(
  a: A, changedKeys: ReadonlyArray<keyof AtomValue<A>>, finalValue: AtomValue<A> // Use AtomValue
): void {
  const atomKeyListeners = keyListeners.get(a);
  if (!atomKeyListeners?.size) return;

  changedKeys.forEach(k => {
    const listenersForKey = atomKeyListeners.get(k);
    if (listenersForKey?.size) {
      const valueAtKey = finalValue[k];
      // Optimization for single listener
      if (listenersForKey.size === 1) {
        const listener = listenersForKey.values().next().value as KeyListener<AtomValue<A>, typeof k>; // Cast listener
        try {
          // Pass correctly typed key and value
          listener?.(valueAtKey, k, finalValue);
        } catch (err) {
          console.error(`Error in key listener for key "${String(k)}" on atom ${String(a)}:`, err);
        }
      } else {
        // Iterate for multiple listeners
        listenersForKey.forEach(listener => {
          const typedListener = listener as KeyListener<AtomValue<A>, typeof k>; // Cast listener
          try {
            // Pass correctly typed key and value
            typedListener?.(valueAtKey, k, finalValue);
          } catch (err) {
            console.error(`Error in key listener for key "${String(k)}" on atom ${String(a)}:`, err);
          }
        });
      }
    }
  });
}
