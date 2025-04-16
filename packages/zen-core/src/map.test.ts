import { describe, it, expect, vi } from 'vitest';
import { map, get, setKey, set, subscribe, listenKeys } from './map'; // Import updated functional API
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

  // --- Key Subscription Tests ---

  it('listenKeys should be called when a specified key is changed via setKey', () => {
    const store = map({ name: 'John', age: 30, city: 'New York' }); // Use map
    const keyListener = vi.fn();
    const unsubscribe = listenKeys(store, ['age'], keyListener); // Use listenKeys

    setKey(store, 'age', 31); // Use setKey
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31, city: 'New York' });

    keyListener.mockClear();
    setKey(store, 'name', 'Jane'); // Use setKey
    expect(keyListener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('listenKeys should be called when a specified key is changed via set', () => {
    const store = map({ name: 'John', age: 30 }); // Use map
    const keyListener = vi.fn();
    const unsubscribe = listenKeys(store, ['name'], keyListener); // Use listenKeys

    const newValue = { name: 'Jane', age: 30 };
    set(store, newValue); // Use set
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith('Jane', 'name', newValue);

    unsubscribe();
  });

   it('listenKeys should handle multiple keys', () => {
    const store = map({ name: 'John', age: 30, city: 'New York' }); // Use map
    const keyListener = vi.fn();
    const unsubscribe = listenKeys(store, ['name', 'age'], keyListener); // Use listenKeys

    // Change 'age'
    setKey(store, 'age', 31); // Use setKey
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31, city: 'New York' });

    keyListener.mockClear();

    // Change 'name'
    setKey(store, 'name', 'Jane'); // Use setKey
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith('Jane', 'name', { name: 'Jane', age: 31, city: 'New York' });

     keyListener.mockClear();

    // Change 'city' (not listened to)
    setKey(store, 'city', 'London'); // Use setKey
     expect(keyListener).not.toHaveBeenCalled();

     keyListener.mockClear();

     // Change both 'name' and 'age' via set()
     const newValue = { name: 'Peter', age: 40, city: 'London' };
     set(store, newValue); // Use set
     // Listener should be called twice, once for each changed key it listens to
     expect(keyListener).toHaveBeenCalledTimes(2);
     expect(keyListener).toHaveBeenCalledWith('Peter', 'name', newValue);
     expect(keyListener).toHaveBeenCalledWith(40, 'age', newValue);


    unsubscribe();
  });

   it('listenKeys should not be called after unsubscribing', () => {
    const store = map({ name: 'John', age: 30 }); // Use map
    const keyListener = vi.fn();
    const unsubscribe = listenKeys(store, ['age'], keyListener); // Use listenKeys

    unsubscribe(); // Unsubscribe immediately

    setKey(store, 'age', 31); // Use setKey
    expect(keyListener).not.toHaveBeenCalled();
  });

  it('listenKeys should handle multiple listeners for the same key', () => {
    const store = map({ name: 'John', age: 30 }); // Use map
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = listenKeys(store, ['age'], listener1); // Use listenKeys
    const unsub2 = listenKeys(store, ['age'], listener2); // Use listenKeys

    setKey(store, 'age', 31); // Use setKey
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31 });
    expect(listener2).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31 });

    unsub1();

    listener1.mockClear();
    listener2.mockClear();

    setKey(store, 'age', 32); // Use setKey
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);

    unsub2();
  });

    // Batching tests for map need to be re-evaluated with functional API
    /*
    it('listenKeys should work correctly with batching', () => { ... }); // Use listenKeys
    */

});
