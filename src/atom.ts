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
  // Create instance inheriting from the CORE prototype
  const a = Object.create(CoreAtomProto);
  // Set initial value
  a._value = initialValue;
  // No method overrides here - patching handles event logic
  return a;
}
