import { test, expect, vi, describe, beforeEach } from 'vitest'
import { atom } from './atom'
import { batch, isInBatch } from './batch'
import { onSet } from './events'
import type { Atom } from './core' // Import Atom type if needed

// No longer mocking core.set, rely on listener calls and final state

describe('batch', () => {
  beforeEach(() => {
    // Clear mocks if any others are added later
    vi.clearAllMocks()
  })

  test('should group multiple set calls into one', () => {
    let $a = atom(0)
    let $b = atom('initial')
    let listenerA = vi.fn()
    let listenerB = vi.fn()

    const unsubA = $a.subscribe(listenerA)
    const unsubB = $b.subscribe(listenerB)

    batch(() => {
      $a.set(1)
      $a.set(2)
      $b.set('updated')
    })

    // Check final atom values
    expect($a.get()).toBe(2)
    expect($b.get()).toBe('updated')

    // Listeners are called initially by subscribe, then once after the batch
    expect(listenerA).toHaveBeenCalledTimes(2) // Initial + Batch
    expect(listenerA).toHaveBeenLastCalledWith(2, 0) // Check the batch call
    expect(listenerB).toHaveBeenCalledTimes(2) // Initial + Batch
    expect(listenerB).toHaveBeenLastCalledWith('updated', 'initial') // Check the batch call

    unsubA()
    unsubB()
  })

  test('should handle nested batches correctly', () => {
    let $a = atom(0)
    let $b = atom(10)
    let listenerA = vi.fn()
    let listenerB = vi.fn()

    const unsubA = $a.subscribe(listenerA)
    const unsubB = $b.subscribe(listenerB)

    batch(() => {
      $a.set(1)
      batch(() => {
        $a.set(2)
        $b.set(11)
      })
      $a.set(3)
    })

    // Check final atom values
    expect($a.get()).toBe(3)
    expect($b.get()).toBe(11)

    // Listeners are called initially by subscribe, then once after the outer batch completes
    expect(listenerA).toHaveBeenCalledTimes(2) // Initial + Batch
    expect(listenerA).toHaveBeenLastCalledWith(3, 0) // Check the batch call
    expect(listenerB).toHaveBeenCalledTimes(2) // Initial + Batch
    expect(listenerB).toHaveBeenLastCalledWith(11, 10) // Check the batch call

    unsubA()
    unsubB()
  })

  test('should return the value from the callback', () => {
    let result = batch(() => {
      return 42
    })
    expect(result).toBe(42)
  })

  test('should handle errors within the batch', () => {
    let $a = atom(0)
    let listenerA = vi.fn()
    const unsubA = $a.subscribe(listenerA)

    expect(() => {
      batch(() => {
        $a.set(1)
        throw new Error('Batch error')
      })
    }).toThrow('Batch error')

    // Listener should have been called once initially by subscribe, but not again due to the error
    expect(listenerA).toHaveBeenCalledTimes(1)
    expect(listenerA).toHaveBeenCalledWith(0, undefined) // Verify initial subscribe call
    // We accept that the internal value might change before the error,
    // so we don't check $a.get() here. The key is no *additional* notification occurred.

    unsubA()
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
    let $a = atom(0)
    let onSetListener = vi.fn()
    let finalListener = vi.fn()

    // Attach onSet listener
    onSet($a, onSetListener)
    const unsubFinal = $a.subscribe(finalListener) // finalListener is the regular subscriber

    // Listener called initially
    expect(finalListener).toHaveBeenCalledTimes(1);
    expect(finalListener).toHaveBeenCalledWith(0, undefined);

    batch(() => {
      $a.set(1)
      $a.set(2)
      // onSetListener should NOT be called during the batch
      expect(onSetListener).not.toHaveBeenCalled()
    })

    // onSetListener should still NOT be called after the batch
    expect(onSetListener).not.toHaveBeenCalled()

    // Final listener (regular subscriber) is called initially, then once after batch.
    expect(finalListener).toHaveBeenCalledTimes(2) // Initial call + batched call
    // The final listener receives the final value (2) and the original value before the batch (0)
    expect(finalListener).toHaveBeenLastCalledWith(2, 0) // Check the last (batched) call

    // Atom value updated after batch
    expect($a.get()).toBe(2)

    unsubFinal()
    // We don't need to unsubscribe onSet listeners currently
  })

  test('batching should only apply to atoms with patched set', () => {
    // Create an atom
    let $plain = atom(100)
    let plainListener = vi.fn()
    const unsubPlain = $plain.subscribe(plainListener)

    // Simulate an object that looks like an atom but doesn't have the patched set
    // Note: This test might be less relevant now batching uses prototype patching
    // but we keep it to ensure direct calls aren't somehow intercepted.
    let fakeAtom = {
      _value: 200,
      listeners: new Set(),
      set: vi.fn(function(this: any, val: any) { this._value = val; }), // Basic set mock
      get: function(this: any) { return this._value; },
      subscribe: vi.fn(),
      notify: vi.fn()
    }

    batch(() => {
      $plain.set(101)
      fakeAtom.set(201) // This set should not be batched by our logic
      $plain.set(102)
    })

    // Check final value of real atom
    expect($plain.get()).toBe(102)

    // The fake atom's set should have been called directly
    expect(fakeAtom.set).toHaveBeenCalledTimes(1)
    expect(fakeAtom.set).toHaveBeenCalledWith(201)
    expect(fakeAtom.get()).toBe(201) // Verify fake atom value changed

    // Real atom listener is called initially, then once after batch.
    expect(plainListener).toHaveBeenCalledTimes(2) // Initial + Batch
    expect(plainListener).toHaveBeenLastCalledWith(102, 100) // Check the batch call

    unsubPlain()
  })
})