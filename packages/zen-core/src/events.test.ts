import { test, expect, vi, describe, beforeEach } from 'vitest';
import { atom as createAtom, get as getAtomValue, set as setAtomValue, subscribe as subscribeToAtom } from './atom'; // Import updated functional API, alias atom as createAtom
import { computed as createComputed } from './computed'; // Import computed, alias as createComputed
import { map as createMap, subscribe as subscribeToMap, setKey as setMapKey, set as setMapValue } from './map'; // Import updated functional map API, alias map as createMap
import { deepMap as createDeepMap, subscribe as subscribeToDeepMap, setPath as setDeepMapPath, set as setDeepMapValue } from './deepMap'; // Import updated functional deepMap API, alias deepMap as createDeepMap
import { onStart, onStop, onSet, onNotify, onMount } from './events'; // Import functional events
import { batch } from './batch';
import type { Atom } from './atom'; // Import from specific files
import type { ReadonlyAtom } from './computed'; // Import from specific files
import type { AnyAtom } from './types'; // Import AnyAtom from types

describe('events (functional)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- onStart ---
  describe('onStart', () => {
    test('should call listener when first subscriber is added (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const startListener = vi.fn()
      onStart($a, startListener);

      expect(startListener).not.toHaveBeenCalled();
      const unsub = subscribeToAtom($a, () => {});
      expect(startListener).toHaveBeenCalledTimes(1);
      const unsub2 = subscribeToAtom($a, () => {});
      expect(startListener).toHaveBeenCalledTimes(1); // Only called on first
      unsub();
      unsub2();
    })

    test('should call listener when first subscriber is added (computed)', () => {
      const $a = createAtom(0) // Use createAtom
      const $c = createComputed([$a], (a) => a + 1) // Use createComputed
      const startListener = vi.fn()
      onStart($c, startListener);

      expect(startListener).not.toHaveBeenCalled();
      const unsub = subscribeToAtom($c, () => {});
      expect(startListener).toHaveBeenCalledTimes(1);
      const unsub2 = subscribeToAtom($c, () => {});
      expect(startListener).toHaveBeenCalledTimes(1);
      unsub();
      unsub2();
    })

     test('should call listener when first subscriber is added (map)', () => {
      const $m = createMap({ a: 1 }) // Use createMap
      const startListener = vi.fn()
      // Map/DeepMap tests should pass now
      onStart($m, startListener);

      expect(startListener).not.toHaveBeenCalled();
      // Use functional API
      const unsub = subscribeToMap($m, () => {});
      expect(startListener).toHaveBeenCalledTimes(1);
      const unsub2 = subscribeToMap($m, () => {});
      expect(startListener).toHaveBeenCalledTimes(1); // Only called on first
      unsub();
      unsub2();
    })

     test('should call listener when first subscriber is added (deepMap)', () => {
      const $dm = createDeepMap({ user: { name: 'A' } }) // Use createDeepMap
      const startListener = vi.fn()
      onStart($dm as any, startListener); // Cast to any for test compatibility

      expect(startListener).not.toHaveBeenCalled();
      // Use functional API
      const unsub = subscribeToDeepMap($dm, () => {});
      expect(startListener).toHaveBeenCalledTimes(1);
      const unsub2 = subscribeToDeepMap($dm, () => {});
      expect(startListener).toHaveBeenCalledTimes(1); // Only called on first
      unsub();
      unsub2();
    })

    test('should return an unsubscribe function (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const startListener = vi.fn()
      const unsubEvent = onStart($a, startListener);

      const unsubSub = subscribeToAtom($a, () => {});
      expect(startListener).toHaveBeenCalledTimes(1);

      unsubEvent(); // Unsubscribe the event listener

      unsubSub(); // Last data subscriber leaves
      const unsubSub2 = subscribeToAtom($a, () => {}); // New data subscriber joins
      expect(startListener).toHaveBeenCalledTimes(1); // Event listener should not fire again
      unsubSub2();
    })
  })

  // --- onStop ---
  describe('onStop', () => {
    test('should call listener when last subscriber leaves (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const stopListener = vi.fn()
      onStop($a, stopListener);

      const unsub = subscribeToAtom($a, () => {});
      const unsub2 = subscribeToAtom($a, () => {});
      expect(stopListener).not.toHaveBeenCalled();
      unsub();
      expect(stopListener).not.toHaveBeenCalled();
      unsub2(); // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1);
    })

     test('should call listener when last subscriber leaves (computed)', () => {
      const $a = createAtom(0) // Use createAtom
      const $c = createComputed([$a], (a) => a + 1) // Use createComputed
      const stopListener = vi.fn()
      onStop($c, stopListener);

      const unsub = subscribeToAtom($c, () => {});
      const unsub2 = subscribeToAtom($c, () => {});
      expect(stopListener).not.toHaveBeenCalled();
      unsub();
      expect(stopListener).not.toHaveBeenCalled();
      unsub2(); // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1);
    })

     test('should call listener when last subscriber leaves (map)', () => {
      const $m = createMap({ a: 1 }) // Use createMap
      const stopListener = vi.fn()
      // Map/DeepMap tests should pass now
      onStop($m, stopListener);

      // Use functional API
      const unsub = subscribeToMap($m, () => {});
      const unsub2 = subscribeToMap($m, () => {});
      expect(stopListener).not.toHaveBeenCalled();
      unsub();
      expect(stopListener).not.toHaveBeenCalled();
      unsub2(); // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1);
    })

     test('should call listener when last subscriber leaves (deepMap)', () => {
      const $dm = createDeepMap({ user: { name: 'A' } }) // Use createDeepMap
      const stopListener = vi.fn()
      onStop($dm as any, stopListener); // Cast to any for test compatibility

      // Use functional API
      const unsub = subscribeToDeepMap($dm, () => {});
      const unsub2 = subscribeToDeepMap($dm, () => {});
      expect(stopListener).not.toHaveBeenCalled();
      unsub();
      expect(stopListener).not.toHaveBeenCalled();
      unsub2(); // Last one leaves
      expect(stopListener).toHaveBeenCalledTimes(1);
    })

    test('should return an unsubscribe function (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const stopListener = vi.fn()
      const unsubEvent = onStop($a, stopListener);

      const unsubSub = subscribeToAtom($a, () => {});
      unsubSub(); // Last subscriber leaves
      expect(stopListener).toHaveBeenCalledTimes(1);

      unsubEvent(); // Unsubscribe the event listener

      const unsubSub2 = subscribeToAtom($a, () => {});
      unsubSub2(); // Last subscriber leaves again
      expect(stopListener).toHaveBeenCalledTimes(1); // Event listener should not fire again
    })
  })

  // --- onSet ---
  describe('onSet', () => {
    test('should call listener immediately when set is called (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const setListener = vi.fn()
      onSet($a, setListener);

      setAtomValue($a, 1);
      expect(setListener).toHaveBeenCalledTimes(1);
      expect(setListener).toHaveBeenCalledWith(1); // Only receives new value

      setAtomValue($a, 2);
      expect(setListener).toHaveBeenCalledTimes(2);
      expect(setListener).toHaveBeenCalledWith(2);
    })

    test('should NOT call listener within batch (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const setListener = vi.fn()
      onSet($a, setListener);

      batch(() => {
        setAtomValue($a, 1);
        setAtomValue($a, 2);
        // setListener should NOT be called during the batch (due to core.ts check)
        expect(setListener).not.toHaveBeenCalled();
      });
      // setListener should still NOT be called after the batch
      expect(setListener).not.toHaveBeenCalled();
    })

    // Removed test 'should not be called for computed (throws error)'
    // as the runtime check was removed from onSet in favor of TypeScript static check.

    // Removed invalid onSet tests for Map/DeepMap as onSet only applies to basic Atom

    test('should return an unsubscribe function (atom)', () => {
      const $a = createAtom(0) // Use createAtom
      const setListener = vi.fn()
      const unsubEvent = onSet($a, setListener);

      setAtomValue($a, 1);
      expect(setListener).toHaveBeenCalledTimes(1);

      unsubEvent(); // Unsubscribe the event listener

      setAtomValue($a, 2);
      expect(setListener).toHaveBeenCalledTimes(1); // Event listener should not fire again
    })
  })

  // Removed onDestroy tests as the function does not exist
})
