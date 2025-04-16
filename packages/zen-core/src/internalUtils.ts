// Internal utility functions shared across the library.
import type { AnyAtom, AtomWithValue } from './types'; // Import base types
import type { MapAtom } from './map'; // Import specific types
import type { DeepMapAtom } from './deepMap'; // Import specific types
import type { TaskAtom } from './task'; // Import specific types

/**
 * Gets the underlying atom that holds the value and listeners.
 * For Regular and Computed atoms, it's the atom itself.
 * For Map/DeepMap atoms, it's the internal atom.
 * For Task atoms, it's the state atom.
 * @internal
 */
export function getBaseAtom<T>(atom: AnyAtom<T>): AtomWithValue<any> { // Return type changed to AtomWithValue<any> for simplicity
    // Check for Map/DeepMap by looking for _internalAtom
    if ('_internalAtom' in atom) {
        return (atom as MapAtom | DeepMapAtom)._internalAtom;
    }
    // Check for TaskAtom by looking for _stateAtom
    if ('_stateAtom' in atom) {
        return (atom as TaskAtom)._stateAtom;
    }
    // Otherwise, assume it's an Atom or ReadonlyAtom (which are AtomWithValue)
    return atom as AtomWithValue<any>;
}


/**
 * Notifies all listeners of an atom about a value change.
 * Handles both value listeners and lifecycle listeners (onNotify).
 * @internal - Exported for use by other modules like atom, computed, batch.
 */
export function notifyListeners<T>(atom: AnyAtom<T>, value: T, oldValue?: T | null): void {
    const baseAtom = getBaseAtom(atom); // Use helper to get the atom with listeners

    const ls = baseAtom._listeners;
    // Notify regular value listeners first
    if (ls?.size) {
        for (const fn of ls) {
            try {
                fn(value, oldValue);
            } catch (e) {
                // Use a more informative error message if possible
                console.error(`Error in value listener:`, e);
            }
        }
    }
    // Notify onNotify listeners AFTER value listeners
    baseAtom._notifyListeners?.forEach(fn => {
        try { fn(value); } catch(e) { console.error(`Error in onNotify listener:`, e); }
    });
}