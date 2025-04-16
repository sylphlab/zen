// Functional atom implementation
import { Atom, Listener, Unsubscribe, AtomTypes, AnyAtom, ComputedAtom, notifyListeners, getBaseAtom } from './core'; // Import getBaseAtom
import { isInBatch, queueAtomForBatch, batchDepth } from './batch'; // Import batch helpers AND batchDepth

// --- Core Functional API ---

/**
 * Gets the current value of an atom.
 * @param atom The atom to read from.
 * @returns The current value.
 */
export function get<T>(atom: AnyAtom<T>): T | null { // Return type allows null for computed initial
    // Check if it's a computed atom and needs updating
    if (atom.$$type === AtomTypes.Computed) {
        const computed = atom as ComputedAtom<T>; // Cast to ComputedAtom
        // Ensure _update exists (it should based on the type) and call it if dirty or initially null
        if ((computed._dirty || computed._value === null)) {
             computed._update(); // Call the internal update method directly via type
        }
    }
    // Return the potentially updated value from the base atom
    return getBaseAtom(atom)._value;
}

/**
 * Sets the value of a writable atom.
 * @param atom The atom to write to.
 * @param value The new value.
 * @param force If true, notify listeners even if the value is the same.
 */
export function set<T>(atom: Atom<T>, value: T, force = false): void {
    if (atom.$$type !== AtomTypes.Regular) {
        // In the future, maybe allow setting map/deepMap atoms here too
        console.warn('set called on a non-regular atom.');
        return;
    }

    const oldValue = atom._value;
    if (force || !Object.is(value, oldValue)) {
        // Trigger onSet listeners BEFORE setting value, ONLY if not in batch
        // Directly check batchDepth from batch.ts
        if (batchDepth <= 0) { // Check if NOT in batch (depth is 0 or less)
            atom._setListeners?.forEach(fn => {
                try { fn(value); } catch(e) { console.error(`Error in onSet listener for atom ${String(atom)}:`, e); }
            });
        }

        atom._value = value;

        // Check if currently in a batch using the same direct check
        if (batchDepth > 0) {
            queueAtomForBatch(atom, oldValue); // Queue for later notification
        } else {
            // Outside batch: notify immediately.
            notifyListeners(atom, value, oldValue);
        }
    }
}

/**
 * Subscribes a listener function to an atom's changes.
 * Calls the listener immediately with the current value.
 * Returns an unsubscribe function.
 * @param atom The atom to subscribe to.
 * @param listener The function to call on value changes.
 * @returns A function to unsubscribe the listener.
 */
export function subscribe<T>(atom: AnyAtom<T>, listener: Listener<T>): Unsubscribe {
    const baseAtom = getBaseAtom(atom); // Get the atom holding listeners/value
    const isFirstListener = !baseAtom._listeners?.size;
    baseAtom._listeners ??= new Set();
    baseAtom._listeners.add(listener);

    // Trigger onStart if this is the first listener
    if (isFirstListener) {
        baseAtom._startListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onStart listener for atom ${String(atom)}:`, e); }
        });
        // If it's a computed atom, trigger its source subscription logic
        if (atom.$$type === AtomTypes.Computed) {
             const computed = atom as ComputedAtom<T>;
             // Ensure the method exists before calling
             if (typeof computed._subscribeToSources === 'function') {
                computed._subscribeToSources();
             }
        }
    }
    // onMount is handled by the onMount function itself

    // Initial call to the new listener
    // The very first value notification should always have `undefined` as oldValue.
    try {
        const currentValue = get(atom); // Use renamed get to potentially trigger computed calc
        listener(currentValue!, undefined); // Explicitly pass undefined for initial call
    } catch (e) {
        console.error(`Error in initial listener call for atom ${String(atom)}:`, e);
    }

    return function unsubscribe() {
      const baseAtom = getBaseAtom(atom); // Get the atom holding listeners
      const listeners = baseAtom._listeners;
      if (!listeners?.has(listener)) return; // Already unsubscribed or listener not found

      listeners.delete(listener);

      // Trigger onStop if this was the last listener
      if (!listeners.size) {
        delete baseAtom._listeners; // Clean up Set if empty
        baseAtom._stopListeners?.forEach(fn => {
            try { fn(undefined); } catch(e) { console.error(`Error in onStop listener for atom ${String(atom)}:`, e); }
        });
        // If it's a computed atom, trigger its source unsubscription logic
        if (atom.$$type === AtomTypes.Computed) {
            const computed = atom as ComputedAtom<T>;
             // Ensure the method exists before calling
             if (typeof computed._unsubscribeFromSources === 'function') {
                computed._unsubscribeFromSources();
             }
        }
      }
    };
}


// --- Atom Factory (Functional Style) ---

/**
 * Creates a new writable atom (functional style).
 * @param initialValue The initial value of the atom.
 * @returns An Atom instance.
 */
export function createAtom<T>(initialValue: T): Atom<T> {
  const newAtom: Atom<T> = {
    $$id: Symbol('createAtom'), // Changed symbol description
    $$type: AtomTypes.Regular,
    _value: initialValue,
    // Listeners are initialized lazily by subscribeToAtom or event functions
    _listeners: undefined,
    _startListeners: undefined,
    _stopListeners: undefined,
    _setListeners: undefined,
    _notifyListeners: undefined,
    _mountListeners: undefined,
  };
  // Trigger onMount immediately after creation if listeners exist (added via onMount)
  newAtom._mountListeners?.forEach(fn => {
      try { fn(undefined); } catch(e) { console.error(`Error in onMount listener during atom creation:`, e); }
  });
  // Clean up mount listeners after initial call as they only run once
  delete newAtom._mountListeners;

  return newAtom;
}
