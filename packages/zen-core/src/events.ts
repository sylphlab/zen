// Event system implementation for functional atoms.
import type { Atom } from './atom'; // Import specific types
// Removed unused: import type { ReadonlyAtom } from './computed';
// Removed unused: import type { MapAtom } from './map';
// Removed unused: import type { DeepMapAtom } from './deepMap';
import type { Listener, Unsubscribe, AnyAtom, AtomWithValue, MapAtom, DeepMapAtom } from './types'; // Import base types and merged types
// getBaseAtom removed
import { STORE_MAP_KEY_SET } from './keys'; // Symbol to identify map/deepMap atoms
import { Path, PathArray, getDeep } from './deepMapInternal'; // Utilities for deepMap

// --- Types ---

/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = any> = (value?: T) => void; // Keep this export here for now
/** Listener for deepMap path changes. */
export type PathListener<T> = (value: any, path: Path, obj: T) => void;
/** Listener for map key changes. */
export type KeyListener<T, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void;

// --- Type Guard ---

// Removed isMutableAtom type guard as onSet now only accepts Atom<T>

// --- Internal Helper for Removing Listeners ---
function _unsubscribe( // Remove generics as we operate on AnyAtom<any>
  a: AnyAtom<any>,
  listenerSetProp: '_startListeners' | '_stopListeners' | '_setListeners' | '_notifyListeners' | '_mountListeners',
  fn: LifecycleListener<any>
): void {
  // Operate directly on atom 'a' - it now holds the listeners directly
  const ls = (a as AtomWithValue<any>)[listenerSetProp] as Set<LifecycleListener<any>> | undefined;
  if (ls) {
    ls.delete(fn); // Use Set delete
    if (!ls.size) delete (a as AtomWithValue<any>)[listenerSetProp]; // Delete from atom 'a'
  }
}

// --- Exported Lifecycle Listener Functions ---
// These functions now directly add/remove listeners to the atom's properties via getBaseAtom.

/** Attaches a listener triggered when the first subscriber appears. */
export function onStart<T>(a: AnyAtom<T>, fn: LifecycleListener<T>): Unsubscribe {
  const baseAtom = a as AtomWithValue<any>; // Cast for listener access
  baseAtom._startListeners ??= new Set();
  baseAtom._startListeners.add(fn); // Use Set add
  return () => _unsubscribe(a, '_startListeners', fn); // _unsubscribe now operates directly
}

/** Attaches a listener triggered when the last subscriber disappears. */
export function onStop<T>(a: AnyAtom<T>, fn: LifecycleListener<T>): Unsubscribe {
  const baseAtom = a as AtomWithValue<any>; // Cast for listener access
  baseAtom._stopListeners ??= new Set();
  baseAtom._stopListeners.add(fn); // Use Set add
  return () => _unsubscribe(a, '_stopListeners', fn);
}

/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
export function onSet<T>(a: Atom<T>, fn: LifecycleListener<T>): Unsubscribe {
  // Operate directly on the Atom<T>
  const baseAtom = a as AtomWithValue<any>; // Cast for listener access
  baseAtom._setListeners ??= new Set();
  baseAtom._setListeners.add(fn); // Use Set add
  return () => _unsubscribe(a, '_setListeners', fn); // Pass original atom 'a'
}

/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export function onNotify(a: AnyAtom<any>, fn: LifecycleListener<any>): Unsubscribe { // Use AnyAtom<any>
  const baseAtom = a as AtomWithValue<any>; // Cast for listener access
  baseAtom._notifyListeners ??= new Set();
  baseAtom._notifyListeners.add(fn); // Use Set add
  return () => _unsubscribe(a, '_notifyListeners', fn);
}

/** Attaches a listener triggered immediately and only once upon attachment. */
export function onMount(a: AnyAtom<any>, fn: LifecycleListener<any>): Unsubscribe { // Use AnyAtom<any>
  const baseAtom = a as AtomWithValue<any>; // Cast for listener access
  baseAtom._mountListeners ??= new Set();
  baseAtom._mountListeners.add(fn); // Use Set add
  try {
    fn(undefined); // Call immediately
  } catch (err) {
    console.error(`Error in onMount listener for atom ${String(a)}:`, err);
  }
  return () => _unsubscribe(a, '_mountListeners', fn);
}


// --- Key/Path Listeners (Primarily for Map/DeepMap) ---

// WeakMaps to store listeners associated with specific map/deepMap *internal* atoms.
const pathListeners = new WeakMap<AtomWithValue<any>, Map<string, Set<PathListener<any>>>>(); // Key is AtomWithValue
const keyListeners = new WeakMap<AtomWithValue<any>, Map<any, Set<KeyListener<any>>>>(); // Key is AtomWithValue

/**
 * Listens to changes at specific paths within a deepMap atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
export function listenPaths<T extends object>(
  a: AnyAtom<T>, // Accept AnyAtom (MapAtom, DeepMapAtom, etc.)
  paths: Path[],
  fn: PathListener<T>
): Unsubscribe {
  // Operate directly on the atom 'a' (which is MapAtom or DeepMapAtom)
  const mapOrDeepMapAtom = a as MapAtom | DeepMapAtom;

  // Check if it's a Map/DeepMap atom by checking the marker
  if (!(mapOrDeepMapAtom as any)[STORE_MAP_KEY_SET]) {
    console.warn('listenPaths called on an incompatible atom type. Listener ignored.');
    return () => {}; // Return no-op unsubscribe
  }

  let atomPathListeners = pathListeners.get(mapOrDeepMapAtom); // Use atom 'a' as key
  if (!atomPathListeners) {
    atomPathListeners = new Map();
    pathListeners.set(mapOrDeepMapAtom, atomPathListeners);
  }

  // Normalize paths to strings using null character separator for arrays
  const pathStrings = paths.map(p => Array.isArray(p) ? p.join('\0') : String(p));

  pathStrings.forEach(ps => {
    let listenersForPath = atomPathListeners!.get(ps);
    if (!listenersForPath) {
      listenersForPath = new Set();
      atomPathListeners!.set(ps, listenersForPath);
    }
    listenersForPath.add(fn as PathListener<any>);
  });

  return () => { // Return function starts here
    // Operate directly on the atom 'a' for unsubscribe
    const mapOrDeepMapAtomUnsub = a as MapAtom | DeepMapAtom;

    const currentAtomListeners = pathListeners.get(mapOrDeepMapAtomUnsub);
    if (!currentAtomListeners) return; // Ensure return if no listeners for atom

    pathStrings.forEach(ps => {
      const listenersForPath = currentAtomListeners.get(ps);
      if (listenersForPath) {
        listenersForPath.delete(fn as PathListener<any>);
        if (!listenersForPath.size) {
          currentAtomListeners.delete(ps); // Clean up path entry if no listeners left
        }
      }
    });

    if (!currentAtomListeners.size) {
      pathListeners.delete(mapOrDeepMapAtomUnsub); // Use atom 'a' as key
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
export function _emitPathChanges<T extends object>(
  a: Atom<T>, changedPaths: Path[], finalValue: T // Expects the internal Atom<T>
): void {
  // console.log('_emitPathChanges called for atom:', a?.$$id?.toString()); // Debug log
  const atomPathListeners = pathListeners.get(a); // Key is the internal atom
  // console.log('Path listeners found in WeakMap:', atomPathListeners); // Debug log
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
            listener(valueAtPath, changedPath, finalValue);
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
export function listenKeys<T extends object, K extends keyof T>(
  a: AnyAtom<T>, // Accept AnyAtom
  keys: K[],
  fn: KeyListener<T, K>
): Unsubscribe {
  // Operate directly on the atom 'a' (which is MapAtom or DeepMapAtom)
  const mapOrDeepMapAtom = a as MapAtom | DeepMapAtom;

   // Check if it's a Map/DeepMap atom by checking the marker
   if (!(mapOrDeepMapAtom as any)[STORE_MAP_KEY_SET]) {
    console.warn('listenKeys called on an incompatible atom type. Listener ignored.');
    return () => {}; // Return no-op unsubscribe
  }

  let atomKeyListeners = keyListeners.get(mapOrDeepMapAtom); // Use atom 'a' as key
  if (!atomKeyListeners) {
    atomKeyListeners = new Map();
    keyListeners.set(mapOrDeepMapAtom, atomKeyListeners);
  }

  keys.forEach(k => {
    let listenersForKey = atomKeyListeners!.get(k);
    if (!listenersForKey) {
      listenersForKey = new Set();
      atomKeyListeners!.set(k, listenersForKey);
    }
    listenersForKey.add(fn as KeyListener<any>);
  });

  return () => { // Return function starts here
    // Operate directly on the atom 'a' for unsubscribe
    const mapOrDeepMapAtomUnsub = a as MapAtom | DeepMapAtom;

    const currentAtomListeners = keyListeners.get(mapOrDeepMapAtomUnsub);
    if (!currentAtomListeners) return; // Ensure return if no listeners for atom

    keys.forEach(k => {
      const listenersForKey = currentAtomListeners.get(k);
      if (listenersForKey) {
        listenersForKey.delete(fn as KeyListener<any>);
        if (!listenersForKey.size) {
          currentAtomListeners.delete(k); // Clean up key entry if no listeners left
        }
      }
    });

    if (!currentAtomListeners.size) {
      keyListeners.delete(mapOrDeepMapAtomUnsub); // Use atom 'a' as key
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
export function _emitKeyChanges<T extends object>(
  a: Atom<T>, changedKeys: ReadonlyArray<keyof T>, finalValue: T // Expects the internal Atom<T>
): void {
  // console.log('_emitKeyChanges called for atom:', a?.$$id?.toString()); // Debug log
  const atomKeyListeners = keyListeners.get(a); // Key is the internal atom
  // console.log('Key listeners found in WeakMap:', atomKeyListeners); // Debug log
  if (!atomKeyListeners?.size) return;

  changedKeys.forEach(k => {
    const listenersForKey = atomKeyListeners.get(k);
    if (listenersForKey?.size) {
      const valueAtKey = finalValue[k];
      // Optimization for single listener
      if (listenersForKey.size === 1) {
        const listener = listenersForKey.values().next().value;
        try {
          listener?.(valueAtKey, k as any, finalValue);
        } catch (err) {
          console.error(`Error in key listener for key "${String(k)}" on atom ${String(a)}:`, err);
        }
      } else {
        // Iterate for multiple listeners
        listenersForKey.forEach(listener => {
          try {
            listener?.(valueAtKey, k as any, finalValue);
          } catch (err) {
            console.error(`Error in key listener for key "${String(k)}" on atom ${String(a)}:`, err);
          }
        });
      }
    }
  });
}
