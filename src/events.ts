import type { Atom, ReadonlyAtom, Listener, Unsubscribe } from './core'; // Import all core types
// Removed incorrect import from './atom'
import { STORE_MAP_KEY_SET } from './keys'; // This should be exported from keys.ts

// Define standard lifecycle events
export const LIFECYCLE = {
  /** Called when the first listener subscribes. */
  onStart: Symbol('onStart'),
  /** Called when the last listener unsubscribes. */
  onStop: Symbol('onStop'),
  /** Called before setting a new value. Passes the new value. */
  onSet: Symbol('onSet'),
  /** Called after setting a new value. Passes the new value. */
  onNotify: Symbol('onNotify'),
  /** Called after a listener subscribes. Passes the listener. */
  onMount: Symbol('onMount'),
} as const;

export type LifecycleEvent = (typeof LIFECYCLE)[keyof typeof LIFECYCLE];

export type LifecycleListener<T = any> = (value?: T | Listener<T>) => void;

/**
 * Adds a lifecycle listener to an atom.
 *
 * @param atom The atom to listen to.
 * @param event The lifecycle event to listen for.
 * @param listener The callback function.
 * @returns An unsubscribe function.
 */
export function listen<T>(
  atom: Atom<T> | ReadonlyAtom<T>, // Accept Atom or ReadonlyAtom
  event: LifecycleEvent,
  listener: LifecycleListener<T>,
): Unsubscribe {
  // Note: We might not want all events on ReadonlyAtom (like onSet).
  // This allows attaching, but emission logic controls if it fires.
  const listeners = atom[event] || new Set<LifecycleListener<T>>();
  atom[event] = listeners;
  listeners.add(listener);

  // Emit onMount immediately if the event is onMount
  if (event === LIFECYCLE.onMount) {
    listener(undefined); // Or pass the listener itself if needed? Let's stick to undefined for now.
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      delete atom[event];
    }
  };
}

/**
 * Emits a lifecycle event on an atom.
 * Internal function.
 *
 * @param atom The atom to emit the event on.
 * @param event The lifecycle event to emit.
 * @param value Optional value associated with the event (e.g., new value for onSet/onNotify, listener for onMount).
 */
export function emit<T>(
  atom: Atom<T> | ReadonlyAtom<T> | undefined, // Accept Atom or ReadonlyAtom
  event: LifecycleEvent,
  value?: T | Listener<T>,
): void {
  const listeners = atom?.[event] as Set<LifecycleListener<T>> | undefined; // Get listeners with type assertion
  if (listeners) {
    // Direct iteration for performance. Assumes listeners don't unsubscribe themselves during emit.
    for (const listener of listeners) {
        listener(value);
    }
  }
}


// --- Path Subscription Logic (for DeepMaps) ---
import type { Path, PathArray } from './deepMapInternal'; // Import Path and PathArray
import { getDeep } from './deepMapInternal'; // Import getDeep to retrieve value at path

export type PathListener<T> = (
    value: any, // Value at the specific path that changed
    path: Path, // Path that changed
    fullObject: T // The entire object
) => void;

/** Internal storage for path listeners */
const pathListenersRegistry = new WeakMap<Atom<any>, Map<string, Set<PathListener<any>>>>(); // Use stringified path as key for Map

/** Adds a path-specific listener to a DeepMap atom. */
export function baseListenPaths<T extends object>(
    atom: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean }, // Assume same symbol marks support
    paths: Path[],
    listener: PathListener<T>
): Unsubscribe {
    if (!atom[STORE_MAP_KEY_SET]) {
        console.warn('Atom does not support path listeners. Use `deepMap`.');
        return () => {};
    }

    let atomListeners = pathListenersRegistry.get(atom);
    if (!atomListeners) {
        atomListeners = new Map();
        pathListenersRegistry.set(atom, atomListeners);
    }

    const pathStrings = paths.map(p => JSON.stringify(p)); // Use JSON stringify for complex path keys

    pathStrings.forEach(pathStr => {
        let listenersForPath = atomListeners!.get(pathStr);
        if (!listenersForPath) {
            listenersForPath = new Set();
            atomListeners!.set(pathStr, listenersForPath);
        }
        listenersForPath.add(listener as PathListener<any>);
    });

    return () => {
        const currentAtomListeners = pathListenersRegistry.get(atom);
        if (currentAtomListeners) {
            pathStrings.forEach(pathStr => {
                const listenersForPath = currentAtomListeners.get(pathStr);
                if (listenersForPath) {
                    listenersForPath.delete(listener as PathListener<any>);
                    if (listenersForPath.size === 0) {
                        currentAtomListeners.delete(pathStr);
                    }
                }
            });
            if (currentAtomListeners.size === 0) {
                pathListenersRegistry.delete(atom);
            }
        }
    };
}


/** Emits updates to path-specific listeners. */
export function emitPaths<T extends object>(
    atom: Atom<T>,
    changedPaths: Readonly<Path[]>, // Array of paths that changed
    fullValue: T
): void {
    const atomListeners = pathListenersRegistry.get(atom);
    if (!atomListeners) return;

    const listenersToNotify = new Set<PathListener<any>>();
    const changedPathStrings = changedPaths.map(p => JSON.stringify(p));

    // Find listeners for exact paths or parent paths that changed
    atomListeners.forEach((listenersSet, registeredPathStr) => {
        // Check if the registered path IS one of the changed paths
        if (changedPathStrings.includes(registeredPathStr)) {
            listenersSet.forEach(listener => listenersToNotify.add(listener));
        } else {
            // Check if the registered path is a PARENT of any changed path
            const registeredPath = JSON.parse(registeredPathStr) as Path;
            if (Array.isArray(registeredPath)) { // Only makes sense for array paths
                 changedPaths.forEach(changedPath => {
                     if (Array.isArray(changedPath) && changedPath.length > registeredPath.length) {
                         let isParent = true;
                         for(let i = 0; i < registeredPath.length; i++) {
                             if (changedPath[i] !== registeredPath[i]) {
                                 isParent = false;
                                 break;
                             }
                         }
                         if (isParent) {
                             listenersSet.forEach(listener => listenersToNotify.add(listener));
                         }
                     }
                 });
            }
        }
    });


    // Notify unique listeners
    listenersToNotify.forEach(listener => {
         // Find which changed paths this listener is interested in (directly或via parent)
         const interestedChangedPaths = changedPaths.filter(cp => {
             const cpStr = JSON.stringify(cp);
             // Is it a direct match?
             if (atomListeners.get(cpStr)?.has(listener)) return true;
             // Is it a child of a listened parent path?
             for (const [listenedPathStr, listenersSet] of atomListeners.entries()) {
                 if (listenersSet.has(listener)) {
                    const listenedPath = JSON.parse(listenedPathStr) as Path;
                    if (Array.isArray(listenedPath) && Array.isArray(cp) && cp.length > listenedPath.length) {
                         let isParent = true;
                         for(let i = 0; i < listenedPath.length; i++) {
                             if (cp[i] !== listenedPath[i]) {
                                 isParent = false;
                                 break;
                             }
                         }
                         if (isParent) return true;
                    }
                 }
             }
             return false;
         });

         // Call listener for each relevant changed path
         interestedChangedPaths.forEach(path => {
             try {
                 // Retrieve the actual value at the changed path
                 const valueAtPath = getDeep(fullValue, path as PathArray); // Assuming Path is PathArray internally for getDeep
                 listener(valueAtPath, path, fullValue);
             } catch (error) {
                 console.error('Error in path listener:', error);
             }
         });
    });
}


// --- Key Subscription Logic (for Maps/DeepMaps) ---

export type KeyListener<T, K extends keyof T = keyof T> = (
  value: T[K] | undefined, // Current value of the key
  key: K, // Key that changed
  fullObject: T // The entire object
) => void;


/**
 * Internal storage for key listeners on Map-like atoms (shallow maps).
 * WeakMap avoids memory leaks if the atom is garbage collected.
 */
// Simplify internal registry types to 'any' to avoid complex generic issues
const keyListenersRegistry = new WeakMap<Atom<any>, Map<any, Set<KeyListener<any>>>>();


/**
 * Adds a key-specific listener to a Map-like atom.
 *
 * @param atom The Map-like atom (`MapAtom`).
 * @param keys The keys (top-level) to listen to.
 * @param listener The callback function.
 * @returns An unsubscribe function.
 */
export function listenKeys<T extends object, K extends keyof T>(
  atom: Atom<T> & { [STORE_MAP_KEY_SET]?: boolean }, // Mark atom as supporting key listeners
  keys: K[],
  listener: KeyListener<T, K> // Keep external signature type-safe
): Unsubscribe {
    // Check should maybe be more specific for map vs deepMap?
    if (!atom[STORE_MAP_KEY_SET]) {
        console.warn('Atom does not support key listeners. Use `map`.');
        return () => {}; // Return a no-op unsubscribe
    }

    // Use 'any' for internal retrieval/setting
    let atomListeners = keyListenersRegistry.get(atom);
    if (!atomListeners) {
        atomListeners = new Map<any, Set<KeyListener<any>>>();
        keyListenersRegistry.set(atom, atomListeners);
    }

    keys.forEach(key => {
        // Use 'any' for internal retrieval/setting
        let listenersForKey = atomListeners!.get(key);
        if (!listenersForKey) {
            listenersForKey = new Set<KeyListener<any>>();
            atomListeners!.set(key, listenersForKey);
        }
        // Cast listener to 'any' for adding to the Set<any>
        listenersForKey.add(listener as KeyListener<any>);
    });

    // Optional: Immediately call listener with current values?
    // const currentValue = atom.get();
    // keys.forEach(key => listener(currentValue[key], key, currentValue));


    return () => {
        // Use 'any' for internal retrieval
        const currentAtomListeners = keyListenersRegistry.get(atom);
        if (currentAtomListeners) {
            keys.forEach(key => {
                const listenersForKey = currentAtomListeners.get(key);
                if (listenersForKey) {
                    // Cast listener to 'any' for deletion from Set<any>
                    listenersForKey.delete(listener as KeyListener<any>);
                    if (listenersForKey.size === 0) {
                        currentAtomListeners.delete(key);
                    }
                }
            });
            if (currentAtomListeners.size === 0) {
                keyListenersRegistry.delete(atom);
            }
        }
    };
}

/**
 * Emits updates to key-specific listeners (for shallow maps).
 * Internal function for Map-like atoms.
 *
 * @param atom The Map-like atom.
 * @param changedKeys The keys whose values have changed.
 * @param fullValue The complete new value of the atom.
 */
export function emitKeys<T extends object>(
    atom: Atom<T>,
    changedKeys: Readonly<(keyof T)[]>,
    fullValue: T
): void {
    // Use 'any' for internal retrieval
    const atomListeners = keyListenersRegistry.get(atom);
    if (!atomListeners) return;

    // Iterate changed keys directly and notify listeners for each key
    for (const key of changedKeys) {
        const listenersForKey = atomListeners.get(key); // Get listeners for this specific changed key
        if (listenersForKey) {
            // Call each listener registered for this key
            for (const listener of listenersForKey) {
                 try {
                    // Pass the value for the specific key that changed
                    (listener as KeyListener<T, typeof key>)(fullValue[key], key, fullValue);
                } catch (error) {
                    console.error('Error in key listener:', error);
                }
            }
        }
    }
}
