// Define the basic atom structure and functionality

// Listener function type
export type Listener<Value> = (value: Value) => void;

// Atom interface
export interface Atom<Value = unknown> {
  get(): Value;
  set(newValue: Value): void;
  subscribe(listener: Listener<Value>): () => void;
  readonly value: Value;
  readonly listeners: ReadonlySet<Listener<Value>>;
}

// Readonly atom interface
export interface ReadonlyAtom<Value = unknown> {
  get(): Value;
  subscribe(listener: Listener<Value>): () => void;
  readonly value: Value;
  readonly listeners: ReadonlySet<Listener<Value>>;
}

/**
 * Creates a new atom.
 */
export function atom<Value>(initialValue: Value): Atom<Value> {
  let currentValue: Value = initialValue;
  const listeners = new Set<Listener<Value>>();

  const atomInstance: Atom<Value> = {
    get() {
      return currentValue;
    },
    set(newValue: Value) {
      if (newValue !== currentValue) {
        currentValue = newValue;
        // Iterate directly over the Set. Modern engines handle deletion during iteration safely.
        for (const fn of listeners) {
          fn(currentValue);
        }
      }
    },
    subscribe(listener: Listener<Value>) {
      listeners.add(listener);
      listener(currentValue); // Call immediately
      return () => {
        listeners.delete(listener);
      };
    },
    get value() {
      return currentValue;
    },
    get listeners(): ReadonlySet<Listener<Value>> {
      return listeners;
    },
  };
  return atomInstance;
}

// Type helpers for computed
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<StoresArray extends Stores> = {
  [Index in keyof StoresArray]: StoresArray[Index] extends Atom<infer Value> | ReadonlyAtom<infer Value>
    ? Value
    : never;
};

/**
 * Creates a computed atom. FINAL ATTEMPT
 */
export function computed<Value, InputStores extends Stores>(
  stores: InputStores,
  calculation: (...values: StoreValues<InputStores>) => Value
): ReadonlyAtom<Value> {

  let currentValue: Value;
  let dirty = true; // Starts dirty until first computation
  const listeners = new Set<Listener<Value>>();
  let dependencyUnsubscribers: (() => void)[] | null = null; // null indicates inactive state

  // Calculate the value. If it changes, update currentValue and notify listeners.
  const recompute = () => {
    const newValues = stores.map(store => store.get()) as StoreValues<InputStores>;
    const newValue = calculation(...newValues);
    dirty = false;

    // console.log('Recomputing:', {oldValue: currentValue, newValue});
    if (newValue !== currentValue) {
      currentValue = newValue;
      // console.log('Value changed, notifying', listeners.size, 'listeners');
      // Notify listeners using a safe copy
      Array.from(listeners).forEach(fn => fn(currentValue));
    }
  };

  // Called by dependencies ONLY when computed is active
  const dependencyChanged = () => {
    // Always mark as dirty when dependency changes
    dirty = true;
    
    // If computed is active, recompute immediately
    if (dependencyUnsubscribers) {
      recompute();
    }
  };

  const subscribeToDependencies = () => {
    if (!dependencyUnsubscribers) { // Only subscribe if inactive
      // console.log('Subscribing to dependencies');
      dependencyUnsubscribers = stores.map(store => {
        // console.log('Subscribing to store:', store);
        return store.subscribe(dependencyChanged);
      });
      // Ensure value is computed *after* subscribing, let the get() in subscribe handle it
      dirty = true; // Mark as dirty to ensure get() recomputes
    }
  };

  const unsubscribeFromDependencies = () => {
    if (dependencyUnsubscribers) {
      dependencyUnsubscribers.forEach(unsub => unsub());
      dependencyUnsubscribers = null; // Mark as inactive
    }
  };

  // Calculate initial value immediately BUT DO NOT notify listeners yet.
  // Set dirty = false *before* calculation for the initial run.
  dirty = false;
  currentValue = calculation(...stores.map(store => store.get()) as StoreValues<InputStores>);


  const computedInstance: ReadonlyAtom<Value> = {
    get() {
      // Lazy evaluation: recompute if dirty
      if (dirty) {
         recompute();
      }
      return currentValue;
    },
    subscribe(listener: Listener<Value>) {
      const firstListener = listeners.size === 0;
      listeners.add(listener);

      if (firstListener) {
        // Activate: subscribe to dependencies
        subscribeToDependencies();
        // Ensure value is current *before* calling the first listener
        // Calling get() handles the dirty check and recompute
        computedInstance.get(); // This ensures recompute happens if needed
      }

      // Call listener immediately with the current value
      listener(currentValue);

      return () => {
        if (listeners.delete(listener)) {
          if (listeners.size === 0) {
            // Last listener: deactivate dependencies
            unsubscribeFromDependencies();
            // Mark dirty for next potential lazy get when inactive
            dirty = true;
          }
        }
      };
    },
    get value() {
      return computedInstance.get(); // Use public get for consistency
    },
    get listeners(): ReadonlySet<Listener<Value>> {
      return listeners;
    }
  };

  return computedInstance;
}
