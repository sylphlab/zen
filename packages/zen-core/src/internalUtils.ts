// Internal utility functions shared across the library.
import type { AnyAtom, AtomWithValue, Listener, TaskState, LifecycleListener } from './types'; // Import base types and merged types

/**
 * Notifies all listeners of an atom about a value change.
 * Handles both value listeners and lifecycle listeners (onNotify).
 * @internal - Exported for use by other modules like atom, computed, batch.
 */
export function notifyListeners<T>(atom: AnyAtom<any>, value: any, oldValue?: any | null): void {
    // Operate directly on the atom
    const baseAtom = atom as AtomWithValue<any>; // Cast for listener access

    // Notify regular value listeners first
    const ls = baseAtom._listeners;
    if (ls?.size) {
        // Create a copy for iteration to handle listeners that unsubscribe themselves.
        const listenersToNotify = [...ls];
        for (const fn of listenersToNotify) {
            try {
                // Need to cast value/oldValue based on listener type if possible,
                // but for simplicity, pass as any for now. TaskAtom needs specific handling.
                 if (baseAtom._kind === 'task') {
                    (fn as Listener<TaskState<any>>)(value as TaskState<any>, oldValue as TaskState<any> | null);
                 } else {
                    (fn as Listener<T>)(value, oldValue);
                 }
            } catch (e) {
                console.error(`Error in value listener:`, e);
            }
        }
    }

    // Notify onNotify listeners AFTER value listeners
    const notifyLs = baseAtom._notifyListeners;
    if (notifyLs?.size) {
        // Create a copy for iteration
        const listenersToNotify = [...notifyLs];
        for (const fn of listenersToNotify) {
            try {
                 if (baseAtom._kind === 'task') {
                    (fn as LifecycleListener<TaskState<any>>)(value as TaskState<any>);
                 } else {
                    (fn as LifecycleListener<T>)(value);
                 }
            } catch(e) { console.error(`Error in onNotify listener:`, e); }
        }
    }
}