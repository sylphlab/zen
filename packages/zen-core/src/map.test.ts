import { describe, it, expect, vi } from 'vitest';
import { map, get, setKey, set, subscribe } from './map'; // Import updated functional API (listenKeys removed)
import { batch } from './batch'; // Import batch from batch.ts

describe('map (functional)', () => {
  it('should create a map atom with initial value', () => {
    const initialData = { name: 'John', age: 30 };
    const profile = map(initialData); // Use map
    // Check if it's a copy initially
    expect(get(profile)).toEqual(initialData); // Use get
    expect(get(profile)).not.toBe(initialData); // map should create a copy
  });

  it('should update value using setKey and notify listeners', () => {
    const profile = map({ name: 'John', age: 30 }); // Use map
    const listener = vi.fn();
    const unsubscribe = subscribe(profile, listener); // Use subscribe
    const oldValue = get(profile); // Use get
    listener.mockClear(); // Ignore initial call

    setKey(profile, 'age', 31); // Use setKey
    const newValue = { name: 'John', age: 31 };
    expect(get(profile)).toEqual(newValue); // Use get
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newValue, oldValue); // Check with correct oldValue

    unsubscribe();
  });

  it('should not notify listeners if setKey value is the same', () => {
    const profile = map({ name: 'John', age: 30 }); // Use map
    const listener = vi.fn();
    const unsubscribe = subscribe(profile, listener); // Use subscribe
    listener.mockClear(); // Ignore initial call

    setKey(profile, 'age', 30); // Use setKey
    expect(get(profile)).toEqual({ name: 'John', age: 30 }); // Use get
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('should update the whole object using set() and notify listeners', () => {
    const profile = map({ name: 'John', age: 30 }); // Use map
    const listener = vi.fn();
    const unsubscribe = subscribe(profile, listener); // Use subscribe
    const oldValue = get(profile); // Use get
    listener.mockClear(); // Ignore initial call

    const newProfile = { name: 'Jane', age: 25 };
    set(profile, newProfile); // Use set
    expect(get(profile)).toEqual(newProfile); // Use get
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newProfile, oldValue); // Check with correct oldValue

    unsubscribe();
  });

   it('setKey should create a new object reference', () => {
     const initialValue = { name: 'John', age: 30 };
     const profile = map(initialValue); // Use map
     const originalRef = get(profile); // Use get
     setKey(profile, 'age', 31); // Use setKey
     const newRef = get(profile); // Use get

     expect(newRef).not.toBe(originalRef); // Reference should change after setKey
     expect(newRef).toEqual({ name: 'John', age: 31 });
   });

   it('set() should create a new object reference if the input is different', () => {
     const initialValue = { name: 'John', age: 30 };
     const profile = map(initialValue); // Use map
     const originalRef = get(profile); // Use get

     const newValue = { name: 'Jane', age: 25 };
     set(profile, newValue); // Use set
     const newRef = get(profile); // Use get

     expect(newRef).not.toBe(originalRef);
     expect(newRef).toEqual(newValue);
   });

    it('set() should not notify if the exact same internal object reference is set', () => {
        const initialValue = { name: 'John', age: 30 };
        const profile = map(initialValue); // Use map
        const listener = vi.fn();
        const currentInternalRef = get(profile); // Use get
        const unsubscribe = subscribe(profile, listener); // Use subscribe
        listener.mockClear(); // Ignore initial call

        set(profile, currentInternalRef); // Use set
        expect(listener).not.toHaveBeenCalled(); // Should not notify

        unsubscribe();
    });

  // --- Key Subscription Tests Removed ---
  // All tests using listenKeys have been removed.

    // Batching tests for map need to be re-evaluated with functional API
    /*
    it('listenKeys should work correctly with batching', () => { ... }); // Use listenKeys
    */

});
