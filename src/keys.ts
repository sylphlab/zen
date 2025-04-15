import {
  Atom,
  ReadonlyAtom,
  Unsubscribe,
  KeyListener,
  Path,
  PathString,
  Keys,
  Listener // Import Listener from core
} from './core';
import { getDeep } from './deepMapInternal'; // CORRECTED IMPORT PATH

/**
 * Converts an array path or mixed path string to a canonical dot-bracket notation string.
 * Example: ['a', 'b', 0, 'c'] -> 'a.b[0].c'
 * Example: 'a.b[0].c' -> 'a.b[0].c'
 */
export function normalizePath(path: Path): PathString {
  if (typeof path === 'string') {
    // Basic normalization for string paths (replace spaces around dots/brackets)
    return path.replace(/\s*[\.\[\]]\s*/g, match => match.trim());
  }
  // Ensure initial value is a string for reduce
  return path.reduce((str: string, segment) => {
    if (typeof segment === 'number') {
      return str + '[' + segment + ']';
    } else {
      // Ensure segment is treated as string for concatenation and checks
      const segmentStr = String(segment);
      // Add dot only if str is not empty AND str doesn't end with '[' (already ensured str is string)
      const separator = str && !str.endsWith('[') ? '.' : '';
      return str + separator + segmentStr;
    }
  }, '');
}

/**
 * Checks if any changed path affects a listener path.
 * This is a simplified check: it triggers if a listener path is an exact match
 * or a prefix of a changed path, or vice-versa.
 * A more robust implementation might involve parsing paths into segments.
 */
function checkPaths(changedPath: PathString, listenerPaths: Keys): boolean {
    for (const listenerPath of listenerPaths) {
        const normalizedListenerPath = normalizePath(listenerPath);
        // Exact match
        if (changedPath === normalizedListenerPath) return true;
        // Changed path is deeper than listener path (e.g., changed 'a.b.c', listening for 'a.b')
        if (changedPath.startsWith(normalizedListenerPath + '.') || changedPath.startsWith(normalizedListenerPath + '[')) return true;
        // Listener path is deeper than changed path (e.g., changed 'a.b', listening for 'a.b.c')
        if (normalizedListenerPath.startsWith(changedPath + '.') || normalizedListenerPath.startsWith(changedPath + '[')) return true;
    }
    return false;
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
        // Optional: Clean up map entry if set becomes empty
        if (keySet?.size === 0) {
            store._keyListeners?.delete(normalizedPath);
        }
         // Optional: Check if _keyListeners map is now empty and potentially reset _hasEventListeners (complex)
    };
}


/**
 * Subscribe to changes in specific keys of a map or deepMap store.
 * Calls the listener immediately with the current value(s) of the specified keys.
 *
 * @param store The map or deepMap store.
 * @param keys Array of key paths (strings) to listen to.
 * @param listener Callback function. Receives the full store value and the old value.
 * @returns Function to stop listening.
 */
export function subscribeKeys<T extends object>(
    store: Atom<T> | ReadonlyAtom<T>,
    keys: Keys,
    listener: Listener<T> // Use the base Listener type
): Unsubscribe {

    // Normalize all listener paths immediately
    const normalizedPaths = keys.map(normalizePath);

    const keyListenerWrapper: Listener<T> = (value, oldValue) => {
        // This wrapper listens to the main store's updates.
        // We need to determine *which* specific key change triggered this global update.
        // This is the hard part without modifying setKey/set to pass change info.

        // --- Simplified Approach (Notify if *any* listened key might have changed) ---
        // This isn't truly fine-grained yet. A full implementation needs change tracking.
        // For now, we check if the *new value* at the listened paths differs from the *old value*.
        let changed = false;
        for(const path of normalizedPaths) {
            // Use getDeep to compare old vs new value at the specific path
            if (!Object.is(getDeep(value, path), getDeep(oldValue, path))) {
                changed = true;
                break;
            }
        }
        if (changed) {
            listener(value, oldValue);
        }
    };

    // Subscribe the wrapper to the main store
    // Subscribe the wrapper to the main store. The internal subscribe
    // will call the wrapper immediately with oldValue === undefined.
    const unsubscribeMain = store.subscribe(keyListenerWrapper);

    // The explicit immediate call below caused double notifications. Removed.
    // listener(store.get(), undefined);

    return unsubscribeMain;
}

/**
 * Listen for changes in specific keys of a map or deepMap store.
 * Does *not* call the listener immediately.
 *
 * @param store The map or deepMap store.
 * @param keys Array of key paths (strings) to listen to.
 * @param listener Callback function. Receives the full store value and the old value.
 * @returns Function to stop listening.
 */
export function listenKeys<T extends object>(
    store: Atom<T> | ReadonlyAtom<T>,
    keys: Keys,
    listener: Listener<T> // Use the base Listener type
): Unsubscribe {

    const normalizedPaths = keys.map(normalizePath);

    const keyListenerWrapper: Listener<T> = (value, oldValue) => {
        // Similar simplified check as subscribeKeys
        let changed = false;
         for(const path of normalizedPaths) {
            if (!Object.is(getDeep(value, path), getDeep(oldValue, path))) {
                changed = true;
                break;
            }
        }
        if (changed) {
            listener(value, oldValue);
        }
    };

    // Use the `oldValue` parameter provided by the underlying `subscribe`
    // to differentiate the initial call (oldValue === undefined) from subsequent updates.
    const keyListenerWrapperSkippingInitial: Listener<T> = (value, oldValue) => {
        // Only call the original listener if oldValue is not undefined
        if (oldValue !== undefined) {
             // Check if relevant keys changed before calling listener
             let changed = false;
             for(const path of normalizedPaths) {
                 if (!Object.is(getDeep(value, path), getDeep(oldValue, path))) {
                     changed = true;
                     break;
                 }
             }
             if (changed) {
                 listener(value, oldValue);
             }
        }
    };

    // Subscribe the wrapper that skips the initial call
    return store.subscribe(keyListenerWrapperSkippingInitial);
}

// Note: The current implementation of subscribeKeys/listenKeys is NOT truly fine-grained.
// It listens to *all* store changes and then checks if the listened keys changed.
// A proper implementation requires modifying `setKey`/`set` to identify changed paths
// and a mechanism in `_notify` to only call listeners associated with those paths.
// This simplified version provides the API but lacks the performance benefit.
