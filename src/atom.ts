// Ultra-optimized atom implementation - Monster Edition
import { Atom, AtomProto as CoreAtomProto } from './core'; // Import Core AtomProto and Atom type

/**
 * Create a monster-optimized atom for state management
 * @param initialValue Initial state value
 */
export function atom<T>(initialValue: T): Atom<T> {
  // Create instance inheriting from the CORE prototype
  const a = Object.create(CoreAtomProto);
  // Set initial value
  a._value = initialValue;
  // No method overrides here - patching handles event logic
  return a;
}
