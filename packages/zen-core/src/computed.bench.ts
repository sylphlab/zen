import { act, renderHook } from '@testing-library/react';
import { createEvent as createEffectorEvent, createStore as createEffectorStore } from 'effector';
import {
  Provider,
  createStore as createJotaiStore,
  atom as jotaiAtom,
  useAtomValue /* useSetAtom, */,
} from 'jotai'; // Removed unused useSetAtom
import type { Atom /*, WritableAtom */ } from 'jotai'; // Removed unused WritableAtom
import { atom as nanoAtom, computed as nanoComputed } from 'nanostores';
import type * as React from 'react'; // Added missing import
import { createElement } from 'react';
import { proxy as valtioProxy, subscribe as valtioSubscribe } from 'valtio/vanilla';
// @vitest-environment jsdom
import { bench, describe } from 'vitest';
import { createStore as createZustandVanillaStore } from 'zustand/vanilla';
import { computed as zenCreateComputed } from './computed'; // Import computed factory, alias as zenCreateComputed
import {
  zen as zenCreateAtom,
  get as zenGetAtomValue,
  set as zenSetAtomValue,
  subscribe as zenSubscribeToAtom,
} from './zen'; // Import updated functional API, alias atom as zenCreateAtom

// --- Common Setup Helpers (Duplicated for computed tests) ---
const createJotaiReadBenchSetup = <T>(atomToRead: Atom<T>) => {
  // Use imported Atom type
  const store = createJotaiStore();
  store.get(atomToRead); // Ensure initial value
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store, children });
  const { result } = renderHook(() => useAtomValue(atomToRead, { store }), { wrapper });
  return { get: () => result.current, store };
};

/* // Removed unused function createJotaiWriteBenchSetup
const createJotaiWriteBenchSetup = <Value, Args extends unknown[], Result>(
    atomToWrite: WritableAtom<Value, Args, Result> // Use imported WritableAtom type
) => {
    const store = createJotaiStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
    const { result } = renderHook(() => useSetAtom(atomToWrite, { store }), { wrapper });
    return { set: result.current, store };
};
*/

// --- Computed Benchmarks ---

describe('Computed Creation', () => {
  const baseAtomZ = zenCreateAtom(0); // Use createAtom
  const baseAtomN = nanoAtom(0);
  const baseAtomJ = jotaiAtom(0);

  bench('zen (1 dependency)', () => {
    // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
    zenCreateComputed([baseAtomZ as any], (...values) => (values[0] as number) * 2); // Use rest parameters
  });

  bench('nanostores (1 dependency)', () => {
    nanoComputed(baseAtomN, (val) => val * 2);
  });

  bench('jotai (1 dependency)', () => {
    jotaiAtom((get) => get(baseAtomJ) * 2);
  });

  bench('effector (derived store)', () => {
    const base = createEffectorStore(0);
    base.map((val) => val * 2);
  });
});

describe('Computed Get (1 dependency)', () => {
  const baseAtomZ = zenCreateAtom(5); // Use createAtom
  const baseAtomN = nanoAtom(5);
  const baseAtomJ = jotaiAtom(5);
  const baseStoreZu = createZustandVanillaStore(() => ({ count: 5 }));
  const baseProxyV = valtioProxy({ count: 5 });
  const baseStoreE = createEffectorStore(5);

  // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
  const computedZ = zenCreateComputed([baseAtomZ as any], (...values) => (values[0] as number) * 2); // Use rest parameters
  const computedN = nanoComputed(baseAtomN, (val) => val * 2);
  const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2);
  const selectComputedZu = (state: { count: number }) => state.count * 2;
  const derivedV = {
    get computed() {
      return baseProxyV.count * 2;
    },
  };
  const computedE = baseStoreE.map((val) => val * 2);

  // Jotai via hook
  const jotaiReadSetupCompGetHook = createJotaiReadBenchSetup(computedJ);
  bench('jotai (via hook)', () => {
    jotaiReadSetupCompGetHook.get();
  });

  // Jotai via store.get
  const jotaiStoreForCompGet = createJotaiStore();
  jotaiStoreForCompGet.get(computedJ); // Initial get
  bench('jotai (via store.get)', () => {
    jotaiStoreForCompGet.get(computedJ);
  });

  bench('zen', () => {
    zenGetAtomValue(computedZ); // Use functional API
  });

  bench('nanostores', () => {
    computedN.get();
  });

  // Jotai benchmarks moved up

  bench('zustand (selector)', () => {
    selectComputedZu(baseStoreZu.getState());
  });

  bench('valtio (getter)', () => {
    const _derivedValtio = derivedV.computed; // Assign to avoid unused expression
  });

  bench('effector (derived store)', () => {
    computedE.getState();
  });
});

describe('Computed Update Propagation (1 dependency)', () => {
  const baseAtomZ = zenCreateAtom(0); // Use createAtom
  const baseAtomN = nanoAtom(0);
  const baseAtomJ = jotaiAtom(0);
  const baseStoreZu = createZustandVanillaStore(() => ({ count: 0 }));
  const baseProxyV = valtioProxy({ count: 0 });
  const setBaseE = createEffectorEvent<number>();
  const baseStoreE = createEffectorStore(0).on(setBaseE, (_, p) => p);

  // biome-ignore lint/suspicious/noExplicitAny: Test setup requires cast
  const computedZ = zenCreateComputed([baseAtomZ as any], (...values) => (values[0] as number) * 2); // Use rest parameters
  const computedN = nanoComputed(baseAtomN, (val) => val * 2);
  const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2);
  const selectComputedZu = (state: { count: number }) => state.count * 2;
  const derivedV = {
    get computed() {
      return baseProxyV.count * 2;
    },
  };
  const computedE = baseStoreE.map((val) => val * 2);

  // Subscribe/Watch to trigger updates
  zenSubscribeToAtom(computedZ, () => {}); // Zen - Use functional API
  computedN.subscribe(() => {}); // Nanostores

  // Jotai via hook setup
  const jotaiReadSetupForComputedUpdateHook = createJotaiReadBenchSetup(computedJ);
  const setBaseJHook = jotaiReadSetupForComputedUpdateHook.store.set;

  // Jotai via store setup
  const jotaiStoreForCompUpdate = createJotaiStore();
  jotaiStoreForCompUpdate.sub(computedJ, () => {}); // Subscribe to computed
  const setBaseJStore = jotaiStoreForCompUpdate.set;

  // Zustand setup
  baseStoreZu.subscribe(() => {
    selectComputedZu(baseStoreZu.getState());
  });
  // Valtio setup
  valtioSubscribe(baseProxyV, () => {
    const _derivedValtio = derivedV.computed;
  }); // Assign to avoid unused expression
  // Effector setup
  computedE.watch(() => {});

  let i = 0;

  bench('zen', () => {
    zenSetAtomValue(baseAtomZ, ++i); // Use functional API
    zenGetAtomValue(computedZ);
  });

  bench('nanostores', () => {
    baseAtomN.set(++i);
    computedN.get();
  });

  // Jotai via hook
  bench('jotai (via hook update)', () => {
    act(() => setBaseJHook(baseAtomJ, ++i));
    jotaiReadSetupForComputedUpdateHook.get(); // Read computed after update
  });

  // Jotai via store
  bench('jotai (via store update)', () => {
    setBaseJStore(baseAtomJ, ++i);
    jotaiStoreForCompUpdate.get(computedJ); // Read computed after update
  });

  bench('zustand (vanilla update + select)', () => {
    baseStoreZu.setState({ count: ++i });
  });

  bench('valtio (vanilla update + getter)', () => {
    baseProxyV.count = ++i;
  });

  bench('effector (event + derived read)', () => {
    setBaseE(++i);
    computedE.getState();
  });
});
