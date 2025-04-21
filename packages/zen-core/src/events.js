// getBaseAtom removed
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
export const getDeep = (obj, path) => {
    let current = obj;
    for (const key of path) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        // Use type assertion for indexing
        current = current[key];
    }
    return current;
};
// --- Type Guard ---
// Removed isMutableAtom type guard as onSet now only accepts Atom<T>
// --- Internal Helper for Removing Listeners ---
// Update _unsubscribe to use generics properly
function _unsubscribe(a, listenerSetProp, fn) {
    // Operate directly on atom 'a'
    const baseAtom = a; // Cast using AtomValue<A>
    const ls = baseAtom[listenerSetProp]; // Type is Set<LifecycleListener<AtomValue<A>>> | undefined
    if (ls) {
        ls.delete(fn); // Use Set delete
        if (!ls.size)
            delete baseAtom[listenerSetProp]; // Clean up if empty
    }
}
// --- Exported Lifecycle Listener Functions ---
// These functions now directly add/remove listeners to the atom's properties via getBaseAtom.
/** Attaches a listener triggered when the first subscriber appears. */
export function onStart(a, fn) {
    const baseAtom = a; // Use AtomValue
    baseAtom._startListeners ??= new Set();
    baseAtom._startListeners.add(fn); // Add correctly typed listener
    return () => _unsubscribe(a, '_startListeners', fn); // Pass correctly typed fn
}
/** Attaches a listener triggered when the last subscriber disappears. */
export function onStop(a, fn) {
    const baseAtom = a; // Use AtomValue
    baseAtom._stopListeners ??= new Set();
    baseAtom._stopListeners.add(fn); // Add correctly typed listener
    return () => _unsubscribe(a, '_stopListeners', fn); // Pass correctly typed fn
}
/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
// Keep specific Atom<T> type here for type safety
export function onSet(a, fn) {
    // a is already AtomWithValue<T>
    a._setListeners ??= new Set();
    a._setListeners.add(fn);
    // _unsubscribe expects A extends AnyAtom and Listener<AtomValue<A>>.
    // Cast 'a' to AnyAtom, and 'fn' to any to satisfy the generic signature.
    // biome-ignore lint/suspicious/noExplicitAny: Internal _unsubscribe requires any for listener
    return () => _unsubscribe(a, '_setListeners', fn);
}
/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export function onNotify(a, fn) {
    const baseAtom = a; // Use AtomValue
    baseAtom._notifyListeners ??= new Set();
    baseAtom._notifyListeners.add(fn); // Add correctly typed listener
    return () => _unsubscribe(a, '_notifyListeners', fn); // Pass correctly typed fn
}
/** Attaches a listener triggered immediately and only once upon attachment. */
export function onMount(a, fn) {
    const baseAtom = a; // Use AtomValue
    baseAtom._mountListeners ??= new Set();
    baseAtom._mountListeners.add(fn); // Add correctly typed listener
    // _unsubscribe expects A extends AnyAtom and Listener<AtomValue<A>>.
    // 'a' is A extends AnyAtom, 'fn' is Listener<AtomValue<A>>. Should match directly.
    return () => _unsubscribe(a, '_mountListeners', fn);
}
// --- Key/Path Listeners (Primarily for Map/DeepMap) ---
// WeakMaps to store listeners associated with specific map/deepMap *internal* atoms.
// Update WeakMap types to be more specific
// Key is the Map/DeepMap atom itself, Value maps path string to Set of specific PathListeners
const pathListeners = new WeakMap(); // Add MapAtom back
// Key is the Map/DeepMap atom, Value maps key to Set of specific KeyListeners
const keyListeners = new WeakMap(); // Add MapAtom back
/**
 * Listens to changes at specific paths within a deepMap atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
// Use generic A constrained to MapAtom | DeepMapAtom, use AtomValue<A> for listener
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function listenPaths(
// Add MapAtom back
a, paths, fn) {
    // Check if it's a Map or DeepMap atom by checking _kind property
    if (a._kind !== 'map' && a._kind !== 'deepMap') {
        // Add 'map' check back
        return () => { }; // Return no-op unsubscribe
    }
    // Get or create listeners map for this specific atom 'a'
    let atomPathListeners = pathListeners.get(a);
    if (!atomPathListeners) {
        atomPathListeners = new Map();
        pathListeners.set(a, atomPathListeners);
    }
    // Normalize paths to strings using null character separator for arrays
    const pathStrings = paths.map((p) => (Array.isArray(p) ? p.join('\0') : String(p).split('.').join('\0'))); // Normalize string paths too
    for (const ps of pathStrings) {
        let listenersForPath = atomPathListeners?.get(ps);
        if (!listenersForPath) {
            listenersForPath = new Set();
            atomPathListeners?.set(ps, listenersForPath);
        }
        // Add the correctly typed listener
        // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
        listenersForPath.add(fn); // Cast needed due to WeakMap/Set variance issues
    }
    return () => {
        // Return function starts here
        const currentAtomListeners = pathListeners.get(a);
        if (!currentAtomListeners)
            return;
        for (const ps of pathStrings) {
            const listenersForPath = currentAtomListeners.get(ps);
            if (listenersForPath) {
                // Delete the correctly typed listener
                // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
                listenersForPath.delete(fn); // Cast needed
                if (!listenersForPath.size) {
                    currentAtomListeners.delete(ps); // Clean up path entry
                }
            }
        }
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
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function _emitPathChanges(
// Add MapAtom back
a, changedPaths, finalValue) {
    const atomPathListeners = pathListeners.get(a);
    console.log('[DEBUG] _emitPathChanges called. Atom:', a._kind, 'ChangedPaths:', JSON.stringify(changedPaths), 'ListenersMap Size:', atomPathListeners?.size); // DEBUG
    if (!atomPathListeners?.size || !changedPaths.length)
        return;
    // Normalize changed paths for efficient lookup (stringified with null char separator)
    const normalizedChanged = new Map();
    for (const p of changedPaths) {
        const arrayPath = Array.isArray(p) ? p : String(p).split('.'); // Assume dot notation if string
        normalizedChanged.set(arrayPath.join('\0'), { path: p, array: arrayPath });
    }
    // Iterate through registered listener paths (also stringified with null char separator)
    for (const [registeredPathString, listenersSet] of atomPathListeners) {
        console.log('[DEBUG] Checking registered path:', registeredPathString, 'Listener count:', listenersSet.size); // DEBUG
        const registeredPathArray = registeredPathString.split('\0');
        const registeredPathLength = registeredPathArray.length;
        // Check each changed path against the registered path
        for (const [, { path: changedPath, array: changedPathArray }] of normalizedChanged.entries()) {
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
            console.log('[DEBUG] Comparing with changed path:', changedPathArray, 'isPrefixMatch:', isPrefixMatch); // DEBUG
            if (isPrefixMatch) {
                // If it's a match, get the value at the *changed* path and notify listeners
                // This ensures listeners for 'a.b' get the value of 'a.b.c' if that's what changed.
                const valueAtPath = getDeep(finalValue, changedPathArray);
                for (const listener of listenersSet) {
                    try {
                        // Pass the original changed path (string or array) back to the listener
                        // Cast finalValue to expected object type for listener
                        listener(valueAtPath, changedPath, finalValue);
                    }
                    catch (_err) { }
                }
                // Optimization: If a specific changed path matches, no need to check further changed paths for *this* registered listener path.
                // However, different registered paths might match the same changed path, so we don't break the outer loop.
            }
        }
    }
}
/**
 * Listens to changes for specific keys within a map atom.
 * Relies on the internal atom having the `STORE_MAP_KEY_SET` symbol.
 */
// Update listenKeys signature
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function listenKeys(
// Add MapAtom back
a, keys, fn) {
    // Check if it's a Map or DeepMap atom by checking _kind property
    if (a._kind !== 'map' && a._kind !== 'deepMap') {
        // Add 'map' check back
        return () => { }; // Return no-op unsubscribe
    }
    // Get or create listeners map for this specific atom 'a'
    let atomKeyListeners = keyListeners.get(a);
    if (!atomKeyListeners) {
        atomKeyListeners = new Map();
        keyListeners.set(a, atomKeyListeners);
    }
    for (const k of keys) {
        let listenersForKey = atomKeyListeners?.get(k);
        if (!listenersForKey) {
            listenersForKey = new Set();
            atomKeyListeners?.set(k, listenersForKey);
        }
        // Add the correctly typed listener
        // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
        listenersForKey.add(fn); // Cast needed due to WeakMap/Set variance issues
    }
    return () => {
        // Return function starts here
        const currentAtomListeners = keyListeners.get(a);
        if (!currentAtomListeners)
            return;
        for (const k of keys) {
            const listenersForKey = currentAtomListeners.get(k);
            if (listenersForKey) {
                // Delete the correctly typed listener
                // biome-ignore lint/suspicious/noExplicitAny: Cast needed due to WeakMap/Set variance issues
                listenersForKey.delete(fn); // Cast needed
                if (!listenersForKey.size) {
                    currentAtomListeners.delete(k); // Clean up key entry
                }
            }
        }
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
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any here
export function _emitKeyChanges(
// Add MapAtom back
a, changedKeys, finalValue) {
    const atomKeyListeners = keyListeners.get(a);
    if (!atomKeyListeners?.size)
        return;
    for (const k of changedKeys) {
        const listenersForKey = atomKeyListeners.get(k);
        if (listenersForKey?.size) {
            const valueAtKey = finalValue[k];
            // Optimization for single listener
            if (listenersForKey.size === 1) {
                // biome-ignore lint/suspicious/noExplicitAny: Requires explicit cast within loop
                const listener = listenersForKey.values().next().value; // Cast listener
                try {
                    // Pass correctly typed key and value
                    listener?.(valueAtKey, k, finalValue);
                }
                catch (_err) { }
            }
            else {
                // Iterate for multiple listeners
                for (const listener of listenersForKey) {
                    // biome-ignore lint/suspicious/noExplicitAny: Requires explicit cast within loop
                    const typedListener = listener; // Cast listener
                    try {
                        // Pass correctly typed key and value
                        typedListener?.(valueAtKey, k, finalValue);
                    }
                    catch (_err) { }
                }
            }
        }
    }
}
