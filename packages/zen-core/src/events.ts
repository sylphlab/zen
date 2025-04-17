// Event system implementation for functional atoms.
import type { Atom } from './atom'; // Import specific types
import type { Unsubscribe, AnyAtom, AtomValue, AtomWithValue } from './types'; // Import AtomValue
// Removed MapAtom, DeepMapAtom, Path, PathListener, KeyListener imports
// Removed getDeep import

// --- Types ---

/** Listener for lifecycle events (onStart, onStop, etc.). */
export type LifecycleListener<T = unknown> = (value?: T) => void; // Keep unknown
// PathListener and KeyListener types removed

// --- Type Guard ---

// Removed isMutableAtom type guard as onSet now only accepts Atom<T>

// --- Internal Helper for Removing Listeners ---
// Update _unsubscribe to use generics properly
function _unsubscribe<A extends AnyAtom>(
  a: A,
  listenerSetProp: '_startListeners' | '_stopListeners' | '_setListeners' | '_notifyListeners' | '_mountListeners',
  fn: LifecycleListener<AtomValue<A>> // Use AtomValue<A>
): void {
  // Operate directly on atom 'a'
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Cast using AtomValue<A>
  const ls = baseAtom[listenerSetProp]; // Type is Set<LifecycleListener<AtomValue<A>>> | undefined
  if (ls) {
    ls.delete(fn); // Use Set delete
    if (!ls.size) delete baseAtom[listenerSetProp]; // Clean up if empty
  }
}

// --- Exported Lifecycle Listener Functions ---
// These functions now directly add/remove listeners to the atom's properties.

/** Attaches a listener triggered when the first subscriber appears. */
export function onStart<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._startListeners ??= new Set();
  baseAtom._startListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_startListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered when the last subscriber disappears. */
export function onStop<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._stopListeners ??= new Set();
  baseAtom._stopListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_stopListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered *before* a mutable atom's value is set (only outside batch). */
// Keep specific Atom<T> type here for type safety
export function onSet<T>(a: Atom<T>, fn: LifecycleListener<T>): Unsubscribe {
  // a is already AtomWithValue<T>
  a._setListeners ??= new Set();
  a._setListeners.add(fn);
  // Pass the specific Atom<T> to _unsubscribe, it fits A extends AnyAtom
  return () => _unsubscribe(a, '_setListeners', fn);
}

/** Attaches a listener triggered *after* an atom's value listeners have been notified. */
export function onNotify<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._notifyListeners ??= new Set();
  baseAtom._notifyListeners.add(fn); // Add correctly typed listener
  return () => _unsubscribe(a, '_notifyListeners', fn); // Pass correctly typed fn
}

/** Attaches a listener triggered immediately and only once upon attachment. */
export function onMount<A extends AnyAtom>(a: A, fn: LifecycleListener<AtomValue<A>>): Unsubscribe {
  const baseAtom = a as AtomWithValue<AtomValue<A>>; // Use AtomValue
  baseAtom._mountListeners ??= new Set();
  baseAtom._mountListeners.add(fn); // Add correctly typed listener
  try {
    fn(undefined); // Call immediately
  } catch (err) {
    console.error(`Error in onMount listener for atom ${String(a)}:`, err);
  }
  // Cast args for _unsubscribe (already unknown)
  return () => _unsubscribe(a, '_mountListeners', fn);
}

// --- Key/Path Listeners Removed ---
// WeakMaps (pathListeners, keyListeners) removed.
// Functions (listenPaths, _emitPathChanges, listenKeys, _emitKeyChanges) removed.
