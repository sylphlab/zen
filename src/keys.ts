import {
  Atom,
  ReadonlyAtom,
  Unsubscribe,
  KeyListener,
  Path,
  PathString,
  Keys,
  Listener
} from './core';
import { getDeep } from './deepMapInternal';

/**
 * Converts an array path or mixed path string to a canonical dot-bracket notation string.
 * Example: ['a', 'b', 0, 'c'] -> 'a.b[0].c'
 * Example: 'a.b[0].c' -> 'a.b[0].c'
 */
export function normalizePath(path: Path): PathString {
  if (typeof path === 'string') {
    return path.replace(/\s*[\.\[\]]\s*/g, match => match.trim());
  }
  return path.reduce((str: string, segment) => {
    if (typeof segment === 'number') {
      return str + '[' + segment + ']';
    } else {
      const segmentStr = String(segment);
      const separator = str && !str.endsWith('[') ? '.' : '';
      return str + separator + segmentStr;
    }
  }, '');
}

/**
 * Checks if a changed path affects a listener path (exact or prefix match).
 */
export function checkPaths(changedPath: PathString, listenerPath: PathString): boolean {
    // Exact match or changed path is deeper or listener path is deeper
    return changedPath === listenerPath ||
           changedPath.startsWith(listenerPath + '.') ||
           changedPath.startsWith(listenerPath + '[') ||
           listenerPath.startsWith(changedPath + '.') ||
           listenerPath.startsWith(changedPath + '[');
}


// Helper to ensure key listener map and set exist
function ensureKeyListenerSet(store: Atom<any> | ReadonlyAtom<any>, normalizedPath: PathString): Set<KeyListener<any>> {
    if (!store._keyListeners) {
        store._keyListeners = new Map();
    }
    let keySet = store._keyListeners.get(normalizedPath);
    if (!keySet) {
        keySet = new Set();
        store._keyListeners.set(normalizedPath, keySet);
    }
    return keySet;
}

// Helper to create unsubscribe logic for key listeners
function createKeyUnsubscribe(store: Atom<any> | ReadonlyAtom<any>, normalizedPath: PathString, listener: KeyListener<any>): Unsubscribe {
    return () => {
        const keySet = store._keyListeners?.get(normalizedPath);
        keySet?.delete(listener);
        if (keySet?.size === 0) {
            store._keyListeners?.delete(normalizedPath);
        }
        // TODO: Check if _keyListeners is empty and reset _hasEventListeners?
    };
}


/**
 * Subscribe to changes in specific keys of a map or deepMap store.
 * Calls the listener immediately with the current value(s) of the specified keys.
 */
export function subscribeKeys<T extends object>(
    store: Atom<T> | ReadonlyAtom<T>,
    keys: Keys,
    listener: KeyListener<T> // Now KeyListener<T> (which is Listener<T>)
): Unsubscribe {

    const unsubscribes: Unsubscribe[] = [];
    for (const key of keys) {
        const normalizedPath = normalizePath(key);
        const listenersSet = ensureKeyListenerSet(store, normalizedPath);
        listenersSet.add(listener);
        unsubscribes.push(createKeyUnsubscribe(store, normalizedPath, listener));
    }

    // Call listener immediately
    listener(store.get(), undefined);

    // Return a function that unsubscribes from all registered keys
    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
}

/**
 * Listen for changes in specific keys of a map or deepMap store.
 * Does *not* call the listener immediately.
 */
export function listenKeys<T extends object>(
    store: Atom<T> | ReadonlyAtom<T>,
    keys: Keys,
    listener: KeyListener<T>
): Unsubscribe {
     const unsubscribes: Unsubscribe[] = [];
     for (const key of keys) {
         const normalizedPath = normalizePath(key);
         const listenersSet = ensureKeyListenerSet(store, normalizedPath);
         // Wrap the listener to skip the initial call (which _notify doesn't trigger for key listeners anyway, but be safe)
         const skippingListener: KeyListener<T> = (value, oldValue) => {
             if (oldValue !== undefined) {
                 listener(value, oldValue);
             }
         };
         listenersSet.add(skippingListener);
         unsubscribes.push(createKeyUnsubscribe(store, normalizedPath, skippingListener));
     }

     // Return a function that unsubscribes from all registered keys
     return () => {
         unsubscribes.forEach(unsub => unsub());
     };
}
