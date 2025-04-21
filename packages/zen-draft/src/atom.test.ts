import { zen as atom, get, subscribe } from '@sylphlab/zen-core';
import { describe, expect, it, vi } from 'vitest';
import { produceAtom } from './atom';
import type { Patch } from './types';

// Define interfaces for test states
interface SimpleState {
  a: number;
  b?: { c: number };
}
interface NestedState {
  data: { value: number; items: string[] };
}

describe('produceAtom', () => {
  it('should update atom state immutably based on recipe mutations', () => {
    const baseState: SimpleState = { a: 1, b: { c: 2 } };
    const myAtom = atom(baseState);
    const listener = vi.fn();
    subscribe(myAtom, listener);

    const [patches, inversePatches] = produceAtom(
      myAtom,
      (draft) => {
        draft.a = 10;
        if (draft.b) {
          // Type guard
          draft.b.c = 20;
        }
        return undefined;
      },
      { patches: true, inversePatches: true },
    );

    const nextState = get(myAtom);
    expect(nextState).not.toBe(baseState); // Ensure new root reference
    expect(nextState.b).not.toBe(baseState.b); // Ensure nested object is new reference
    expect(nextState).toEqual({ a: 10, b: { c: 20 } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(nextState); // Listener called with the new state object
    expect(baseState).toEqual({ a: 1, b: { c: 2 } }); // Original state untouched

    // Verify patches
    expect(patches).toEqual([
      { op: 'replace', path: ['a'], value: 10 },
      { op: 'replace', path: ['b', 'c'], value: 20 },
    ]);
    // Verify inverse patches (order might vary)
    expect(inversePatches).toContainEqual({ op: 'replace', path: ['a'], value: 1 });
    expect(inversePatches).toContainEqual({ op: 'replace', path: ['b', 'c'], value: 2 });
    expect(inversePatches.length).toBe(2);
  });

  it('should not update atom or call listener if recipe results in no changes', () => {
    const baseState = { a: 1 };
    const myAtom = atom(baseState);
    const listener = vi.fn();
    subscribe(myAtom, listener);

    const [patches, inversePatches] = produceAtom(
      myAtom,
      (_draft) => {
        // No changes made
        return undefined;
      },
      { patches: true, inversePatches: true },
    );

    expect(get(myAtom)).toBe(baseState); // Should be the exact same object
    expect(listener).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
    expect(inversePatches).toEqual([]);
  });

  it('should update atom with the exact value returned by the recipe', () => {
    const baseState = { a: 1 };
    const myAtom = atom(baseState);
    const listener = vi.fn();
    subscribe(myAtom, listener);
    const newState = { b: 2 }; // A completely different object

    // produceAtom's recipe *should* ideally return T | undefined.
    // We test if the underlying produce handles returning a new object,
    // even if the type signature isn't perfect.
    const [patches, inversePatches] = produceAtom(
      myAtom,
      (draft) => {
        draft.a = 100; // This mutation is ignored
        // biome-ignore lint/suspicious/noExplicitAny: Testing return override behavior
        return newState as any;
      },
      { patches: true, inversePatches: true },
    );

    expect(get(myAtom)).toBe(newState); // Should be the exact new object returned
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newState);
    expect(patches).toEqual([]); // No patches when value is returned
    expect(inversePatches).toEqual([]);
    expect(baseState).toEqual({ a: 1 }); // Original state untouched
  });

  it('should handle mutations in nested structures', () => {
    const baseState: NestedState = { data: { value: 10, items: ['x', 'y'] } };
    const myAtom = atom(baseState);
    const listener = vi.fn();
    subscribe(myAtom, listener);

    const [patches, inversePatches] = produceAtom(
      myAtom,
      (draft) => {
        draft.data.value = 20;
        draft.data.items.push('z');
        return undefined;
      },
      { patches: true, inversePatches: true },
    );

    const nextState = get(myAtom);
    expect(nextState).not.toBe(baseState);
    expect(nextState.data).not.toBe(baseState.data);
    expect(nextState.data.items).not.toBe(baseState.data.items);
    expect(nextState).toEqual({ data: { value: 20, items: ['x', 'y', 'z'] } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(nextState);
    expect(baseState).toEqual({ data: { value: 10, items: ['x', 'y'] } });

    // Verify patches
    expect(patches).toEqual([
      { op: 'replace', path: ['data', 'value'], value: 20 },
      { op: 'add', path: ['data', 'items', 2], value: 'z' },
    ]);
    // Verify inverse patches
    expect(inversePatches).toContainEqual({ op: 'replace', path: ['data', 'value'], value: 10 });
    expect(inversePatches).toContainEqual({ op: 'remove', path: ['data', 'items', 2] });
    expect(inversePatches.length).toBe(2);
  });

  it('should pass options correctly to the underlying produce function', () => {
    const baseState = { count: 0 };
    const myAtom = atom(baseState);
    const [patches, inversePatches] = produceAtom(
      myAtom,
      (draft) => {
        draft.count++;
        return undefined;
      },
      { patches: true, inversePatches: true }, // Request both patches
    );

    expect(get(myAtom)).toEqual({ count: 1 });
    expect(patches).toEqual([{ op: 'replace', path: ['count'], value: 1 }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['count'], value: 0 }]);
  });

  // Add more tests for complex scenarios, Map/Set within atoms, etc. if needed
});
