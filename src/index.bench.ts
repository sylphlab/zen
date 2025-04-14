// @vitest-environment jsdom
import { bench, describe } from 'vitest';
import { atom as zenAtom, computed as zenComputed } from './index';
import { atom as nanoAtom, computed as nanoComputed } from 'nanostores';
import { atom as jotaiAtom, useAtomValue, useSetAtom, Provider, createStore } from 'jotai';
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
});

// Jotai's primary interface is hooks, making direct get/set less common/idiomatic.
// We'll benchmark using hooks within a testing environment.
// Setup for Jotai hook benchmarks
const createJotaiBenchSetup = <T>(initialValue: T) => {
  const testAtom = jotaiAtom(initialValue);
  const store = createStore(); // Create a specific store instance
  const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });

  const { result: readResult } = renderHook(() => useAtomValue(testAtom, { store }), { wrapper });
  const { result: writeResult } = renderHook(() => useSetAtom(testAtom, { store }), { wrapper });

  return { atom: testAtom, store, wrapper, get: () => readResult.current, set: writeResult.current };
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

  const jotaiSetupGet = createJotaiBenchSetup(0);
  bench('jotai (via hook)', () => {
    jotaiSetupGet.get();
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

  const jotaiSetupSet = createJotaiBenchSetup(0);
  bench('jotai (via hook)', () => {
    act(() => jotaiSetupSet.set(++i));
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
        const store = createStore();
        const unsub = store.sub(jAtom, listener);
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
});

describe('Computed Get (1 dependency)', () => {
    const baseAtomZ = zenAtom(5);
    const baseAtomN = nanoAtom(5);
    const baseAtomJ = jotaiAtom(5);
    const computedZ = zenComputed([baseAtomZ], (val) => val * 2);
    const computedN = nanoComputed(baseAtomN, (val) => val * 2);
    const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2);
    const jotaiSetupCompGet = createJotaiBenchSetup(computedJ); // Wrap computed atom

    bench('zen', () => {
      computedZ.get();
    });

    bench('nanostores', () => {
      computedN.get();
    });

    bench('jotai (via hook)', () => {
       jotaiSetupCompGet.get(); // Get the value via the hook
    });
});

describe('Computed Update Propagation (1 dependency)', () => {
  const baseAtomZ = zenAtom(0);
  const baseAtomN = nanoAtom(0);
  const baseAtomJ = jotaiAtom(0); // Base for Jotai
  const computedZ = zenComputed([baseAtomZ], (val) => val * 2);
  const computedN = nanoComputed(baseAtomN, (val) => val * 2);
  const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2); // Jotai computed
  // Subscribe to ensure computation runs
  computedZ.subscribe(() => {});
  computedN.subscribe(() => {});
  // Setup Jotai hook subscription
  const jotaiSetupCompUpdate = createJotaiBenchSetup(computedJ);
  const setBaseJ = jotaiSetupCompUpdate.store.set; // Get function to set base atom value directly in store

  let i = 0;

  bench('zen', () => {
    baseAtomZ.set(++i); // Update base, triggers computed update
    computedZ.get(); // Get computed value (may involve recalc)
  });

  bench('nanostores', () => {
    baseAtomN.set(++i); // Update base, triggers computed update
    computedN.get(); // Get computed value (may involve recalc)
  });

  bench('jotai (via hook update)', () => {
    act(() => setBaseJ(baseAtomJ, ++i)); // Update base atom in the store
    jotaiSetupCompUpdate.get(); // Read the computed value via hook (triggers re-render/re-calc)
  });
});

// Note: React/Jotai hook benchmarks add overhead from React itself and the testing library,
// so they aren't a perfect 1:1 comparison for raw JS operations but reflect typical usage.
