// @vitest-environment jsdom
import { bench, describe } from 'vitest';
import { createAtom as zenCreateAtom, get as zenGetAtomValue, set as zenSetAtomValue, subscribe as zenSubscribeToAtom } from './atom'; // Import updated functional API
import { atom as nanoAtom } from 'nanostores';
import { atom as jotaiAtom, useAtomValue, useSetAtom, Provider, createStore as createJotaiStore, Atom, WritableAtom } from 'jotai';
import { createStore as createZustandVanillaStore } from 'zustand/vanilla';
import type { StoreApi, UseBoundStore } from 'zustand';
import { proxy as valtioProxy, subscribe as valtioSubscribe } from 'valtio/vanilla';
import { createStore as createEffectorStore, createEvent as createEffectorEvent } from 'effector';
import { createElement } from 'react';
import { renderHook, act } from '@testing-library/react';

// --- Common Setup Helpers (Duplicated from original index.bench.ts for atom tests) ---
const createJotaiReadBenchSetup = <T>(atomToRead: Atom<T>) => {
    const store = createJotaiStore();
    store.get(atomToRead); // Ensure initial value
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
    const { result } = renderHook(() => useAtomValue(atomToRead, { store }), { wrapper });
    return { get: () => result.current, store };
};

const createJotaiWriteBenchSetup = <Value, Args extends unknown[], Result>(
    atomToWrite: WritableAtom<Value, Args, Result>
) => {
    const store = createJotaiStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
    const { result } = renderHook(() => useSetAtom(atomToWrite, { store }), { wrapper });
    return { set: result.current, store };
};

// --- Atom Benchmarks ---

describe('Atom Creation', () => {
  bench('zen', () => {
    zenCreateAtom(0); // Use createAtom
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

describe('Atom Get', () => {
  const zAtom = zenCreateAtom(0); // Use createAtom
  const nAtom = nanoAtom(0);

  bench('zen', () => {
    zenGetAtomValue(zAtom); // Use functional API
  });

  bench('nanostores', () => {
    nAtom.get();
  });

  // Jotai via hook
  const jotaiReadSetupGetHook = createJotaiReadBenchSetup(jotaiAtom(0));
  bench('jotai (via hook)', () => {
    jotaiReadSetupGetHook.get();
  });

  // Jotai via store.get
  const jotaiStoreForGet = createJotaiStore();
  const jotaiAtomForGet = jotaiAtom(0);
  jotaiStoreForGet.get(jotaiAtomForGet); // Initial get
  bench('jotai (via store.get)', () => {
    jotaiStoreForGet.get(jotaiAtomForGet);
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
  const zAtom = zenCreateAtom(0); // Use createAtom
  const nAtom = nanoAtom(0);
  let i = 0;

  bench('zen', () => {
    zenSetAtomValue(zAtom, ++i); // Use functional API
  });

  bench('nanostores', () => {
    nAtom.set(++i);
  });

  // Jotai via hook
  const baseJotaiAtomForSetHook = jotaiAtom(0);
  const jotaiWriteSetupSetHook = createJotaiWriteBenchSetup(baseJotaiAtomForSetHook);
  bench('jotai (via hook)', () => {
    act(() => jotaiWriteSetupSetHook.set(++i));
  });

  // Jotai via store.set
  const jotaiStoreForSet = createJotaiStore();
  const jotaiAtomForSet = jotaiAtom(0);
  bench('jotai (via store.set)', () => {
    jotaiStoreForSet.set(jotaiAtomForSet, ++i);
  });


  interface ZustandState {
    count: number;
    inc: () => void;
  }
  const zustandStoreSet = createZustandVanillaStore<ZustandState>((set) => ({
    count: 0,
    inc: () => set((state: ZustandState) => ({ count: state.count + 1 })),
  }));
  bench('zustand (vanilla)', () => {
     zustandStoreSet.setState({ count: ++i });
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


describe('Atom Subscribe/Unsubscribe', () => {
    const listener = () => {};

    bench('zen', () => {
      const zAtom = zenCreateAtom(0); // Use createAtom
      const unsub = zenSubscribeToAtom(zAtom, listener); // Use subscribe
      unsub();
    });

    bench('nanostores', () => {
      const nAtom = nanoAtom(0);
      const unsub = nAtom.subscribe(listener);
      unsub();
    });

    // Jotai store.sub remains the same as it's already store-based
    bench('jotai (store.sub)', () => {
        const jAtomSub = jotaiAtom(0);
        const storeSub = createJotaiStore();
        const unsubSub = storeSub.sub(jAtomSub, listener);
        unsubSub();
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
        const unsub = store.watch(listener);
        unsub();
    });
});
