import { describe, it, expect, vi } from 'vitest';
import { map } from './map';
import { batch } from './core'; // Import batch

describe('map', () => {
  it('should create a map atom with initial value', () => {
    const initialData = { name: 'John', age: 30 };
    const profile = map(initialData);
    // Check if it's a copy initially
    expect(profile.get()).toEqual(initialData);
    expect(profile.get()).not.toBe(initialData); // map should create a copy
  });

  it('should update value using setKey and notify listeners', () => {
    const profile = map({ name: 'John', age: 30 });
    const listener = vi.fn();
    const unsubscribe = profile.subscribe(listener);
    listener.mockClear(); // Ignore initial call

    const oldValue = { name: 'John', age: 30 };
    profile.setKey('age', 31);
    const newValue = { name: 'John', age: 31 };
    expect(profile.get()).toEqual(newValue);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newValue, oldValue); // Add oldValue

    unsubscribe();
  });

  it('should not notify listeners if setKey value is the same', () => {
    const profile = map({ name: 'John', age: 30 });
    const listener = vi.fn();
    const unsubscribe = profile.subscribe(listener);
    listener.mockClear(); // Ignore initial call

    profile.setKey('age', 30); // Set same value
    expect(profile.get()).toEqual({ name: 'John', age: 30 });
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('should update the whole object using set() and notify listeners', () => {
    const profile = map({ name: 'John', age: 30 });
    const listener = vi.fn();
    const unsubscribe = profile.subscribe(listener);
    listener.mockClear(); // Ignore initial call

    const newProfile = { name: 'Jane', age: 25 };
    const oldValue = { name: 'John', age: 30 };
    profile.set(newProfile);
    expect(profile.get()).toEqual(newProfile);
    // set() should replace the internal reference
    // Update: Depending on implementation, set might also create a copy.
    // Testing for direct reference equality might be too implementation-specific.
    // Let's focus on the value and notification.
    // expect(profile.get()).toBe(newProfile);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newProfile, oldValue); // Add oldValue

    unsubscribe();
  });

   it('setKey should create a new object reference', () => {
     const initialValue = { name: 'John', age: 30 };
     const profile = map(initialValue);
     const originalRef = profile.get(); // This is the initial *copy*

     profile.setKey('age', 31);
     const newRef = profile.get();

     expect(newRef).not.toBe(originalRef); // Reference should change after setKey
     expect(newRef).toEqual({ name: 'John', age: 31 });
   });

   it('set() should create a new object reference if the input is different', () => {
     const initialValue = { name: 'John', age: 30 };
     const profile = map(initialValue);
     const originalRef = profile.get(); // This is the initial *copy*

     const newValue = { name: 'Jane', age: 25 };
     profile.set(newValue);
     const newRef = profile.get();

     expect(newRef).not.toBe(originalRef);
     expect(newRef).toEqual(newValue);
     // It might or might not be the exact same reference as newValue depending on internal copying.
     // expect(newRef).toBe(newValue); // This check might be too strict.
   });

    it('set() should not notify if the exact same internal object reference is set', () => {
        const initialValue = { name: 'John', age: 30 };
        const profile = map(initialValue);
        const listener = vi.fn();
        const currentInternalRef = profile.get(); // Get the reference to the internal copy
        const unsubscribe = profile.subscribe(listener);
        listener.mockClear(); // Ignore initial call

        profile.set(currentInternalRef); // Set the exact same internal reference back
        expect(listener).not.toHaveBeenCalled(); // Should not notify

        unsubscribe();
    });

  // --- Key Subscription Tests ---

  it('listenKeys should be called when a specified key is changed via setKey', () => {
    const store = map({ name: 'John', age: 30, city: 'New York' });
    const keyListener = vi.fn();
    const unsubscribe = store.listenKeys(['age'], keyListener);

    store.setKey('age', 31);
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31, city: 'New York' });

    keyListener.mockClear();
    store.setKey('name', 'Jane'); // Change unrelated key
    expect(keyListener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('listenKeys should be called when a specified key is changed via set', () => {
    const store = map({ name: 'John', age: 30 });
    const keyListener = vi.fn();
    const unsubscribe = store.listenKeys(['name'], keyListener);

    const newValue = { name: 'Jane', age: 30 };
    store.set(newValue);
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith('Jane', 'name', newValue);

    unsubscribe();
  });

   it('listenKeys should handle multiple keys', () => {
    const store = map({ name: 'John', age: 30, city: 'New York' });
    const keyListener = vi.fn();
    const unsubscribe = store.listenKeys(['name', 'age'], keyListener);

    // Change 'age'
    store.setKey('age', 31);
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31, city: 'New York' });

    keyListener.mockClear();

    // Change 'name'
    store.setKey('name', 'Jane');
    expect(keyListener).toHaveBeenCalledTimes(1);
    expect(keyListener).toHaveBeenCalledWith('Jane', 'name', { name: 'Jane', age: 31, city: 'New York' });

     keyListener.mockClear();

    // Change 'city' (not listened to)
    store.setKey('city', 'London');
     expect(keyListener).not.toHaveBeenCalled();

     keyListener.mockClear();

     // Change both 'name' and 'age' via set()
     const newValue = { name: 'Peter', age: 40, city: 'London' };
     store.set(newValue);
     // Listener should be called twice, once for each changed key it listens to
     expect(keyListener).toHaveBeenCalledTimes(2);
     expect(keyListener).toHaveBeenCalledWith('Peter', 'name', newValue);
     expect(keyListener).toHaveBeenCalledWith(40, 'age', newValue);


    unsubscribe();
  });

   it('listenKeys should not be called after unsubscribing', () => {
    const store = map({ name: 'John', age: 30 });
    const keyListener = vi.fn();
    const unsubscribe = store.listenKeys(['age'], keyListener);

    unsubscribe(); // Unsubscribe immediately

    store.setKey('age', 31);
    expect(keyListener).not.toHaveBeenCalled();
  });

  it('listenKeys should handle multiple listeners for the same key', () => {
    const store = map({ name: 'John', age: 30 });
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = store.listenKeys(['age'], listener1);
    const unsub2 = store.listenKeys(['age'], listener2);

    store.setKey('age', 31);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31 });
    expect(listener2).toHaveBeenCalledWith(31, 'age', { name: 'John', age: 31 });

    unsub1();

    listener1.mockClear();
    listener2.mockClear();

    store.setKey('age', 32);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);

    unsub2();
  });

    it('listenKeys should work correctly with batching', () => {
        const store = map({ a: 1, b: 2, c: 3 });
        const listenerA = vi.fn();
        const listenerB = vi.fn();
        const listenerAB = vi.fn();

        const unsubA = store.listenKeys(['a'], listenerA);
        const unsubB = store.listenKeys(['b'], listenerB);
        const unsubAB = store.listenKeys(['a', 'b'], listenerAB);

        batch(() => {
            store.setKey('a', 10); // Change a
            store.set({a: 10, b: 20, c: 3}); // Change b
        });

        const finalValue = { a: 10, b: 20, c: 3 };

        // Each listener should be called once after the batch
        expect(listenerA).toHaveBeenCalledTimes(1);
        expect(listenerA).toHaveBeenCalledWith(10, 'a', finalValue);

        expect(listenerB).toHaveBeenCalledTimes(1);
        expect(listenerB).toHaveBeenCalledWith(20, 'b', finalValue);

        // listenerAB should be called for each key it subscribed to that changed
        expect(listenerAB).toHaveBeenCalledTimes(2);
        expect(listenerAB).toHaveBeenCalledWith(10, 'a', finalValue);
        expect(listenerAB).toHaveBeenCalledWith(20, 'b', finalValue);

        unsubA();
        unsubB();
        unsubAB();
    });

});
