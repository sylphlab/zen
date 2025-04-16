// @vitest-environment jsdom
import { bench, describe } from 'vitest';
import { atom as zenAtom } from './atom'; // Import directly from atom.ts
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

describe('Atom Get', () => {
  const zAtom = zenAtom(0);
  const nAtom = nanoAtom(0);

  bench('zen', () => {
    zAtom.get();
  });

  bench('nanostores', () => {
    nAtom.get();
  });

  const jotaiReadSetupGet = createJotaiReadBenchSetup(jotaiAtom(0));
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

  const baseJotaiAtomForSet = jotaiAtom(0);
  const jotaiWriteSetupSet = createJotaiWriteBenchSetup(baseJotaiAtomForSet);
  bench('jotai (via hook)', () => {
    act(() => jotaiWriteSetupSet.set(++i));
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
      const zAtom = zenAtom(0);
      const unsub = zAtom.subscribe(listener);
      unsub();
    });

    bench('nanostores', () => {
      const nAtom = nanoAtom(0);
      const unsub = nAtom.subscribe(listener);
      unsub();
    });

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
        const unsub = store.watch(listener);
        unsub();
    });
});
