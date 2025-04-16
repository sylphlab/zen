// Event system implementation using dynamic patching for lifecycle and map listeners.
import { Atom, ReadonlyAtom, Listener, Unsubscribe, AtomProto as CoreAtomProto } from './core';
import { isInBatch } from './batch'; // Used to coordinate with batching system
import { STORE_MAP_KEY_SET } from './keys'; // Symbol to identify map/deepMap atoms
import { Path, PathArray, getDeep } from './deepMapInternal'; // Utilities for deepMap

// --- Types ---

/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = any> = (value?: T) => void;
/** Listener for deepMap path changes. */
export type PathListener<T> = (value: any, path: Path, obj: T) => void;
/** Listener for map key changes. */
export type KeyListener<T, K extends keyof T = keyof T> = (value: T[K] | undefined, key: K, obj: T) => void;

// --- Patching Logic ---

// Store original methods from the CORE prototype to ensure we can call base logic.
// Note: We capture these at module load time.
const coreOriginalSet = CoreAtomProto.set;
const coreOriginalSubscribe = CoreAtomProto.subscribe;
const coreOriginalNotify = CoreAtomProto._notify;

/** Type guard to check if an atom is mutable (not computed). */
function isMutableAtom<T>(a: Atom<T> | ReadonlyAtom<T>): a is Atom<T> {
  // A mutable atom has a 'set' method and is not derived (no '_sources').
  return typeof (a as Atom<T>).set === 'function' && !('_sources' in a);
}

/**
 * Ensures that the necessary event methods are patched onto the atom instance.
 * This function is idempotent; it only patches once per atom.
 * @param a The atom (mutable or readonly) to patch.
 */
function ensurePatched<T>(a: Atom<T> | ReadonlyAtom<T>): void {
  if (a._patchedForEvents) return;

  // --- Patch only MUTABLE atoms ---
  if (isMutableAtom(a)) {
    const instanceOriginalSet = a.set; // Capture instance's original set (could be core or already patched)
    // Patch set method
    a.set = function(this: Atom<T>, v: T, force = false) {
      const old = this._value;
      if (force || !Object.is(v, old)) {
        if (!isInBatch()) {
            // --- Outside batch ---
            // Trigger onSet listeners BEFORE setting value (only outside batch)
            (this._setListeners as Set<LifecycleListener<T>> | undefined)?.forEach((fn: LifecycleListener<T>) => {
              try { fn(v); } catch(e) { console.error(`Error in onSet listener for atom ${String(this)}:`, e); }
            });
            // Call the INSTANCE'S original set logic (could be core or batch-patched).
            // This ensures the correct notification (immediate or batched) occurs.
            instanceOriginalSet.call(this, v, force);
        } else {
            // --- Inside batch ---
            // Call the method currently on the CORE prototype (which should be batch.patchedSet if batching is active).
            // This ensures batching logic (deferring notification) takes over completely,
            // preventing immediate `onSet` or `onNotify` triggers from this patch.
            // The batching patch handles its own `onSet` triggering at the end of the batch.
            coreOriginalSet.call(this, v, force); // Use captured coreOriginalSet
        }
      }
    };
  }
  // --- End of mutable atom patching ---

  // --- Patch methods common to Atom and ReadonlyAtom ---

  const instanceOriginalNotify = a._notify; // Capture instance's original _notify
  // Patch _notify method (applies to both)
  a._notify = function(this: Atom<T> | ReadonlyAtom<T>, v: T, old?: T) {
    // Call INSTANCE'S original notify logic FIRST
    instanceOriginalNotify.call(this, v, old);
    // Trigger onNotify listeners AFTER value listeners
    (this._notifyListeners as Set<LifecycleListener<T>> | undefined)?.forEach((fn: LifecycleListener<T>) => {
      try { fn(v); } catch(e) { console.error(`Error in onNotify listener for atom ${String(this)}:`, e); }
    });
  };

  const instanceOriginalSubscribe = a.subscribe; // Capture instance's original subscribe
  // Patch subscribe method (applies to both)
  a.subscribe = function(this: Atom<T> | ReadonlyAtom<T>, fn: Listener<T>): Unsubscribe {
    const first = !this._listeners || this._listeners.size === 0;
    const unsub = instanceOriginalSubscribe.call(this, fn); // Call INSTANCE'S original subscribe logic FIRST

    if (first) { // Trigger onStart listeners if it's the first subscriber
      (this._startListeners as Set<LifecycleListener<T>> | undefined)?.forEach((l: LifecycleListener<T>) => {
        try { l(undefined); } catch(e) { console.error(`Error in onStart listener for atom ${String(this)}:`, e); }
      });
    }
    // onMount is handled by onMount function itself

    const self = this;
    return () => { // Return a patched unsubscribe function
      unsub(); // Call original unsubscribe
      if (!self._listeners || self._listeners.size === 0) { // Trigger onStop listeners if it's the last subscriber
        (self._stopListeners as Set<LifecycleListener<T>> | undefined)?.forEach((l: LifecycleListener<T>) => {
          try { l(undefined); } catch(e) { console.error(`Error in onStop listener for atom ${String(this)}:`, e); }
        });
      }
      };
    };
  // --- End of common patching ---

  a._patchedForEvents = true;
}


// --- Internal Helper for Removing Listeners ---
function _unsubscribe<T>(
  a: Atom<T> | ReadonlyAtom<T>,
  listenerSetProp: '_startListeners' | '_stopListeners' | '_setListeners' | '_notifyListeners' | '_mountListeners',
  fn: LifecycleListener<T>
): void {
  const ls = a[listenerSetProp];
  if (ls) {
    ls.delete(fn);
    if (!ls.size) delete a[listenerSetProp];
  }
}

// --- Exported Lifecycle Listener Functions (Patch atom on first use) ---

// --- Exported Lifecycle Listener Functions ---

/** Attaches a listener triggered when the first subscriber appears. */
export function onStart<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe {
  ensurePatched(a);
  a._startListeners ??= new Set();
  a._startListeners.add(fn);
  return () => _unsubscribe(a, '_startListeners', fn);
}

/** Attaches a listener triggered when the last subscriber disappears. */
export function onStop<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe {
  ensurePatched(a);
  a._stopListeners ??= new Set();
  a._stopListeners.add(fn);
  return () => _unsubscribe(a, '_stopListeners', fn);
}

/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
export function onSet<T>(a: Atom<T>, fn: LifecycleListener<T>): Unsubscribe {
  // This check is technically redundant due to the `Atom<T>` type hint,
  // but kept for explicit safety and clarity.
  if (!isMutableAtom(a)) {
    throw new Error('onSet can only be used with mutable atoms (atom, map, deepMap)');
  }
  ensurePatched(a);
  a._setListeners ??= new Set();
  a._setListeners.add(fn);
  return () => _unsubscribe(a, '_setListeners', fn);
}

/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export function onNotify<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe {
  ensurePatched(a);
  a._notifyListeners ??= new Set();
  a._notifyListeners.add(fn);
  return () => _unsubscribe(a, '_notifyListeners', fn);
}

/** Attaches a listener triggered immediately and only once upon attachment. */
export function onMount<T>(a: Atom<T> | ReadonlyAtom<T>, fn: LifecycleListener<T>): Unsubscribe {
  ensurePatched(a);
  a._mountListeners ??= new Set();
  a._mountListeners.add(fn);
  try {
    fn(undefined); // Call immediately
  } catch (err) {
    console.error(`Error in onMount listener for atom ${String(a)}:`, err);
  }
  return () => _unsubscribe(a, '_mountListeners', fn);
}


// --- Key/Path Listeners (Primarily for Map/DeepMap) ---

// WeakMaps to store listeners associated with specific map/deepMap atoms.
// Keys: Atom instance
// Values: Map where keys are stringified paths or keys, values are Sets of listeners.
const pathListeners = new WeakMap<Atom<any>, Map<string, Set<PathListener<any>>>>();
const keyListeners = new WeakMap<Atom<any>, Map<any, Set<KeyListener<any>>>>();

/**
 * Listens to changes at specific paths within a deepMap atom.
 * Relies on the atom having the `STORE_MAP_KEY_SET` symbol.
 * @param a The deepMap atom instance.
 * @param paths An array of paths (strings or arrays) to listen to.
 * @param fn The listener function.
 * @returns An unsubscribe function.
 */
export function listenPaths<T extends object>(
  a: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean }, // Check for map/deepMap marker
  paths: Path[],
  fn: PathListener<T>
): Unsubscribe {
  // Only proceed if the atom is marked as a map/deepMap
  if (!a[STORE_MAP_KEY_SET]) {
    console.warn('listenPaths called on a non-map/deepMap atom. Listener ignored.');
    return () => {}; // Return no-op unsubscribe
  }

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
    listenersForPath.add(fn as PathListener<any>);
  });

  return () => {
    const currentAtomListeners = pathListeners.get(a);
    if (!currentAtomListeners) return;

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
      pathListeners.delete(a); // Clean up atom entry if no paths are listened to
    }
  };
}

/**
 * Internal function called by deepMap's patched `set` to emit path changes.
 * @param a The deepMap atom.
 * @param changedPaths Array of paths that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
export function _emitPathChanges<T extends object>(
  a: Atom<T>, changedPaths: Path[], finalValue: T
): void {
  const atomPathListeners = pathListeners.get(a);
  if (!atomPathListeners?.size || !changedPaths.length) return;

  // Normalize changed paths for efficient lookup
  const normalizedChanged = new Map<string, {path: Path, array: PathArray}>();
  changedPaths.forEach(p => {
    const arrayPath = Array.isArray(p) ? p : String(p).split('.');
    normalizedChanged.set(arrayPath.join('\0'), {path: p, array: arrayPath});
  });

  // Iterate through registered listener paths
  atomPathListeners.forEach((listenersSet, registeredPathString) => {
    const registeredPathArray = registeredPathString.split('\0');
    const registeredPathLength = registeredPathArray.length;

    // Check each changed path against the registered path
    for (const [ , {path: changedPath, array: changedPathArray}] of normalizedChanged.entries()) {
      // Check if the registered path is a prefix of (or equal to) the changed path
      let isPrefixMatch = registeredPathLength <= changedPathArray.length;
      if (isPrefixMatch) {
        for (let i = 0; i < registeredPathLength; i++) {
          if (registeredPathArray[i] !== String(changedPathArray[i])) {
            isPrefixMatch = false;
            break;
          }
        }
      }

      if (isPrefixMatch) {
        // If it's a match, get the value at the *changed* path and notify listeners
        const valueAtPath = getDeep(finalValue, changedPathArray);
        listenersSet.forEach(listener => {
          try {
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
 * Relies on the atom having the `STORE_MAP_KEY_SET` symbol.
 * @param a The map atom instance.
 * @param keys An array of keys to listen to.
 * @param fn The listener function.
 * @returns An unsubscribe function.
 */
export function listenKeys<T extends object, K extends keyof T>(
  a: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean }, // Check for map/deepMap marker
  keys: K[],
  fn: KeyListener<T, K>
): Unsubscribe {
   // Only proceed if the atom is marked as a map/deepMap
  if (!a[STORE_MAP_KEY_SET]) {
    console.warn('listenKeys called on a non-map/deepMap atom. Listener ignored.');
    return () => {}; // Return no-op unsubscribe
  }

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
    listenersForKey.add(fn as KeyListener<any>);
  });

  return () => {
    const currentAtomListeners = keyListeners.get(a);
    if (!currentAtomListeners) return;

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
      keyListeners.delete(a); // Clean up atom entry if no keys are listened to
    }
  };
}

/**
 * Internal function called by map's patched `set` to emit key changes.
 * @param a The map atom.
 * @param changedKeys Array of keys that actually changed.
 * @param finalValue The final state object after changes.
 * @internal
 */
export function _emitKeyChanges<T extends object>(
  a: Atom<T>, changedKeys: ReadonlyArray<keyof T>, finalValue: T
): void {
  const atomKeyListeners = keyListeners.get(a);
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
