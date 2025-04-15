import { describe, it, expect, vi } from 'vitest';
import { atom } from './atom'; // Assuming atom is directly exported from atom.ts

describe('atom', () => {
  it('should initialize with the correct value', () => {
    const initialValue = 0;
    const count = atom(initialValue);
    expect(count.get()).toBe(initialValue);
    // expect(count.value).toBe(initialValue); // Avoid testing internal implementation details if possible
  });

  it('should update the value with set()', () => {
    const count = atom(0);
    const newValue = 5;
    count.set(newValue);
    expect(count.get()).toBe(newValue);
    // expect(count.value).toBe(newValue);
  });

  it('should not notify listeners if the value has not changed', () => {
    const count = atom(0);
    const listener = vi.fn();

    // Subscribe *after* initial value to only catch updates
    const unsubscribe = count.subscribe(() => {}); // Dummy initial subscribe
    unsubscribe(); // Unsubscribe immediately

    const unsubscribeUpdate = count.subscribe(listener);
    listener.mockClear(); // Clear mock *after* subscription triggers initial call

    count.set(0); // Set same value
    expect(listener).not.toHaveBeenCalled();

    unsubscribeUpdate();
  });

  it('should notify listeners immediately upon subscription with the current value', () => {
    const initialValue = 10;
    const count = atom(initialValue);
    const listener = vi.fn();

    const unsubscribe = count.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(initialValue, undefined); // Add undefined for oldValue

    unsubscribe();
  });

  it('should notify listeners when the value changes', () => {
    const count = atom(0);
    const listener = vi.fn();

    // Subscribe and ignore the initial call
    const unsubscribe = count.subscribe(() => {});
    unsubscribe();
    listener.mockClear(); // Clear mock after dummy initial call

    const unsubscribeUpdate = count.subscribe(listener);
    listener.mockClear(); // Clear mock *after* subscription triggers initial call

    count.set(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0); // Add oldValue 0

    count.set(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(2, 1); // Add oldValue 1 and use assertLastCalledWith

    unsubscribeUpdate();
  });

  it('should allow multiple listeners', () => {
    const count = atom(0);
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = count.subscribe(listener1);
    const unsub2 = count.subscribe(listener2);

    // Check initial calls
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(0, undefined); // Add undefined oldValue
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(0, undefined); // Add undefined oldValue

    listener1.mockClear();
    listener2.mockClear();

    count.set(5);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(5, 0); // Add oldValue 0
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(5, 0); // Add oldValue 0

    unsub1();
    unsub2();
  });

  it('should stop notifying listeners after unsubscribing', () => {
    const count = atom(0);
    const listener = vi.fn();

    const unsubscribe = count.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1); // Initial call

    listener.mockClear();

    count.set(1);
    expect(listener).toHaveBeenCalledTimes(1); // Update call

    unsubscribe();

    count.set(2);
    expect(listener).toHaveBeenCalledTimes(1); // No more calls after unsubscribe

  });

  it('should handle different data types', () => {
    // String
    const text = atom("hello");
    expect(text.get()).toBe("hello");
    text.set("world");
    expect(text.get()).toBe("world");

    // Boolean
    const flag = atom(true);
    expect(flag.get()).toBe(true);
    flag.set(false);
    expect(flag.get()).toBe(false);

    // Object
    const obj = atom({ a: 1 });
    const listenerObj = vi.fn();
    const unsubObj = obj.subscribe(listenerObj);
    expect(obj.get()).toEqual({ a: 1 });
    const initialObjValue = { a: 1 }; // Store initial for oldValue check
    const newObjValue = { a: 2 };
    obj.set(newObjValue);
    expect(obj.get()).toEqual(newObjValue);
    expect(listenerObj).toHaveBeenCalledTimes(2); // Initial + update
    expect(listenerObj).toHaveBeenLastCalledWith(newObjValue, initialObjValue); // Check last call with oldValue
    unsubObj();

    // Array
    const arr = atom([1, 2]);
    const listenerArr = vi.fn();
    const unsubArr = arr.subscribe(listenerArr);
    expect(arr.get()).toEqual([1, 2]);
    const initialArrValue = [1, 2]; // Store initial for oldValue check
    const newArr = [3, 4, 5];
    arr.set(newArr);
    expect(arr.get()).toEqual(newArr);
    expect(listenerArr).toHaveBeenCalledTimes(2); // Initial + update
    expect(listenerArr).toHaveBeenLastCalledWith(newArr, initialArrValue); // Check last call with oldValue
    unsubArr();
  });
});
