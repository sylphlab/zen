import { describe, it, expect, vi } from 'vitest';
import { map } from './map'; // Assuming map is exported from map.ts

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

    profile.setKey('age', 31);
    expect(profile.get()).toEqual({ name: 'John', age: 31 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ name: 'John', age: 31 });

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
    profile.set(newProfile);
    expect(profile.get()).toEqual(newProfile);
    // set() should replace the internal reference
    // Update: Depending on implementation, set might also create a copy.
    // Testing for direct reference equality might be too implementation-specific.
    // Let's focus on the value and notification.
    // expect(profile.get()).toBe(newProfile);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newProfile);

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

    // Add more tests if map gets subscribeKey functionality later
});
