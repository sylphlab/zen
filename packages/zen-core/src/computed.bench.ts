// @vitest-environment jsdom
import { bench, describe } from 'vitest';
import { atom as zenAtom } from './atom'; // Import base atom
import { computed as zenComputed } from './computed'; // Import computed
import { atom as nanoAtom, computed as nanoComputed } from 'nanostores';
import { atom as jotaiAtom, useAtomValue, useSetAtom, Provider, createStore as createJotaiStore, Atom, WritableAtom } from 'jotai';
import { createStore as createZustandVanillaStore } from 'zustand/vanilla';
import { proxy as valtioProxy, subscribe as valtioSubscribe } from 'valtio/vanilla';
import { createStore as createEffectorStore, createEvent as createEffectorEvent } from 'effector';
import { createElement } from 'react';
import { renderHook, act } from '@testing-library/react';

// --- Common Setup Helpers (Duplicated for computed tests) ---
const createJotaiReadBenchSetup = <T>(atomToRead: Atom<T>) => {
    const store = createJotaiStore();
    store.get(atomToRead); // Ensure initial value
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
    const { result } = renderHook(() => useAtomValue(atomToRead, { store }), { wrapper });
    return { get: () => result.current, store };
};

// --- Computed Benchmarks ---

describe('Computed Creation', () => {
  const baseAtomZ = zenAtom(0);
  const baseAtomN = nanoAtom(0);
  const baseAtomJ = jotaiAtom(0);

  bench('zen (1 dependency)', () => {
    zenComputed([baseAtomZ], (val) => val * 2);
  });

  bench('nanostores (1 dependency)', () => {
    nanoComputed(baseAtomN, (val) => val * 2);
  });

  bench('jotai (1 dependency)', () => {
    jotaiAtom((get) => get(baseAtomJ) * 2);
  });

   bench('effector (derived store)', () => {
     const base = createEffectorStore(0);
     base.map(val => val * 2);
   });

});

describe('Computed Get (1 dependency)', () => {
    const baseAtomZ = zenAtom(5);
    const baseAtomN = nanoAtom(5);
    const baseAtomJ = jotaiAtom(5);
    const baseStoreZu = createZustandVanillaStore(() => ({ count: 5 }));
    const baseProxyV = valtioProxy({ count: 5 });
    const baseStoreE = createEffectorStore(5);

    const computedZ = zenComputed([baseAtomZ], (val) => val * 2);
    const computedN = nanoComputed(baseAtomN, (val) => val * 2);
    const computedJ = jotaiAtom((get) => get(baseAtomJ) * 2);
    const selectComputedZu = (state: { count: number }) => state.count * 2;
    const derivedV = { get computed() { return baseProxyV.count * 2; } };
    const computedE = baseStoreE.map(val => val * 2);

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
      computedZ.get();
    });

    bench('nanostores', () => {
      computedN.get();
    });

    // Jotai benchmarks moved up

    bench('zustand (selector)', () => {
       selectComputedZu(baseStoreZu.getState());
    });

    bench('valtio (getter)', () => {
       derivedV.computed;
    });

     bench('effector (derived store)', () => {
       computedE.getState();
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
  const derivedV = { get computed() { return baseProxyV.count * 2; } };
  const computedE = baseStoreE.map(val => val * 2);

  // Subscribe/Watch to trigger updates
  computedZ.subscribe(() => {}); // Zen
  computedN.subscribe(() => {}); // Nanostores

  // Jotai via hook setup
  const jotaiReadSetupForComputedUpdateHook = createJotaiReadBenchSetup(computedJ);
  const setBaseJHook = jotaiReadSetupForComputedUpdateHook.store.set;

  // Jotai via store setup
  const jotaiStoreForCompUpdate = createJotaiStore();
  jotaiStoreForCompUpdate.sub(computedJ, () => {}); // Subscribe to computed
  const setBaseJStore = jotaiStoreForCompUpdate.set;

  // Zustand setup
  baseStoreZu.subscribe(() => { selectComputedZu(baseStoreZu.getState()); });
  // Valtio setup
  valtioSubscribe(baseProxyV, () => { derivedV.computed; });
  // Effector setup
  computedE.watch(() => {});

  let i = 0;

  bench('zen', () => {
    baseAtomZ.set(++i);
    computedZ.get();
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
