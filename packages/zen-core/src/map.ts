// Map atom implementation for managing object state with key-specific listeners.
import { Atom, Unsubscribe } from './core';
import { atom } from './atom'; // Base atom factory
import { listenKeys as addKeyListener, _emitKeyChanges, KeyListener } from './events'; // Key listener logic from events
import { STORE_MAP_KEY_SET } from './keys'; // Symbol marker for map atoms

/**
 * Represents a Map Atom, extending the base Atom with methods
 * for setting specific keys and listening to key changes.
 */
export type MapAtom<T extends object> = Atom<T> & {
  /** Sets a specific key in the map object, creating a new object immutably. */
  setKey<K extends keyof T>(key: K, value: T[K], forceNotify?: boolean): void;
  /** Listens to changes for specific keys. */
  listenKeys<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe;
  /** Internal marker symbol. */
  [STORE_MAP_KEY_SET]?: boolean;
};

/**
 * Creates a Map Atom, optimized for managing object state.
 * Allows setting individual keys and subscribing to changes for specific keys.
 *
 * @template T The type of the object state.
 * @param initialValue The initial object state. A shallow copy is made.
 * @returns A MapAtom instance.
 */
export function map<T extends object>(initialValue: T): MapAtom<T> {
  // 1. Create a base atom with a shallow copy of the initial value.
  const baseAtom = atom<T>({ ...initialValue });
  // Cast to MapAtom type for adding methods.
  const mapAtom = baseAtom as MapAtom<T>;

  // 2. Mark the atom so `listenKeys` and `_emitKeyChanges` can identify it.
  mapAtom[STORE_MAP_KEY_SET] = true;

  // 3. Internal flag to prevent `set` override from duplicating key change emission
  //    when called internally by `setKey`.
  let isCalledBySetKey = false;

  // 4. Add the `setKey` method.
  mapAtom.setKey = function <K extends keyof T>(key: K, value: T[K], forceNotify = false): void {
    const current = this._value;
    const currentValue = this._value;
    // Only proceed if the value for the key has actually changed or if forced.
    if (forceNotify || !Object.is(currentValue[key], value)) {
      // Create the new state object immutably.
      const nextValue = { ...currentValue, [key]: value };

      // Set the internal flag before calling the base `set`.
      isCalledBySetKey = true;
      try {
        // Call the original (potentially patched) `set` method of the base atom.
        // This ensures lifecycle events (`onSet`) and batching work correctly.
        baseAtom.set(nextValue, forceNotify);

        // Emit the change for this specific key *after* the base `set` completes.
        // The event/batch patching on `baseAtom.set` handles the main notification;
        // this specifically notifies key listeners.
        _emitKeyChanges(this, [key], nextValue);
      } finally {
        // Always reset the flag.
        isCalledBySetKey = false;
      }
    }
  };

  // 5. Override the base `set` method to calculate and emit all changed keys.
  const originalBaseSet = baseAtom.set; // Capture the original set from the base atom instance
  mapAtom.set = function(nextValue: T, forceNotify = false): void {
    // If `set` is called internally by `setKey`, `setKey` already handled
    // the key emission. We just need to let the original `set` run.
    if (isCalledBySetKey) {
      originalBaseSet.call(this, nextValue, forceNotify);
      return;
    }

    // Standard `set` logic: compare old and new values.
    const oldValue = this._value;
    if (forceNotify || !Object.is(nextValue, oldValue)) {
      // --- Calculate changed keys efficiently ---
      const changedKeys: (keyof T)[] = [];
      const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(nextValue)]) as Set<keyof T>;

      for (const k of allKeys) {
        if (!Object.is(oldValue[k], nextValue[k])) {
          changedKeys.push(k);
        }
      }
      // --- End Calculate changed keys ---

      // Call the original (potentially patched) `set` method of the base atom.
      originalBaseSet.call(this, nextValue, forceNotify);

      // Emit changes for all keys that differed *after* the base `set` completes.
      if (changedKeys.length > 0) {
        _emitKeyChanges(this, changedKeys, nextValue);
      }
    }
  };

  // 6. Add the `listenKeys` method (delegates to the function from events.ts).
  mapAtom.listenKeys = function<K extends keyof T>(keys: K[], listener: KeyListener<T, K>): Unsubscribe {
    // `addKeyListener` (imported as listenKeys) handles patching and listener storage.
    return addKeyListener(this, keys, listener);
  };

  // Note: Batching is handled by the patched `set` method on the `baseAtom`.
  // No specific batching logic is needed within `map.ts` itself anymore.

  return mapAtom;
}
