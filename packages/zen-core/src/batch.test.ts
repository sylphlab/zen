import { test, expect, vi, describe, beforeEach } from 'vitest';
import { atom, get as getAtomValue, set as setAtomValue, subscribe as subscribe } from './atom'; // Import updated functional API
import { batch, isInBatch } from './batch';
import { onSet } from './events';
import type { Atom } from './core'; // Import Atom type if needed

// No longer mocking core.set, rely on listener calls and final state

describe('batch (functional)', () => {
  beforeEach(() => {
    // Clear mocks if any others are added later
    vi.clearAllMocks()
  })

  test('should group multiple set calls into one', () => {
    const $a = atom(0) // Use atom
    const $b = atom('initial') // Use atom
    const listenerA = vi.fn()
    const listenerB = vi.fn();

    const unsubA = subscribe($a, listenerA);
    const unsubB = subscribe($b, listenerB);

    // Store initial values for oldValue check
    const initialA = getAtomValue($a);
    const initialB = getAtomValue($b);

    listenerA.mockClear(); // Clear initial calls
    listenerB.mockClear();

    batch(() => {
      setAtomValue($a, 1);
      setAtomValue($a, 2);
      setAtomValue($b, 'updated');
    });

    // Check final atom values
    expect(getAtomValue($a)).toBe(2);
    expect(getAtomValue($b)).toBe('updated');

    // Listeners are called once after the batch
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA).toHaveBeenLastCalledWith(2, initialA); // Check the batch call with correct oldValue
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenLastCalledWith('updated', initialB); // Check the batch call with correct oldValue

    unsubA();
    unsubB();
  })

  test('should handle nested batches correctly', () => {
    const $a = atom(0) // Use atom
    const $b = atom(10) // Use atom
    const listenerA = vi.fn()
    const listenerB = vi.fn();

    const unsubA = subscribe($a, listenerA);
    const unsubB = subscribe($b, listenerB);

    // Store initial values
    const initialA = getAtomValue($a);
    const initialB = getAtomValue($b);

    listenerA.mockClear(); // Clear initial calls
    listenerB.mockClear();

    batch(() => {
      setAtomValue($a, 1);
      batch(() => {
        setAtomValue($a, 2);
        setAtomValue($b, 11);
      });
      setAtomValue($a, 3);
    });

    // Check final atom values
    expect(getAtomValue($a)).toBe(3);
    expect(getAtomValue($b)).toBe(11);

    // Listeners are called once after the outer batch completes
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA).toHaveBeenLastCalledWith(3, initialA); // Check the batch call
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenLastCalledWith(11, initialB); // Check the batch call

    unsubA();
    unsubB();
  })

  test('should return the value from the callback', () => {
    const result = batch(() => {
      return 42
    })
    expect(result).toBe(42)
  })

  test('should handle errors within the batch', () => {
    const $a = atom(0); // Use atom
    const listenerA = vi.fn();
    const unsubA = subscribe($a, listenerA); // Use subscribe

    // Store initial value
    const initialA = getAtomValue($a);
    listenerA.mockClear(); // Clear initial call

    expect(() => {
      batch(() => {
        setAtomValue($a, 1);
        throw new Error('Batch error');
      });
    }).toThrow('Batch error');

    // Listener should NOT have been called again due to the error during batch
    expect(listenerA).not.toHaveBeenCalled();
    // The value might have been updated before the error, but no notification should occur
    // expect(getAtomValue($a)).toBe(1); // Optional check

    unsubA();
  })

  test('isInBatch should return correct status', () => {
    expect(isInBatch()).toBe(false)
    batch(() => {
      expect(isInBatch()).toBe(true)
      batch(() => {
        expect(isInBatch()).toBe(true)
      })
      expect(isInBatch()).toBe(true)
    })
    expect(isInBatch()).toBe(false)
  })

  test('onSet listener should NOT be called within batch', () => {
    const $a = atom(0) // Use atom
    const onSetListener = vi.fn()
    const finalListener = vi.fn()

    // Attach onSet listener
    onSet($a, onSetListener); // onSet still works by attaching to the atom structure
    const unsubFinal = subscribe($a, finalListener); // finalListener is the regular subscriber

    // Store initial value
    const initialA = getAtomValue($a);
    finalListener.mockClear(); // Clear initial call

    batch(() => {
      setAtomValue($a, 1);
      setAtomValue($a, 2);
      // onSetListener should NOT be called during the batch (due to core.ts logic)
      expect(onSetListener).not.toHaveBeenCalled();
    });

    // onSetListener should still NOT be called after the batch
    expect(onSetListener).not.toHaveBeenCalled();

    // Final listener (regular subscriber) is called once after batch.
    expect(finalListener).toHaveBeenCalledTimes(1);
    // The final listener receives the final value (2) and the original value before the batch (0)
    expect(finalListener).toHaveBeenLastCalledWith(2, initialA); // Check the batched call

    // Atom value updated after batch
    expect(getAtomValue($a)).toBe(2);

    unsubFinal();
    // We don't need to unsubscribe onSet listeners currently (no API for it yet)
  })

  test('batching should only apply to atoms with patched set', () => {
    // Create a real atom
    const $plain = atom(100); // Use atom
    const plainListener = vi.fn();
    const unsubPlain = subscribe($plain, plainListener); // Use subscribe

    // Store initial value
    const initialPlain = getAtomValue($plain);
    plainListener.mockClear(); // Clear initial call

    // Simulate a fake atom structure (no methods)
    const fakeAtom = {
      $$id: Symbol('fake'),
      $$type: 99, // Some other type
      _value: 200,
      _listeners: new Set(),
    };
    // Mock a fake set function that operates on this structure
    const fakeSet = vi.fn((atom: any, val: any) => { atom._value = val; });

    batch(() => {
      setAtomValue($plain, 101);
      fakeSet(fakeAtom, 201); // Call the fake set function
      setAtomValue($plain, 102);
    });

    // Check final value of real atom
    expect(getAtomValue($plain)).toBe(102);

    // The fake atom's set function should have been called directly
    expect(fakeSet).toHaveBeenCalledTimes(1);
    expect(fakeSet).toHaveBeenCalledWith(fakeAtom, 201);
    expect(fakeAtom._value).toBe(201); // Verify fake atom value changed

    // Real atom listener is called once after batch.
    expect(plainListener).toHaveBeenCalledTimes(1);
    expect(plainListener).toHaveBeenLastCalledWith(102, initialPlain); // Check the batch call

    unsubPlain();
  })
})