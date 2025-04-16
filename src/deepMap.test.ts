import { describe, it, expect, vi } from 'vitest'
import { deepMap } from './deepMap'
import { batch } from './core'

describe('deepMap', () => {
  it('should create a deep map store', () => {
    const initial = { user: { name: 'John', age: 30 }, settings: { theme: 'dark' } }
    const store = deepMap(initial)
    expect(store.get()).toEqual(initial)
    expect(typeof store.setPath).toBe('function') // Use setPath
    expect(typeof store.subscribe).toBe('function')
    expect(typeof store.get).toBe('function')
    expect(typeof store.set).toBe('function')
  })

  it('should get the initial value', () => {
    const initial = { a: { b: { c: 1 } } }
    const store = deepMap(initial)
    expect(store.get()).toEqual(initial)
  })

  it('should set a deep value using string path', () => {
    const store = deepMap({ user: { name: 'John', address: { city: 'Old City' } } })
    store.setPath('user.address.city', 'New City') // Use setPath
    expect(store.get().user.address.city).toBe('New City')
    expect(store.get().user.name).toBe('John') // Ensure other values are untouched
  })

  it('should set a deep value using array path', () => {
    const store = deepMap({ data: [{ id: 1, value: 'A' }, { id: 2, value: 'B' }] })
    store.setPath(['data', 1, 'value'], 'New B') // Use setPath
    // Add non-null assertions
    expect(store.get().data![1]!.value).toBe('New B')
    expect(store.get().data![0]!.value).toBe('A') // Ensure other values are untouched
  })

   it('should create intermediate objects/arrays if they do not exist', () => {
    const store = deepMap<{ user?: { profile?: { name?: string }; tags?: string[] }}>({})

    store.setPath('user.profile.name', 'Alice') // Use setPath
    const state1 = store.get()
    // Check intermediate objects exist. Use ts-ignore as type narrowing is complex here.
    // @ts-ignore Testing path creation, expect properties to exist
    expect(state1.user.profile.name).toBe('Alice')


    store.setPath('user.tags.0', 'tag1') // Use setPath, should create user.tags array
    const state2 = store.get()
    // Check intermediate array and element exist. Use ts-ignore.
    expect(Array.isArray(state2.user?.tags)).toBe(true)
    // @ts-ignore Testing path creation, expect properties to exist
    expect(state2.user.tags[0]).toBe('tag1')
  })

  it('should maintain immutability', () => {
    const initial = { a: { b: 1 } }
    const store = deepMap(initial)
    const originalA = store.get().a

    store.setPath('a.b', 2) // Use setPath

    const newA = store.get().a
    expect(store.get().a.b).toBe(2)
    expect(newA).not.toBe(originalA) // The 'a' object should be a new reference
    expect(store.get()).not.toBe(initial) // The root object should be a new reference
  })

   it('should not notify if value does not change', () => {
    const store = deepMap({ user: { name: 'John' } })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    listener.mockClear() // Clear initial call from subscribe

    store.setPath('user.name', 'John') // Use setPath, Set the same value

    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })

  it('should notify listeners when a deep value changes via setKey', () => {
    const store = deepMap({ user: { name: 'John' } })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    listener.mockClear() // Clear initial call from subscribe

    const oldValue = { user: { name: 'John' } }; // Store old value
    store.setPath('user.name', 'Jane') // Use setPath

    expect(listener).toHaveBeenCalledTimes(1)
    // Add oldValue (original object)
    expect(listener).toHaveBeenCalledWith({ user: { name: 'Jane' } }, oldValue) // Use variable

    unsubscribe()
  })

  it('should handle batching correctly with setKey', () => {
    const store = deepMap({ a: 1, b: 2 })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    listener.mockClear() // Clear initial call

    batch(() => {
      store.setPath('a', 10) // Use setPath
      store.setPath('b', 20) // Use setPath
    })

    expect(listener).toHaveBeenCalledTimes(1) // Only one notification after batch
    // Batch notification now passes the value before the batch started
    expect(listener).toHaveBeenCalledWith({ a: 10, b: 20 }, { a: 1, b: 2 }) // Expect original value as oldValue
    expect(store.get()).toEqual({ a: 10, b: 20 })

    unsubscribe()
  })

    it('should handle setting root properties', () => {
      const store = deepMap<{ name: string; age?: number }>({ name: 'Initial' })
      store.setPath('name', 'Updated') // Use setPath
      expect(store.get().name).toBe('Updated')
      store.setPath('age', 42) // Use setPath
      expect(store.get().age).toBe(42)
    })

     it('should handle setting values in arrays correctly', () => {
      const store = deepMap<{ items: (string | number)[] }>({ items: ['a', 'b', 'c'] })
      store.setPath('items.1', 'B') // Use setPath
      expect(store.get().items).toEqual(['a', 'B', 'c'])

      store.setPath(['items', 2], 3) // Use setPath
      expect(store.get().items).toEqual(['a', 'B', 3])

       // Test adding beyond current length (should ideally handle sparse arrays or expand)
      store.setPath('items.4', 'e') // Use setPath, Setting index 4 when length is 3
       expect(store.get().items.length).toBe(5) // Expect length to increase
       expect(store.get().items[3]).toBeUndefined() // Index 3 should be undefined
       expect(store.get().items[4]).toBe('e')
       expect(store.get().items).toEqual(['a', 'B', 3, undefined, 'e'])

    })

      it('should handle empty path input gracefully', () => {
        const initial = { a: 1 }
        const store = deepMap(initial)
        const listener = vi.fn()
        const unsubscribe = store.subscribe(listener)
        listener.mockClear()

        store.setPath('', 'should not change') // Use setPath, Empty string path
        expect(store.get()).toEqual(initial)
        expect(listener).not.toHaveBeenCalled()

         store.setPath([], 'should also not change') // Use setPath, Empty array path
         expect(store.get()).toEqual(initial)
         expect(listener).not.toHaveBeenCalled()

        unsubscribe()
      })

  // --- REMOVED Key Subscription Tests ---
  // The subscribeKeys and listenKeys functionality has been removed during optimization.
  // --- Path Subscription Tests ---

  it('listenPaths should be called when a specified path is changed via setPath', () => {
    const store = deepMap({ user: { name: 'John', details: { age: 30 } } });
    const pathListener = vi.fn();
    // Listen to a specific deep path
    const unsubscribe = store.listenPaths([['user', 'details', 'age']], pathListener);

    store.setPath(['user', 'details', 'age'], 31);
    const finalValue = { user: { name: 'John', details: { age: 31 } } };

    expect(pathListener).toHaveBeenCalledTimes(1);
    expect(pathListener).toHaveBeenCalledWith(31, ['user', 'details', 'age'], finalValue); // Expect correct value

    pathListener.mockClear();
    store.setPath(['user', 'name'], 'Jane'); // Change unrelated path
    expect(pathListener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('listenPaths should be called when a path is changed via set', () => {
    const store = deepMap({ user: { name: 'John', details: { age: 30 } } });
    const pathListener = vi.fn();
    const unsubscribe = store.listenPaths([['user', 'name']], pathListener);

    const newValue = { user: { name: 'Jane', details: { age: 30 } } };
    store.set(newValue);
    expect(pathListener).toHaveBeenCalledTimes(1);
    expect(pathListener).toHaveBeenCalledWith('Jane', ['user', 'name'], newValue); // Expect correct value

    unsubscribe();
  });

  it('listenPaths should handle multiple paths', () => {
    const store = deepMap({ a: { b: 1 }, c: 2 });
    const pathListener = vi.fn();
    const unsubscribe = store.listenPaths([['a', 'b'], ['c']], pathListener);

    // Change path ['a', 'b']
    store.setPath(['a', 'b'], 10);
    let currentValue = store.get();
    expect(pathListener).toHaveBeenCalledTimes(1);
    expect(pathListener).toHaveBeenCalledWith(10, ['a', 'b'], currentValue); // Expect correct value

    pathListener.mockClear();

    // Change path ['c']
    store.setPath(['c'], 20);
    currentValue = store.get();
    expect(pathListener).toHaveBeenCalledTimes(1);
    expect(pathListener).toHaveBeenCalledWith(20, ['c'], currentValue); // Expect correct value

     pathListener.mockClear();

     // Change both paths via set()
     const newValue = { a: { b: 100 }, c: 200 };
     store.set(newValue);
     expect(pathListener).toHaveBeenCalledTimes(2); // Called for each changed path
     expect(pathListener).toHaveBeenCalledWith(100, ['a', 'b'], newValue); // Expect correct value
     expect(pathListener).toHaveBeenCalledWith(200, ['c'], newValue); // Expect correct value

    unsubscribe();
  });

    it('listenPaths should trigger for parent path listeners', () => {
      const store = deepMap({ user: { name: 'John', address: { city: 'NY', zip: '10001' } } });
      const userListener = vi.fn();
      const addressListener = vi.fn();

      const unsubUser = store.listenPaths([['user']], userListener);
      const unsubAddr = store.listenPaths([['user', 'address']], addressListener);

      // Change a deep property
      store.setPath(['user', 'address', 'zip'], '10002');
      const finalValue = store.get();

      expect(userListener).toHaveBeenCalledTimes(1); // Triggered because child changed
      expect(userListener).toHaveBeenCalledWith('10002', ['user', 'address', 'zip'], finalValue); // Expect correct value
      expect(addressListener).toHaveBeenCalledTimes(1); // Triggered because child changed
      expect(addressListener).toHaveBeenCalledWith('10002', ['user', 'address', 'zip'], finalValue); // Expect correct value

      unsubUser();
      unsubAddr();
  });


   it('listenPaths should not be called after unsubscribing', () => {
    const store = deepMap({ a: { b: 1 } });
    const pathListener = vi.fn();
    const unsubscribe = store.listenPaths([['a', 'b']], pathListener);

    unsubscribe(); // Unsubscribe immediately

    store.setPath(['a', 'b'], 2);
    expect(pathListener).not.toHaveBeenCalled();
  });

    it('listenPaths should work correctly with batching', () => {
        const store = deepMap({ a: { b: 1 }, c: 2, d: 3 });
        const listenerAB = vi.fn();
        const listenerC = vi.fn();
        const listenerAC = vi.fn();

        const unsubAB = store.listenPaths([['a', 'b']], listenerAB);
        const unsubC = store.listenPaths([['c']], listenerC);
        const unsubAC = store.listenPaths([['a'], ['c']], listenerAC); // Listen to parent 'a' and 'c'

        batch(() => {
            store.setPath(['a', 'b'], 10); // Change deep path
            store.setPath(['c'], 20);      // Change another path
        });

        const finalValue = { a: { b: 10 }, c: 20, d: 3 };

        // Each specific listener should be called once after the batch
        expect(listenerAB).toHaveBeenCalledTimes(1);
        expect(listenerAB).toHaveBeenCalledWith(10, ['a', 'b'], finalValue); // Expect correct value

        expect(listenerC).toHaveBeenCalledTimes(1);
        expect(listenerC).toHaveBeenCalledWith(20, ['c'], finalValue); // Expect correct value

        // listenerAC should be called for each matching changed path after the batch
        expect(listenerAC).toHaveBeenCalledTimes(2);
        expect(listenerAC).toHaveBeenCalledWith(10, ['a', 'b'], finalValue); // Triggered by a.b change, expect correct value
        expect(listenerAC).toHaveBeenCalledWith(20, ['c'], finalValue);      // Triggered by c change, expect correct value


        unsubAB();
        unsubC();
        unsubAC();
    });

})
