// Internal utility functions shared across the library.
import type { AnyAtom, AtomValue, AtomWithValue } from './types'; // Import base types and AtomValue

/**
 * Notifies all listeners of an atom about a value change.
 * Handles both value listeners and lifecycle listeners (onNotify).
 * @internal - Exported for use by other modules like atom, computed, batch.
 */
// Make generic over Atom type A, use AtomValue<A> for value types
export function notifyListeners<A extends AnyAtom>(atom: A, value: AtomValue<A>, oldValue?: AtomValue<A>): void {
    // Operate directly on the atom, casting to the base structure with the correct value type
    const baseAtom = atom as AtomWithValue<AtomValue<A>>;

    // Notify regular value listeners first
    const ls = baseAtom._listeners; // Type is already Set<Listener<AtomValue<A>>> | undefined
    if (ls?.size) {
        // Create a copy for iteration to handle listeners that unsubscribe themselves.
        for (const fn of [...ls]) {
            // Pass oldValue as null if undefined, matching previous logic
            try { fn(value, oldValue ?? null); } catch (e) { console.error(`Error in value listener:`, e); }
        }
    }

    // Notify onNotify listeners AFTER value listeners
    const notifyLs = baseAtom._notifyListeners; // Type is already Set<LifecycleListener<AtomValue<A>>> | undefined
    if (notifyLs?.size) {
        for (const fn of [...notifyLs]) {
            try { fn(value); } catch(e) { console.error(`Error in onNotify listener:`, e); }
        }
    }
}