import { describe, expect, it, vi } from 'vitest';
import { get as getAtomValue, set as setAtomValue, subscribe as subscribeToAtom, zen } from './zen'; // Import updated functional API

describe('atom (functional)', () => {
  it('should initialize with the correct value', () => {
    const initialValue = 0;
    const count = zen(initialValue); // Use zen
    expect(getAtomValue(count)).toBe(initialValue); // Use get
  });

  it('should update the value with setAtomValue()', () => {
    const count = zen(0); // Use zen
    const newValue = 5;
    setAtomValue(count, newValue); // Use set
    expect(getAtomValue(count)).toBe(newValue); // Use get
  });

  it('should not notify listeners if the value has not changed', () => {
    const count = zen(0); // Use zen
    const listener = vi.fn();

    // Subscribe *after* initial value to only catch updates
    const unsubscribe = subscribeToAtom(count, () => {}); // Use subscribe
    unsubscribe(); // Unsubscribe immediately

    const unsubscribeUpdate = subscribeToAtom(count, listener); // Use subscribe
    listener.mockClear(); // Clear mock *after* subscription triggers initial call

    setAtomValue(count, 0); // Use set
    expect(listener).not.toHaveBeenCalled();

    unsubscribeUpdate();
  });

  it('should notify listeners immediately upon subscription with the current value', () => {
    const initialValue = 10;
    const count = zen(initialValue); // Use zen
    const listener = vi.fn();

    const unsubscribe = subscribeToAtom(count, listener); // Use subscribe

    expect(listener).toHaveBeenCalledTimes(1);
    // Functional subscribeToAtom passes undefined as oldValue initially
    expect(listener).toHaveBeenCalledWith(initialValue, undefined);

    unsubscribe();
  });

  it('should notify listeners when the value changes', () => {
    const count = zen(0); // Use zen
    const listener = vi.fn();

    // Subscribe and ignore the initial call
    const unsubscribe = subscribeToAtom(count, () => {}); // Use subscribe
    unsubscribe();
    listener.mockClear(); // Clear mock after dummy initial call

    const unsubscribeUpdate = subscribeToAtom(count, listener); // Use subscribe
    listener.mockClear(); // Clear mock *after* subscription triggers initial call

    setAtomValue(count, 1); // Use set
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0); // Add oldValue 0

    setAtomValue(count, 2); // Use set
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(2, 1); // Add oldValue 1 and use assertLastCalledWith

    unsubscribeUpdate();
  });

  it('should allow multiple listeners', () => {
    const count = zen(0); // Use zen
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = subscribeToAtom(count, listener1); // Use subscribe
    const unsub2 = subscribeToAtom(count, listener2); // Use subscribe

    // Check initial calls
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(0, undefined); // Functional subscribeToAtom passes undefined initially
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(0, undefined); // Functional subscribeToAtom passes undefined initially

    listener1.mockClear();
    listener2.mockClear();

    setAtomValue(count, 5); // Use set
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(5, 0); // Add oldValue 0
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(5, 0); // Add oldValue 0

    unsub1();
    unsub2();
  });

  it('should stop notifying listeners after unsubscribing', () => {
    const count = zen(0); // Use zen
    const listener = vi.fn();

    const unsubscribe = subscribeToAtom(count, listener); // Use subscribe
    expect(listener).toHaveBeenCalledTimes(1); // Initial call

    listener.mockClear();

    setAtomValue(count, 1); // Use set
    expect(listener).toHaveBeenCalledTimes(1); // Update call

    unsubscribe();

    setAtomValue(count, 2); // Use set
    expect(listener).toHaveBeenCalledTimes(1); // No more calls after unsubscribe
  });

  it('should handle different data types', () => {
    // String
    const text = zen('hello'); // Use zen
    expect(getAtomValue(text)).toBe('hello'); // Use get
    setAtomValue(text, 'world'); // Use set
    expect(getAtomValue(text)).toBe('world'); // Use get

    // Boolean
    const flag = zen(true); // Use zen
    expect(getAtomValue(flag)).toBe(true); // Use get
    setAtomValue(flag, false); // Use set
    expect(getAtomValue(flag)).toBe(false); // Use get

    // Object
    const obj = zen({ a: 1 }); // Use zen
    const listenerObj = vi.fn();
    const unsubObj = subscribeToAtom(obj, listenerObj); // Use subscribe
    expect(getAtomValue(obj)).toEqual({ a: 1 }); // Use get
    const initialObjValue = { a: 1 }; // Store initial for oldValue check
    const newObjValue = { a: 2 };
    setAtomValue(obj, newObjValue); // Use set
    expect(getAtomValue(obj)).toEqual(newObjValue); // Use get
    expect(listenerObj).toHaveBeenCalledTimes(2); // Initial + update
    expect(listenerObj).toHaveBeenLastCalledWith(newObjValue, initialObjValue); // Check last call with oldValue
    unsubObj();

    // Array
    const arr = zen([1, 2]); // Use zen
    const listenerArr = vi.fn();
    const unsubArr = subscribeToAtom(arr, listenerArr); // Use subscribe
    expect(getAtomValue(arr)).toEqual([1, 2]); // Use get
    const initialArrValue = [1, 2]; // Store initial for oldValue check
    const newArr = [3, 4, 5];
    setAtomValue(arr, newArr); // Use set
    expect(getAtomValue(arr)).toEqual(newArr); // Use get
    expect(listenerArr).toHaveBeenCalledTimes(2); // Initial + update
    expect(listenerArr).toHaveBeenLastCalledWith(newArr, initialArrValue); // Check last call with oldValue
    unsubArr();
  });
});
