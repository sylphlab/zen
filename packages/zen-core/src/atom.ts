// Optimized atom implementation
import { Atom, AtomProto as CoreAtomProto } from './core'; // Import Core AtomProto and Atom type

/**
 * Creates a new atom, the basic unit of state.
 * Atoms hold a value and allow subscriptions to changes.
 * Event and batching logic are applied via patching (see events.ts, batch.ts).
 * @param initialValue The initial value of the atom.
 * @returns An Atom instance.
 */
export function atom<T>(initialValue: T): Atom<T> {
  // Create instance using object literal, copying methods from CoreAtomProto
  const a: Atom<T> = {
    _value: initialValue,
    // Copy methods directly from the prototype
    get: CoreAtomProto.get,
    set: CoreAtomProto.set,
    subscribe: CoreAtomProto.subscribe,
    _notify: CoreAtomProto._notify,
    // Initialize listener sets as potentially undefined
    _listeners: undefined,
    _startListeners: undefined,
    _stopListeners: undefined,
    _setListeners: undefined,
    _notifyListeners: undefined,
    _mountListeners: undefined,
  };
  return a;
}
