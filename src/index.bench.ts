// @vitest-environment jsdom
import { bench, describe } from 'vitest';
import { atom as zenAtom, computed as zenComputed, map as zenMap, task as zenTask } from './index'; // Import map and task
import { atom as nanoAtom, computed as nanoComputed, map as nanoMap } from 'nanostores'; // Import nano map
import { atom as jotaiAtom, useAtomValue, useSetAtom, Provider, createStore as createJotaiStore, Atom, WritableAtom, SetStateAction } from 'jotai'; // Import Atom types
import { createStore as createZustandVanillaStore } from 'zustand/vanilla'; // Correct import for vanilla zustand
import type { StoreApi, UseBoundStore } from 'zustand'; // Import types for Zustand
import { proxy as valtioProxy, subscribe as valtioSubscribe } from 'valtio/vanilla'; // Use vanilla for core benchmarks
import { createStore as createEffectorStore, createEvent as createEffectorEvent, sample } from 'effector';
import { createElement } from 'react'; // Need React for Jotai hooks
import { renderHook, act } from '@testing-library/react'; // Need for testing hooks

describe('Atom Creation', () => {
  bench('zen', () => {
    zenAtom(0);
  });

  bench('nanostores', () => {
    nanoAtom(0);
  });

  bench('jotai', () => {
    jotaiAtom(0);
  });

  bench('zustand (vanilla)', () => {
    createZustandVanillaStore(() => ({ count: 0 }));
  });

  bench('valtio (vanilla)', () => {
    valtioProxy({ count: 0 });
  });

  bench('effector', () => {
    createEffectorStore(0);
  });
});

// Jotai's primary interface is hooks, making direct get/set less common/idiomatic.
// We'll benchmark using hooks within a testing environment.
// Setup for Jotai hook benchmarks (Simplified for Read/Write separation)
// Read setup works for any atom type
const createJotaiReadBenchSetup = <T>(atomToRead: Atom<T>) => { // Use Atom<T> type
    const store = createJotaiStore();
    // Ensure initial value is computed if derived
    store.get(atomToRead);
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
    const { result } = renderHook(() => useAtomValue(atomToRead, { store }), { wrapper });
    return { get: () => result.current, store }; // Return store for update benchmarks
};

// Write setup requires a WritableAtom
const createJotaiWriteBenchSetup = <Value, Args extends unknown[], Result>(
    atomToWrite: WritableAtom<Value, Args, Result> // Use WritableAtom type
) => {
    const store = createJotaiStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
    const { result } = renderHook(() => useSetAtom(atomToWrite, { store }), { wrapper });
    return { set: result.current, store };
};


describe('Atom Get', () => {
  const zAtom = zenAtom(0);
  const nAtom = nanoAtom(0);

  bench('zen', () => {
    zAtom.get();
  });

  bench('nanostores', () => {
    nAtom.get();
  });

  const jotaiReadSetupGet = createJotaiReadBenchSetup(jotaiAtom(0)); // OK: jotaiAtom(0) is writable, satisfies jotaiAtom<T>
  bench('jotai (via hook)', () => {
    jotaiReadSetupGet.get();
  });

  const zustandStoreGet = createZustandVanillaStore(() => ({ count: 5 }));
  bench('zustand (vanilla)', () => {
    zustandStoreGet.getState().count;
  });

  const valtioStateGet = valtioProxy({ count: 5 });
  bench('valtio (vanilla)', () => {
    valtioStateGet.count;
  });

  const effectorStoreGet = createEffectorStore(5);
  bench('effector', () => {
    effectorStoreGet.getState();
  });
});

describe('Atom Set (No Listeners)', () => {
  const zAtom = zenAtom(0);
  const nAtom = nanoAtom(0);
  let i = 0;

  bench('zen', () => {
    zAtom.set(++i);
  });

  bench('nanostores', () => {
    nAtom.set(++i);
  });

  const baseJotaiAtomForSet = jotaiAtom(0); // Create a base writable atom
  const jotaiWriteSetupSet = createJotaiWriteBenchSetup(baseJotaiAtomForSet); // OK: baseJotaiAtomForSet is writable
  bench('jotai (via hook)', () => {
    act(() => jotaiWriteSetupSet.set(++i));
  });

  // Define the state type for Zustand store
  interface ZustandState {
    count: number;
    inc: () => void;
  }
  const zustandStoreSet = createZustandVanillaStore<ZustandState>((set) => ({
    count: 0,
    inc: () => set((state: ZustandState) => ({ count: state.count + 1 })),
  }));
  bench('zustand (vanilla)', () => {
     // Note: Zustand encourages actions, direct set is less common but possible
     zustandStoreSet.setState({ count: ++i });
     // zustandStoreSet.getState().inc(); // Alternative: using action
  });

  const valtioStateSet = valtioProxy({ count: 0 });
  bench('valtio (vanilla)', () => {
    valtioStateSet.count = ++i;
  });

  const effectorSetEvent = createEffectorEvent<number>();
  const effectorStoreSet = createEffectorStore(0).on(effectorSetEvent, (_, payload) => payload);
  bench('effector', () => {
    effectorSetEvent(++i);
  });

});

// Jotai handles listeners differently (via hook re-renders).
// Benchmarking direct listener notification is difficult/less comparable.
// We'll focus on update propagation benchmark later for a sense of this.
// describe('Atom Set (1 Listener)', () => { ... });


// This block was duplicated in the previous step, removing the inner duplicate
// describe('Atom Set (1 Listener)', () => { ... });


describe('Atom Subscribe/Unsubscribe', () => {
    const listener = () => {};

    bench('zen', () => {
      const zAtom = zenAtom(0);
      const unsub = zAtom.subscribe(listener);
      unsub(); // Include unsubscribe in the benchmark
    });

    bench('nanostores', () => {
      const nAtom = nanoAtom(0);
      const unsub = nAtom.subscribe(listener);
      unsub(); // Include unsubscribe in the benchmark
    });

    // Jotai doesn't have a direct subscribe/unsubscribe outside hooks/store API.
    // We can benchmark store.sub though.
    bench('jotai (store.sub)', () => {
        const jAtom = jotaiAtom(0);
        const store = createJotaiStore();
        const unsub = store.sub(jAtom, listener);
        unsub();
    });

    bench('zustand (vanilla)', () => {
        const store = createZustandVanillaStore(() => ({ count: 0 }));
        const unsub = store.subscribe(listener);
        unsub();
    });

    bench('valtio (vanilla)', () => {
        const state = valtioProxy({ count: 0 });
        const unsub = valtioSubscribe(state, listener);
        unsub();
    });

    bench('effector', () => {
        const store = createEffectorStore(0);
        const unsub = store.watch(listener); // watch is similar to subscribe
        unsub();
    });
  });

describe('Computed Creation', () => {
  const baseAtomZ = zenAtom(0);
  const baseAtomN = nanoAtom(0);
  const baseAtomJ = jotaiAtom(0); // For Jotai comparison

  bench('zen (1 dependency)', () => {
    zenComputed([baseAtomZ], (val) => val * 2);
  });

  bench('nanostores (1 dependency)', () => {
    nanoComputed(baseAtomN, (val) => val * 2);
  });

  bench('jotai (1 dependency)', () => {
    // Jotai's computed is essentially another atom calling get
    jotaiAtom((get) => get(baseAtomJ) * 2);
  });

  // Zustand: No direct 'computed' primitive like others. Derived state often uses selectors in hooks or `subscribeWithSelector`. Vanilla equivalent less direct. Skipping for creation.

  // Valtio: Derived state is often done via vanilla JS getters within the proxy or using `derive`. Simple getter is implicit. Skipping explicit creation bench.

   bench('effector (derived store)', () => {
     const base = createEffectorStore(0);
     base.map(val => val * 2);
   });

});

describe('Computed Get (1 dependency)', () => {
    const baseAtomZ = zenAtom(5);
    const baseAtomN = nanoAtom(5);
    const baseAtomJ = jotaiAtom(5);
    const baseStoreZu = createZustandVanillaStore(() => ({ count: 5 })); // Zustand base
    const baseProxyV = valtioProxy({ count: 5 }); // Valtio base
    const baseStoreE = createEffectorStore(5); // Effector base

    const computedZ = zenComputed([baseAtomZ], (val) => val * 2);
    const computedN = nanoComputed(baseAtomN, (val) => val * 2);
    const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2);
    // Zustand: Selector pattern (typically in hooks, vanilla equivalent less common)
    const selectComputedZu = (state: { count: number }) => state.count * 2;
    // Valtio: Use a getter
    const derivedV = { get computed() { return baseProxyV.count * 2; } };
    // Effector: Derived store
    const computedE = baseStoreE.map(val => val * 2);


    const jotaiReadSetupCompGet = createJotaiReadBenchSetup(computedJ); // OK: Read setup accepts read-only computed atom

    bench('zen', () => {
      computedZ.get();
    });

    bench('nanostores', () => {
      computedN.get();
    });

    bench('jotai (via hook)', () => {
       jotaiReadSetupCompGet.get(); // Get the value via the hook
    });

    bench('zustand (selector)', () => {
       selectComputedZu(baseStoreZu.getState()); // Read via selector function
    });

    bench('valtio (getter)', () => {
       derivedV.computed; // Read via getter
    });

     bench('effector (derived store)', () => {
       computedE.getState(); // Read derived store state
     });
});

describe('Computed Update Propagation (1 dependency)', () => {
  const baseAtomZ = zenAtom(0);
    const baseAtomN = nanoAtom(0);
    const baseAtomJ = jotaiAtom(0);
    const baseStoreZu = createZustandVanillaStore(() => ({ count: 0 }));
    const baseProxyV = valtioProxy({ count: 0 });
    const setBaseE = createEffectorEvent<number>();
  const baseStoreE = createEffectorStore(0).on(setBaseE, (_, p) => p);

  const computedZ = zenComputed([baseAtomZ], (val) => val * 2);
  const computedN = nanoComputed(baseAtomN, (val) => val * 2);
  const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2);
  const selectComputedZu = (state: { count: number }) => state.count * 2;
  const derivedV = { get computed() { return baseProxyV.count * 2; } }; // Valtio getter
  const computedE = baseStoreE.map(val => val * 2);


  // Subscribe to ensure computation runs or updates are tracked
  computedZ.subscribe(() => {});
  computedN.subscribe(() => {});
  // For Jotai update propagation, we need to SET the BASE atom and READ the COMPUTED atom.
  const jotaiReadSetupForComputedUpdate = createJotaiReadBenchSetup(computedJ); // Setup to read the computed value
  const setBaseJ = jotaiReadSetupForComputedUpdate.store.set; // Get the set function from the *same store* used for reading computed

  // Zustand: Subscribe to the store to mimic update detection
  baseStoreZu.subscribe(() => { selectComputedZu(baseStoreZu.getState()); });
  // Valtio: Subscribe to the base proxy
  valtioSubscribe(baseProxyV, () => { derivedV.computed; });
  // Effector: Watch the computed store
  computedE.watch(() => {});


  let i = 0;

  bench('zen', () => {
    baseAtomZ.set(++i);
    computedZ.get(); // Get computed value
  });

  bench('nanostores', () => {
    baseAtomN.set(++i);
    computedN.get(); // Get computed value
  });

  bench('jotai (via hook update)', () => {
    act(() => setBaseJ(baseAtomJ, ++i)); // Set the BASE atom
    jotaiReadSetupForComputedUpdate.get(); // Read the COMPUTED atom via its hook setup
  });

   bench('zustand (vanilla update + select)', () => {
     baseStoreZu.setState({ count: ++i }); // Update base store
     // Selector is implicitly re-run on read by subscriber, benchmark includes update + read
   });

   bench('valtio (vanilla update + getter)', () => {
     baseProxyV.count = ++i; // Update base proxy
     // Getter is re-run on read by subscriber, benchmark includes update + read
   });

   bench('effector (event + derived read)', () => {
     setBaseE(++i); // Trigger event to update base store
     computedE.getState(); // Read derived store
   });
});

// Note: Benchmarks involving hooks (Jotai, potentially Zustand usage) add overhead.
// Vanilla benchmarks aim for core comparisons but might not reflect typical framework usage.
// Effector/Valtio/Zustand derived state patterns differ significantly, making direct 'computed' comparisons complex.

// --- Map Benchmarks ---

describe('Map Creation', () => {
    bench('zen', () => {
        zenMap({ name: 'John', age: 30 });
    });

    bench('nanostores', () => {
        nanoMap({ name: 'John', age: 30 });
    });

    // Other libs handle objects differently, direct map comparison less applicable
});

describe('Map Get', () => {
    const zMap = zenMap({ name: 'John', age: 30 });
    const nMap = nanoMap({ name: 'John', age: 30 });

    bench('zen', () => {
        zMap.get();
    });

    bench('nanostores', () => {
        nMap.get();
    });
});

describe('Map Set Key (No Listeners)', () => {
    const zMap = zenMap({ name: 'John', age: 30 });
    const nMap = nanoMap({ name: 'John', age: 30 });
    let i = 0;

    bench('zen', () => {
        zMap.setKey('age', ++i);
    });

    bench('nanostores', () => {
        nMap.setKey('age', ++i);
    });
});

describe('Map Set Full Object (No Listeners)', () => {
    const zMap = zenMap({ name: 'John', age: 30 });
    const nMap = nanoMap({ name: 'John', age: 30 });
    let i = 0;

    bench('zen', () => {
        zMap.set({ name: 'Jane', age: ++i });
    });

    // Nanostores map doesn't have a direct full 'set' method, it uses setKey
    // bench('nanostores', () => { ... });
});


// --- Task Benchmarks ---

describe('Task Creation', () => {
    const asyncFn = async () => { await new Promise(r => setTimeout(r, 0)); return 'done'; };
    bench('zen', () => {
        zenTask(asyncFn);
    });
    // No direct equivalents in other libs for simple creation bench
});

describe('Task Run (Resolve)', () => {
    const asyncFnResolve = async () => { await new Promise(r => setTimeout(r, 0)); return 'done'; };
    const zTaskResolve = zenTask(asyncFnResolve);

    bench('zen (resolve)', async () => {
        // Run and await completion, but the benchmark measures the time to initiate and settle
        await zTaskResolve.run();
    });
});

describe('Task Run (Reject)', () => {
    const asyncFnReject = async () => { await new Promise(r => setTimeout(r, 0)); throw new Error('fail'); };
    const zTaskReject = zenTask(asyncFnReject);

    bench('zen (reject)', async () => {
        try {
            await zTaskReject.run();
        } catch {
            // ignore error for benchmark
        }
    });
});
