// Import zen atom factory and functions directly
import { atom, get, set } from '@sylphlab/zen-core';
import type { Atom } from '@sylphlab/zen-core';
// Import immer for comparison
import { produce as immerProduce } from 'immer';
import { beforeAll, describe, expect, it } from 'vitest'; // Ensure beforeAll is imported
import { type Patch, applyPatches, produce, produceAtom } from './index';

describe('produce', () => {
  it('should handle basic property addition', () => {
    const baseState = { name: 'Alice' };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { name: string; age?: number }) => {
        draft.age = 30;
      },
      { patches: true, inversePatches: true },
    );

    expect(nextState).toEqual({ name: 'Alice', age: 30 });
    expect(nextState).not.toBe(baseState);
    expect(patches).toEqual([{ op: 'add', path: ['age'], value: 30 }]);
    expect(inversePatches).toEqual([{ op: 'remove', path: ['age'] }]);
  });

  it('should handle basic property replacement', () => {
    const baseState = { name: 'Alice', age: 30 };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { name: string; age: number }) => {
        draft.age = 31;
      },
      { patches: true, inversePatches: true },
    );

    expect(nextState).toEqual({ name: 'Alice', age: 31 });
    expect(nextState).not.toBe(baseState);
    expect(patches).toEqual([{ op: 'replace', path: ['age'], value: 31 }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['age'], value: 30 }]);
  });

  it('should handle basic property removal', () => {
    const baseState = { name: 'Alice', age: 30, city: 'Wonderland' };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { name: string; age: number; city?: string }) => {
        draft.city = undefined;
      },
      { patches: true, inversePatches: true },
    );

    expect(nextState).toEqual({ name: 'Alice', age: 30 });
    expect(nextState).not.toBe(baseState);
    expect(patches).toEqual([{ op: 'remove', path: ['city'] }]);
    expect(inversePatches).toEqual([{ op: 'add', path: ['city'], value: 'Wonderland' }]);
  });

  it('should return the original object if no changes are made', () => {
    const baseState = { name: 'Alice', age: 30 };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (_draft: { name: string; age: number }) => {
        // No mutations
      },
      { patches: true, inversePatches: true },
    );

    expect(nextState).toEqual({ name: 'Alice', age: 30 });
    expect(nextState).toBe(baseState);
    expect(patches).toEqual([]);
    expect(inversePatches).toEqual([]);
  });

  it('should handle nested object mutations', () => {
    const baseState = { user: { name: 'Alice', address: { street: '123 Main St' } } };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { user: { name: string; address: { street: string } } }) => {
        draft.user.name = 'Bob';
        draft.user.address.street = '456 Side St';
      },
      { patches: true, inversePatches: true },
    );

    expect(nextState).toEqual({ user: { name: 'Bob', address: { street: '456 Side St' } } });
    expect(nextState).not.toBe(baseState);
    expect(nextState.user).not.toBe(baseState.user);
    expect(nextState.user.address).not.toBe(baseState.user.address);
    expect(patches).toEqual([
      { op: 'replace', path: ['user', 'name'], value: 'Bob' },
      { op: 'replace', path: ['user', 'address', 'street'], value: '456 Side St' },
    ]);
    expect(inversePatches).toEqual([
      { op: 'replace', path: ['user', 'name'], value: 'Alice' },
      { op: 'replace', path: ['user', 'address', 'street'], value: '123 Main St' },
    ]);
  });

  it('should handle array push', () => {
    const baseState = { items: [1, 2] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        draft.items.push(3);
        draft.items.push(4);
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [1, 2, 3, 4] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([
      { op: 'add', path: ['items', 2], value: 3 },
      { op: 'add', path: ['items', 3], value: 4 },
    ]);
    expect(inversePatches).toEqual([
      { op: 'remove', path: ['items', 2] },
      { op: 'remove', path: ['items', 3] },
    ]);
  });

  it('should handle array pop', () => {
    const baseState = { items: [1, 2, 3] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        expect(draft.items.pop()).toBe(3);
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [1, 2] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([{ op: 'remove', path: ['items', 2] }]);
    expect(inversePatches).toEqual([{ op: 'add', path: ['items', 2], value: 3 }]);
  });

  it('should handle array splice (delete)', () => {
    const baseState = { items: [1, 2, 3, 4] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        draft.items.splice(1, 2); // Remove 2 and 3
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [1, 4] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([
      { op: 'remove', path: ['items', 1] },
      { op: 'remove', path: ['items', 1] },
    ]);
    expect(inversePatches).toEqual([
      { op: 'add', path: ['items', 1], value: 2 },
      { op: 'add', path: ['items', 2], value: 3 },
    ]);
  });

  it('should handle array splice (add)', () => {
    const baseState = { items: [1, 4] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        draft.items.splice(1, 0, 2, 3); // Insert 2 and 3 at index 1
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [1, 2, 3, 4] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([
      { op: 'add', path: ['items', 1], value: 2 },
      { op: 'add', path: ['items', 2], value: 3 },
    ]);
    expect(inversePatches).toEqual([
      { op: 'remove', path: ['items', 1] },
      { op: 'remove', path: ['items', 2] },
    ]);
  });

  it('should handle array splice (replace)', () => {
    const baseState = { items: [1, 9, 9, 4] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        draft.items.splice(1, 2, 2, 3); // Replace 9, 9 with 2, 3
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [1, 2, 3, 4] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([
      { op: 'remove', path: ['items', 1] },
      { op: 'remove', path: ['items', 1] },
      { op: 'add', path: ['items', 1], value: 2 },
      { op: 'add', path: ['items', 2], value: 3 },
    ]);
    expect(inversePatches).toEqual([
      { op: 'remove', path: ['items', 1] },
      { op: 'remove', path: ['items', 2] },
      { op: 'add', path: ['items', 1], value: 9 },
      { op: 'add', path: ['items', 2], value: 9 },
    ]);
  });

  it('should handle Map set (add)', () => {
    const baseState = { data: new Map<string, number>([['a', 1]]) };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Map<string, number> }) => {
        draft.data.set('b', 2);
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Map);
    expect(Object.fromEntries(nextState.data)).toEqual({ a: 1, b: 2 });
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([{ op: 'add', path: ['data', 'b'], value: 2 }]);
    expect(inversePatches).toEqual([{ op: 'remove', path: ['data', 'b'] }]);
  });

  it('should handle Map set (replace)', () => {
    const baseState = { data: new Map<string, number>([['a', 1]]) };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Map<string, number> }) => {
        draft.data.set('a', 10);
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Map);
    expect(Object.fromEntries(nextState.data)).toEqual({ a: 10 });
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([{ op: 'replace', path: ['data', 'a'], value: 10 }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['data', 'a'], value: 1 }]);
  });

  it('should handle Map delete', () => {
    const baseState = {
      data: new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]),
    };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Map<string, number> }) => {
        draft.data.delete('b');
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Map);
    expect(Object.fromEntries(nextState.data)).toEqual({ a: 1 });
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([{ op: 'remove', path: ['data', 'b'] }]);
    expect(inversePatches).toEqual([{ op: 'add', path: ['data', 'b'], value: 2 }]);
  });

  it('should handle Map clear', () => {
    const baseState = {
      data: new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]),
    };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Map<string, number> }) => {
        draft.data.clear();
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Map);
    expect(Object.fromEntries(nextState.data)).toEqual({});
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([
      { op: 'remove', path: ['data', 'a'] },
      { op: 'remove', path: ['data', 'b'] },
    ]);
    expect(inversePatches).toEqual([
      { op: 'add', path: ['data', 'a'], value: 1 },
      { op: 'add', path: ['data', 'b'], value: 2 },
    ]);
  });

  it('should handle Set add', () => {
    const baseState = { data: new Set<string>(['a']) };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Set<string> }) => {
        draft.data.add('b');
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Set);
    expect(Array.from(nextState.data)).toEqual(['a', 'b']);
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([{ op: 'set_add', path: ['data'], value: 'b' }]);
    expect(inversePatches).toEqual([{ op: 'set_delete', path: ['data'], value: 'b' }]);
  });

  it('should handle Set delete', () => {
    const baseState = { data: new Set<string>(['a', 'b']) };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Set<string> }) => {
        draft.data.delete('b');
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Set);
    expect(Array.from(nextState.data)).toEqual(['a']);
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([{ op: 'set_delete', path: ['data'], value: 'b' }]);
    expect(inversePatches).toEqual([{ op: 'set_add', path: ['data'], value: 'b' }]);
  });

  it('should handle Set clear', () => {
    const baseState = { data: new Set<string>(['a', 'b']) };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { data: Set<string> }) => {
        draft.data.clear();
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState.data).toBeInstanceOf(Set);
    expect(Array.from(nextState.data)).toEqual([]);
    expect(nextState.data).not.toBe(baseState.data);
    expect(patches).toEqual([{ op: 'replace', path: ['data'], value: [] }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['data'], value: ['a', 'b'] }]);
  });

  it('should handle array sort', () => {
    const baseState = { items: [3, 1, 4, 2] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        draft.items.sort((a: number, b: number) => a - b);
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [1, 2, 3, 4] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([{ op: 'replace', path: ['items'], value: [1, 2, 3, 4] }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['items'], value: [3, 1, 4, 2] }]);
  });

  it('should handle array reverse', () => {
    const baseState = { items: [1, 2, 3, 4] };
    const [nextState, patches, inversePatches] = produce(
      baseState,
      (draft: { items: number[] }) => {
        draft.items.reverse();
      },
      { patches: true, inversePatches: true },
    );
    expect(nextState).toEqual({ items: [4, 3, 2, 1] });
    expect(nextState.items).not.toBe(baseState.items);
    expect(patches).toEqual([{ op: 'replace', path: ['items'], value: [4, 3, 2, 1] }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['items'], value: [1, 2, 3, 4] }]);
  });

  it('should treat Date objects as immutable', () => {
    const baseDate = new Date();
    const baseState = { date: baseDate, otherProp: 0 };
    const [nextState, patches] = produce(
      baseState,
      (draft: { date: Date; otherProp: number }) => {
        draft.otherProp = 1;
      },
      { patches: true },
    );
    expect(nextState.date).toBe(baseDate);
    expect(nextState).not.toBe(baseState);
    expect(nextState).toEqual({ date: baseDate, otherProp: 1 });
    expect(patches.some((p) => p.path.includes('date'))).toBe(false);
  });

  it('should treat RegExp objects as immutable', () => {
    const baseRegExp = /test/g;
    const baseState = { regex: baseRegExp, otherProp: 0 };
    const [nextState, patches] = produce(
      baseState,
      (draft: { regex: RegExp; otherProp: number }) => {
        draft.otherProp = 1;
      },
      { patches: true },
    );
    expect(nextState.regex).toBe(baseRegExp);
    expect(nextState).not.toBe(baseState);
    expect(nextState).toEqual({ regex: baseRegExp, otherProp: 1 });
    expect(patches.some((p) => p.path.includes('regex'))).toBe(false);
  });

  it('should use the returned value from the recipe if provided', () => {
    const baseState = { count: 1 };
    const newState = { count: 999, message: 'returned' };
    type RecipeState = { count: number; message?: string };

    const recipe = (draft: RecipeState): RecipeState => {
      draft.count++; // This mutation should be ignored
      return newState; // Explicitly return a new state (now compatible)
    };
    const [nextState, patches, inversePatches] = produce<RecipeState>(baseState, recipe, {
      patches: true,
      inversePatches: true,
    });
    expect(nextState).toBe(newState);
    expect(nextState).not.toEqual({ count: 2 });
    expect(patches).toEqual([]);
    expect(inversePatches).toEqual([]);
  });

  it('should auto-freeze the result if option is true', () => {
    const baseState = { a: { b: 1 } };
    const [nextState] = produce(
      baseState,
      (draft) => {
        draft.a.b = 2;
      },
      { autoFreeze: true },
    );
    expect(nextState).not.toBe(baseState);
    expect(Object.isFrozen(nextState)).toBe(true);
    expect(Object.isFrozen(nextState.a)).toBe(true);
  });

  it('should not auto-freeze the result if option is false or omitted', () => {
    const baseState = { a: { b: 1 } };
    const [nextState] = produce(
      baseState,
      (draft) => {
        draft.a.b = 2;
      },
      // autoFreeze is omitted
    );
    expect(nextState).not.toBe(baseState);
    expect(Object.isFrozen(nextState)).toBe(false);
    expect(Object.isFrozen(nextState.a)).toBe(false);

    const [nextState2] = produce(
      baseState,
      (draft) => {
        draft.a.b = 3;
      },
      { autoFreeze: false },
    );
    expect(nextState2).not.toBe(baseState);
    expect(Object.isFrozen(nextState2)).toBe(false);
    expect(Object.isFrozen(nextState2.a)).toBe(false);
  });

  it('should not freeze the original state', () => {
    const baseState = { a: { b: 1 } };
    produce(
      baseState,
      (draft) => {
        draft.a.b = 2;
      },
      { autoFreeze: true },
    );
    expect(Object.isFrozen(baseState)).toBe(false);
    expect(Object.isFrozen(baseState.a)).toBe(false);
  });
}); // End of main produce describe block

describe('applyPatches', () => {
  it('should apply add patch', () => {
    const baseState = { name: 'Alice' };
    const patches: Patch[] = [{ op: 'add', path: ['age'], value: 30 }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ name: 'Alice', age: 30 });
    expect(nextState).not.toBe(baseState);
  });

  it('should apply replace patch', () => {
    const baseState = { name: 'Alice', age: 30 };
    const patches: Patch[] = [{ op: 'replace', path: ['age'], value: 31 }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ name: 'Alice', age: 31 });
    expect(nextState).not.toBe(baseState);
  });

  it('should apply remove patch', () => {
    const baseState = { name: 'Alice', age: 30, city: 'Wonderland' };
    const patches: Patch[] = [{ op: 'remove', path: ['city'] }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ name: 'Alice', age: 30 });
    expect(nextState).not.toBe(baseState);
  });

  it('should apply multiple patches', () => {
    const baseState = { user: { name: 'Alice' } };
    const patches: Patch[] = [
      { op: 'replace', path: ['user', 'name'], value: 'Bob' },
      { op: 'add', path: ['user', 'age'], value: 40 },
    ];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ user: { name: 'Bob', age: 40 } });
    expect(nextState).not.toBe(baseState);
    expect(nextState.user).not.toBe(baseState.user);
  });

  it('should apply array push patches', () => {
    const baseState = { items: [1] };
    const patches: Patch[] = [
      { op: 'add', path: ['items', 1], value: 2 },
      { op: 'add', path: ['items', 2], value: 3 },
    ];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ items: [1, 2, 3] });
    expect(nextState.items).not.toBe(baseState.items);
  });

  it('should apply array splice patches (complex)', () => {
    const baseState = { items: [1, 9, 9, 4] };
    const patches: Patch[] = [
      { op: 'remove', path: ['items', 1] },
      { op: 'remove', path: ['items', 1] },
      { op: 'add', path: ['items', 1], value: 2 },
      { op: 'add', path: ['items', 2], value: 3 },
    ];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ items: [1, 2, 3, 4] });
    expect(nextState.items).not.toBe(baseState.items);
  });

  it('should apply Map patches', () => {
    const baseState = { data: new Map([['a', 1]]) };
    const patches: Patch[] = [
      { op: 'replace', path: ['data', 'a'], value: 10 },
      { op: 'add', path: ['data', 'b'], value: 20 },
    ];
    const nextState = applyPatches(baseState, patches);
    expect(nextState.data).toBeInstanceOf(Map);
    expect(Object.fromEntries(nextState.data)).toEqual({ a: 10, b: 20 });
    expect(nextState.data).not.toBe(baseState.data);
  });

  it('should apply custom Set patches', () => {
    const baseState = { data: new Set(['a']) };
    const patches: Patch[] = [
      { op: 'set_add', path: ['data'], value: 'b' } as Patch,
      { op: 'set_delete', path: ['data'], value: 'a' } as Patch,
    ];
    const nextState = applyPatches(baseState, patches);
    expect(nextState.data).toBeInstanceOf(Set);
    expect(Array.from(nextState.data)).toEqual(['b']);
    expect(nextState.data).not.toBe(baseState.data);
  });

  it('should apply Set replace patch (from array)', () => {
    const baseState = { data: new Set(['a', 'c']) };
    const patches: Patch[] = [{ op: 'replace', path: ['data'], value: ['b', 'c'] }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState.data).toBeInstanceOf(Set);
    expect(Array.from(nextState.data).sort()).toEqual(['b', 'c']);
    expect(nextState.data).not.toBe(baseState.data);
  });

  it('should apply move patch', () => {
    const baseState = { foo: { bar: 'baz' }, qux: 'quux' };
    // Fix: Use array path format
    const patches: Patch[] = [{ op: 'move', from: ['foo', 'bar'], path: ['qux'] }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ foo: {}, qux: 'baz' });
    expect(nextState).not.toBe(baseState);
  });

  it('should apply copy patch', () => {
    const baseState = { foo: { bar: 'baz' } };
    // Fix: Use array path format
    const patches: Patch[] = [{ op: 'copy', from: ['foo', 'bar'], path: ['baz'] }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ foo: { bar: 'baz' }, baz: 'baz' });
    expect(nextState).not.toBe(baseState);
    expect(nextState.foo).toBe(baseState.foo); // Source object should not be copied if not modified
  });

  it('should apply test patch successfully', () => {
    const baseState = { foo: 'bar' };
    // Fix: Use array path format
    const patches: Patch[] = [{ op: 'test', path: ['foo'], value: 'bar' }];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ foo: 'bar' });
    expect(nextState).toBe(baseState); // No modification
  });

  it('should throw error on failed test patch', () => {
    const baseState = { foo: 'bar' };
    // Fix: Use array path format
    const patches: Patch[] = [{ op: 'test', path: ['foo'], value: 'baz' }];
    expect(() => applyPatches(baseState, patches)).toThrow(/'test' operation failed/);
  });

  it('should return the original object if no patches are applied', () => {
    const baseState = { name: 'Alice' };
    const patches: Patch[] = [];
    const nextState = applyPatches(baseState, patches);
    expect(nextState).toEqual({ name: 'Alice' });
    expect(nextState).toBe(baseState);
  });

  // TODO: Add tests for array patches (pop, shift, unshift) - Some covered by produce tests
  // TODO: Add tests for Map clear/delete patches - Some covered by produce tests
  // TODO: Add tests for Set clear patch (replace w/ empty array)
  // TODO: Add tests for invalid paths
  // TODO: Add tests for sort/reverse patches
});

// --- produceAtom Tests ---
describe('produceAtom', () => {
  // No beforeAll needed with direct imports

  it('should update atom state and return patches', () => {
    const myAtom = atom({ value: 10 });
    const [patches, inversePatches] = produceAtom(
      myAtom,
      (draft: { value: number }) => {
        draft.value = 20;
      },
      { patches: true, inversePatches: true },
    );

    expect(get(myAtom)).toEqual({ value: 20 }); // Use imported get
    expect(patches).toEqual([{ op: 'replace', path: ['value'], value: 20 }]);
    expect(inversePatches).toEqual([{ op: 'replace', path: ['value'], value: 10 }]);
  });

  it('should not update atom if recipe returns undefined and no mutations occur', () => {
    const initialState = { value: 10 };
    const myAtom = atom(initialState);
    const _originalValue = get(myAtom); // Use imported get
    let setCalled = false;

    // Mock/spy on the global set function for this atom instance
    const originalSet = set; // Store original global set
    const spiedSet = (targetAtom: Atom<any>, newValue: any) => {
      if (targetAtom === myAtom) {
        setCalled = true;
      }
      originalSet(targetAtom, newValue); // Call original set
    };
    // Temporarily override global set (use with caution, better with mocking library)
    (globalThis as any)._temp_set = set;
    (globalThis as any).set = spiedSet;

    const [patches, inversePatches] = produceAtom(
      myAtom,
      (_draft: { value: number }) => {
        // No changes
      },
      { patches: true, inversePatches: true },
    );

    expect(get(myAtom)).toBe(initialState); // Use imported get
    expect(setCalled).toBe(false);
    expect(patches).toEqual([]);
    expect(inversePatches).toEqual([]);

    // Restore original global set
    (globalThis as any).set = (globalThis as any)._temp_set;
    (globalThis as any)._temp_set = undefined;
  });

  it('should update atom if recipe returns a new state', () => {
    const myAtom = atom({ value: 10 });
    const newState = { value: 100 };
    // Define types for clarity
    type AtomState = { value: number };
    type NewStateType = { value: number };

    const [patches, inversePatches] = produceAtom<AtomState>(
      // Specify atom state type
      myAtom,
      (draft: AtomState): NewStateType => {
        // Specify draft type and return type
        draft.value = 50; // Should be ignored
        return newState;
      },
      { patches: true, inversePatches: true },
    );

    expect(get(myAtom)).toBe(newState); // Use imported get
    expect(patches).toEqual([]);
    expect(inversePatches).toEqual([]);
  });
});
