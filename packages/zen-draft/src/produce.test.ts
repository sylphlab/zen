import { describe, it, expect, vi } from 'vitest';
import { produce } from './produce';
import type { Patch } from './types';

// Define interfaces for common test states to help TS
interface SimpleState { a: number; b: { c: number } }
interface NestedState { a: number; b: { c: number; d: { e: number } } }
interface ListState { list: number[] }
interface NestedListState { data: { list: (number | { items: string[] })[] } }
interface MapState { map: Map<string, number> }
interface SetState { set: Set<number> }


describe('produce', () => {
  describe('Core Functionality', () => {
    it('should return the original state if no changes are made', () => {
      const baseState: SimpleState = { a: 1, b: { c: 2 } };
      // Explicitly type R as SimpleState when recipe returns undefined
      const [nextState, patches, inversePatches] = produce<SimpleState, SimpleState>(baseState, (_draft) => {
        // No mutations
        return undefined; // Explicit return
      });
      expect(nextState).toBe(baseState);
      expect(patches).toEqual([]);
      expect(inversePatches).toEqual([]);
    });

    it('should return the value returned by the recipe, ignoring mutations', () => {
      const baseState = { a: 1 };
      const newState = { completely: 'different' };
      // R is inferred as typeof newState
      const [nextState, patches, inversePatches] = produce(
        baseState,
        (draft) => {
          draft.a = 100; // This mutation should be ignored
          return newState;
        },
        { patches: true, inversePatches: true },
      );
      expect(nextState).toBe(newState);
      expect(patches).toEqual([]);
      expect(inversePatches).toEqual([]);
      expect(baseState).toEqual({ a: 1 });
    });

     it('should handle non-draftable base state', () => {
      const baseState = 123;
      // R is inferred as number
      const [nextState, patches, inversePatches] = produce(baseState, (draft) => {
         expect(draft).toBe(123);
         return draft + 1;
      });
      expect(nextState).toBe(124);
      expect(patches).toEqual([]);
      expect(inversePatches).toEqual([]);
    });

     it('should handle non-draftable return from recipe', () => {
      const baseState = { a: 1 };
      // R is inferred as string
      const [nextState] = produce(baseState, (draft) => {
         draft.a = 2;
         return 'finished';
      });
      expect(nextState).toBe('finished');
    });
  });

  describe('Object Mutations', () => {
    it('should handle shallow object mutations', () => {
      const baseState = { a: 1, b: 2 };
      const [nextState] = produce<typeof baseState, typeof baseState>(baseState, (draft) => {
        draft.a = 10;
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState).toEqual({ a: 10, b: 2 });
      expect(baseState).toEqual({ a: 1, b: 2 });
    });

    it('should handle nested object mutations', () => {
      const baseState: NestedState = { a: 1, b: { c: 2, d: { e: 3 } } };
      const [nextState] = produce<NestedState, NestedState>(baseState, (draft) => {
        draft.b.c = 20;
        draft.b.d.e = 30;
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.b).not.toBe(baseState.b);
      expect(nextState.b.d).not.toBe(baseState.b.d);
      expect(nextState).toEqual({ a: 1, b: { c: 20, d: { e: 30 } } });
      expect(baseState).toEqual({ a: 1, b: { c: 2, d: { e: 3 } } });
    });

    it('should handle adding new properties', () => {
      const baseState: { a: number; b?: number } = { a: 1 };
      const [nextState] = produce<typeof baseState, typeof baseState>(baseState, (draft) => {
        draft.b = 2;
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState).toEqual({ a: 1, b: 2 });
      expect(baseState).toEqual({ a: 1 });
    });

    it('should handle deleting properties', () => {
      const baseState = { a: 1, b: 2 };
      const [nextState] = produce<typeof baseState, typeof baseState>(baseState, (draft) => {
        delete (draft as Partial<typeof draft>).b;
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState).toEqual({ a: 1 });
      expect(baseState).toEqual({ a: 1, b: 2 });
    });
  });

  describe('Array Mutations', () => {
     it('should handle push mutation', () => {
      const baseState: ListState = { list: [1, 2, 3] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.push(4);
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [1, 2, 3, 4] });
      expect(baseState).toEqual({ list: [1, 2, 3] });
    });

     it('should handle index assignment mutation', () => {
      const baseState: ListState = { list: [1, 2, 3] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list[0] = 0;
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [0, 2, 3] });
      expect(baseState).toEqual({ list: [1, 2, 3] });
    });

     it('should handle splice mutation (delete)', () => {
      const baseState: ListState = { list: [1, 2, 3, 4] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.splice(1, 2); // Remove 2, 3
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [1, 4] });
      expect(baseState).toEqual({ list: [1, 2, 3, 4] });
    });

     it('should handle splice mutation (add)', () => {
      const baseState: ListState = { list: [1, 4] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.splice(1, 0, 2, 3); // Insert 2, 3 at index 1
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [1, 2, 3, 4] });
      expect(baseState).toEqual({ list: [1, 4] });
    });

     it('should handle pop mutation', () => {
      const baseState: ListState = { list: [1, 2, 3] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.pop();
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [1, 2] });
      expect(baseState).toEqual({ list: [1, 2, 3] });
    });

     it('should handle shift mutation', () => {
      const baseState: ListState = { list: [1, 2, 3] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.shift();
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [2, 3] });
      expect(baseState).toEqual({ list: [1, 2, 3] });
    });

     it('should handle unshift mutation', () => {
      const baseState: ListState = { list: [2, 3] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.unshift(0, 1);
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [0, 1, 2, 3] });
      expect(baseState).toEqual({ list: [2, 3] });
    });

     it('should handle sort mutation', () => {
      const baseState: ListState = { list: [3, 1, 2] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.sort();
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [1, 2, 3] });
      expect(baseState).toEqual({ list: [3, 1, 2] });
    });

     it('should handle reverse mutation', () => {
      const baseState: ListState = { list: [1, 2, 3] };
      const [nextState] = produce<ListState, ListState>(baseState, (draft) => {
        draft.list.reverse();
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.list).not.toBe(baseState.list);
      expect(nextState).toEqual({ list: [3, 2, 1] });
      expect(baseState).toEqual({ list: [1, 2, 3] });
    });

     it('should handle mutations on nested arrays', () => {
      const baseState: NestedListState = { data: { list: [1, 2, { items: ['a', 'b'] }] } };
      const [nextState] = produce<NestedListState, NestedListState>(baseState, (draft) => {
        (draft.data.list[2] as { items: string[] }).items.push('c');
        return undefined;
      });
      expect(nextState).not.toBe(baseState);
      expect(nextState.data).not.toBe(baseState.data);
      expect(nextState.data.list).not.toBe(baseState.data.list);
      expect(nextState.data.list[2]).not.toBe(baseState.data.list[2]);
      expect((nextState.data.list[2] as { items: string[] }).items).not.toBe((baseState.data.list[2] as { items: string[] }).items);
      expect(nextState).toEqual({ data: { list: [1, 2, { items: ['a', 'b', 'c'] }] } });
      expect(baseState).toEqual({ data: { list: [1, 2, { items: ['a', 'b'] }] } });
    });
  });

  describe('Patch Generation', () => {
    it('should generate patches for object mutations', () => {
      const baseState = { a: 1, b: { c: 2 } };
      const [, patches] = produce(
        baseState,
        (draft) => {
          draft.a = 10; // replace
          draft.b.c = 20; // replace
          (draft as any).d = 30; // add
          return undefined;
        },
        { patches: true },
      );
      expect(patches).toEqual([
        { op: 'replace', path: ['a'], value: 10 },
        { op: 'replace', path: ['b', 'c'], value: 20 },
        { op: 'add', path: ['d'], value: 30 },
      ]);
    });

    it('should generate patches for array mutations', () => {
      const baseState: ListState = { list: [1, 2, 3] };
      const [, patches] = produce(
        baseState,
        (draft) => {
          draft.list.push(4); // add index 3
          draft.list[0] = 0; // replace index 0
          draft.list.splice(1, 1); // remove index 1 (original value 2) -> list is now [0, 3, 4]
          return undefined;
        },
        { patches: true },
      );
      expect(patches).toEqual([
        { op: 'add', path: ['list', 3], value: 4 },
        { op: 'replace', path: ['list', 0], value: 0 },
        { op: 'remove', path: ['list', 1] },
      ]);
    });

    it('should generate inverse patches', () => {
      const baseState = { a: 1, b: { c: 2 }, arr: [10] };
      const [, , inversePatches] = produce(
        baseState,
        (draft) => {
          draft.a = 100; // replace
          delete (draft.b as Partial<typeof draft.b>).c; // remove
          (draft as any).d = 200; // add
          draft.arr.push(20); // add to array
          return undefined;
        },
        { inversePatches: true },
      );
      expect(inversePatches).toContainEqual({ op: 'replace', path: ['a'], value: 1 });
      expect(inversePatches).toContainEqual({ op: 'add', path: ['b', 'c'], value: 2 });
      expect(inversePatches).toContainEqual({ op: 'remove', path: ['d'] });
      expect(inversePatches).toContainEqual({ op: 'remove', path: ['arr', 1] });
      expect(inversePatches.length).toBe(4);
    });

     it('should generate correct inverse patch for replace vs add', () => {
      const baseState = { a: 1 };
      const [, , inversePatches] = produce(
        baseState,
        (draft) => {
          draft.a = 2; // replace
          (draft as any).b = 3; // add
          return undefined;
        },
        { inversePatches: true },
      );
       expect(inversePatches).toContainEqual({ op: 'replace', path: ['a'], value: 1 });
       expect(inversePatches).toContainEqual({ op: 'remove', path: ['b'] });
       expect(inversePatches.length).toBe(2);
    });
  });

  describe('Map/Set Mutations', () => {
     it('should handle Map mutations and generate patches', () => {
      const baseState: MapState = { map: new Map<string, number>([['a', 1]]) };
      const [nextState, patches] = produce<MapState, MapState>(
        baseState,
        (draft) => {
          draft.map.set('b', 2); // add
          draft.map.set('a', 10); // replace
          draft.map.delete('c'); // Delete non-existent
          draft.map.delete('a'); // delete
          return undefined;
        },
        { patches: true },
      );
      expect(nextState).not.toBe(baseState);
      expect(nextState.map).toEqual(new Map([['b', 2]]));
      expect(baseState.map).toEqual(new Map([['a', 1]]));
      expect(patches).toEqual([
        { op: 'add', path: ['map', 'b'], value: 2 },
        { op: 'replace', path: ['map', 'a'], value: 10 },
        { op: 'remove', path: ['map', 'a'] },
      ]);
    });

     it('should handle Set mutations and generate patches', () => {
      const baseState: SetState = { set: new Set<number>([1, 2]) };
      const [nextState, patches] = produce<SetState, SetState>(
        baseState,
        (draft) => {
          draft.set.add(3); // add
          draft.set.add(1); // Add existing - no op
          draft.set.delete(2); // delete
          draft.set.delete(4); // delete non-existent - no op
          return undefined;
        },
        { patches: true },
      );
      expect(nextState).not.toBe(baseState);
      expect(nextState.set).toEqual(new Set([1, 3]));
      expect(baseState.set).toEqual(new Set([1, 2]));
      expect(patches).toEqual([
        { op: 'set_add', path: ['set'], value: 3 },
        { op: 'set_delete', path: ['set'], value: 2 },
      ]);
    });

     // TODO: Add tests for Map/Set inverse patches when implemented correctly
     // TODO: Add tests for Map/Set clear() method and patches
  });

  describe('Auto Freeze', () => {
    it('should auto-freeze the result if requested', () => {
      const baseState = { a: 1 };
      const [nextState] = produce(
        baseState,
        (draft) => {
          draft.a = 2;
          return undefined;
        },
        { autoFreeze: true },
      );
      expect(nextState).not.toBe(baseState);
      expect(Object.isFrozen(nextState)).toBe(true);
    });

    it('should not freeze the original state', () => {
      const baseState = { a: 1 };
      produce(
        baseState,
        (draft) => {
          draft.a = 2;
          return undefined;
        },
        { autoFreeze: true },
      );
      expect(Object.isFrozen(baseState)).toBe(false);
    });

     it('should not freeze if no changes were made', () => {
      const baseState = { a: 1 };
      const [nextState] = produce(
        baseState,
        (_draft) => {
           return undefined; // Explicit return
        },
        { autoFreeze: true },
      );
      expect(nextState).toBe(baseState);
      expect(Object.isFrozen(nextState)).toBe(false);
    });

     it('should recursively freeze nested structures', () => {
      const baseState: SimpleState = { a: 1, b: { c: 2 } };
      const [nextState] = produce<SimpleState, SimpleState>(
        baseState,
        (draft) => {
          draft.b.c = 3;
          return undefined;
        },
        { autoFreeze: true },
      );
      expect(Object.isFrozen(nextState)).toBe(true);
      expect(Object.isFrozen(nextState.b)).toBe(true);
    });
  });
});