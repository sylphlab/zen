import { describe, it, expect, vi } from 'vitest';
import { deepMap, get, setPath, set, subscribe } from './deepMap'; // Import updated functional API (listenPaths removed)
import { batch } from './atom';
describe('deepMap (functional)', () => {
    it('should create a deep map store', () => {
        const initial = { user: { name: 'John', age: 30 }, settings: { theme: 'dark' } };
        const store = deepMap(initial); // Use deepMap
        expect(get(store)).toEqual(initial); // Use get
        // Check if functions exist
        expect(typeof setPath).toBe('function'); // Use setPath
        expect(typeof subscribe).toBe('function'); // Use subscribe
        expect(typeof get).toBe('function'); // Use get
        expect(typeof set).toBe('function'); // Use set
    });
    it('should get the initial value', () => {
        const initial = { a: { b: { c: 1 } } };
        const store = deepMap(initial); // Use deepMap
        expect(get(store)).toEqual(initial); // Use get
    });
    it('should set a deep value using string path', () => {
        const store = deepMap({ user: { name: 'John', address: { city: 'Old City' } } }); // Use deepMap
        setPath(store, 'user.address.city', 'New City'); // Use setPath
        const state = get(store); // Cast
        expect(state.user.address.city).toBe('New City');
        expect(state.user.name).toBe('John');
    });
    it('should set a deep value using array path', () => {
        const store = deepMap({ data: [{ id: 1, value: 'A' }, { id: 2, value: 'B' }] }); // Use deepMap
        setPath(store, ['data', 1, 'value'], 'New B'); // Use setPath
        // Add non-null assertions and cast to specific type
        const dataState = get(store);
        expect(dataState.data[1].value).toBe('New B');
        expect(dataState.data[0].value).toBe('A');
    });
    it('should create intermediate objects/arrays if they do not exist', () => {
        const store = deepMap({}); // Use deepMap
        setPath(store, 'user.profile.name', 'Alice'); // Use setPath
        const state1 = get(store); // Use get with non-null assertion and cast
        // Check intermediate objects exist. Use ts-ignore as type narrowing is complex here.
        // @ts-ignore Testing path creation, expect properties to exist
        expect(state1.user.profile.name).toBe('Alice');
        setPath(store, 'user.tags.0', 'tag1'); // Use setPath
        const state2 = get(store); // Use get with non-null assertion and cast
        // Check intermediate array and element exist. Use ts-ignore.
        expect(Array.isArray(state2.user?.tags)).toBe(true);
        // @ts-ignore Testing path creation, expect properties to exist
        expect(state2.user.tags[0]).toBe('tag1');
    });
    it('should maintain immutability', () => {
        const initial = { a: { b: 1 } };
        const store = deepMap(initial); // Use deepMap
        const originalA = get(store).a; // Use get with non-null assertion and cast
        setPath(store, 'a.b', 2); // Use setPath
        const newState = get(store); // Use get with non-null assertion and cast
        const newA = newState.a;
        expect(newState.a.b).toBe(2);
        expect(newA).not.toBe(originalA); // The 'a' object should be a new reference
        expect(newState).not.toBe(initial);
    });
    it('should not notify if value does not change', () => {
        const store = deepMap({ user: { name: 'John' } }); // Use deepMap
        const listener = vi.fn();
        const unsubscribe = subscribe(store, listener); // Use subscribe
        listener.mockClear(); // Clear initial call from subscribe
        setPath(store, 'user.name', 'John'); // Use setPath
        expect(listener).not.toHaveBeenCalled();
        unsubscribe();
    });
    it('should notify listeners when a deep value changes via setPath', () => {
        const store = deepMap({ user: { name: 'John' } }); // Use deepMap
        const listener = vi.fn();
        const unsubscribe = subscribe(store, listener); // Use subscribe
        const oldValue = get(store); // Use get with non-null assertion and cast
        listener.mockClear(); // Clear initial call from subscribe
        setPath(store, 'user.name', 'Jane'); // Use setPath
        expect(listener).toHaveBeenCalledTimes(1);
        // Add oldValue (original object)
        expect(listener).toHaveBeenCalledWith({ user: { name: 'Jane' } }, oldValue); // Use variable
        unsubscribe();
    });
    // Batching tests need re-evaluation for functional API
    /*
    it('should handle batching correctly with setPath', () => { ... }); // Use setPath
    */
    it('should handle setting root properties', () => {
        const store = deepMap({ name: 'Initial' }); // Use deepMap
        setPath(store, 'name', 'Updated'); // Use setPath
        expect(get(store).name).toBe('Updated'); // Cast
        setPath(store, 'age', 42); // Use setPath
        expect(get(store).age).toBe(42); // Cast
    });
    it('should handle setting values in arrays correctly', () => {
        const store = deepMap({ items: ['a', 'b', 'c'] }); // Use deepMap
        setPath(store, 'items.1', 'B'); // Use setPath
        expect(get(store).items).toEqual(['a', 'B', 'c']); // Cast
        setPath(store, ['items', 2], 3); // Use setPath
        expect(get(store).items).toEqual(['a', 'B', 3]); // Cast
        // Test adding beyond current length (should ideally handle sparse arrays or expand)
        setPath(store, 'items.4', 'e'); // Use setPath
        expect(get(store).items.length).toBe(5); // Cast
        expect(get(store).items[3]).toBeUndefined(); // Cast
        expect(get(store).items[4]).toBe('e'); // Cast
        expect(get(store).items).toEqual(['a', 'B', 3, undefined, 'e']); // Cast
    });
    it('should handle empty path input gracefully', () => {
        const initial = { a: 1 };
        const store = deepMap(initial); // Use deepMap
        const listener = vi.fn();
        const unsubscribe = subscribe(store, listener); // Use subscribe
        listener.mockClear();
        setPath(store, '', 'should not change'); // Use setPath
        expect(get(store)).toEqual(initial); // Use get with non-null assertion
        expect(listener).not.toHaveBeenCalled();
        setPath(store, [], 'should also not change'); // Use setPath
        expect(get(store)).toEqual(initial); // Use get with non-null assertion
        expect(listener).not.toHaveBeenCalled();
        unsubscribe();
    });
    it('should batch setPath updates', () => {
        const initial = { user: { name: 'A', age: 1 }, settings: { theme: 'dark' } };
        const store = deepMap(initial);
        const listener = vi.fn();
        const unsubscribe = subscribe(store, listener);
        listener.mockClear(); // Clear initial call
        batch(() => {
            setPath(store, 'user.name', 'B');
            setPath(store, 'settings.theme', 'light');
            setPath(store, ['user', 'age'], 2);
            expect(listener).not.toHaveBeenCalled(); // Not called inside batch
        });
        const expectedValue = { user: { name: 'B', age: 2 }, settings: { theme: 'light' } };
        expect(get(store)).toEqual(expectedValue);
        expect(listener).toHaveBeenCalledTimes(1); // Called once after batch
        expect(listener).toHaveBeenCalledWith(expectedValue, initial);
        unsubscribe();
    });
    // --- Path Subscription Tests Removed ---
    // All tests using listenPaths have been removed.
    describe('set (for deepMap)', () => {
        it('should replace the entire object value', () => {
            const initial = { a: { b: 1 }, c: 2 };
            const store = deepMap(initial);
            const newValue = { a: { b: 100 }, c: 3 }; // Match shape of initial
            set(store, newValue);
            expect(get(store)).toEqual(newValue);
            expect(get(store)).not.toBe(newValue); // Should be a deep clone
            expect(get(store).a).not.toBe(newValue.a); // Nested objects should also be cloned
        });
        it('should notify listeners when object content changes', () => {
            const initial = { a: 1 };
            const store = deepMap(initial);
            const listener = vi.fn();
            const unsubscribe = subscribe(store, listener);
            listener.mockClear();
            const newValue = { a: 2 };
            set(store, newValue);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(newValue, initial);
            unsubscribe();
        });
        it('should not notify listeners if object content is the same', () => {
            const initial = { a: 1 };
            const store = deepMap(initial);
            const listener = vi.fn();
            const unsubscribe = subscribe(store, listener);
            listener.mockClear();
            const newValue = { a: 1 }; // Same content, different reference
            set(store, newValue);
            expect(listener).not.toHaveBeenCalled();
            unsubscribe();
        });
        it('should notify listeners if object reference is the same but forced', () => {
            const initial = { a: 1 };
            const store = deepMap(initial);
            const listener = vi.fn();
            const unsubscribe = subscribe(store, listener);
            listener.mockClear();
            set(store, initial, true); // Force notify with same reference
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(initial, initial);
            unsubscribe();
        });
        it('should batch updates', () => {
            const initial = { a: 1 };
            const store = deepMap(initial);
            const listener = vi.fn();
            const unsubscribe = subscribe(store, listener);
            listener.mockClear();
            const finalValue = { a: 3 };
            batch(() => {
                set(store, { a: 2 });
                set(store, finalValue);
                expect(listener).not.toHaveBeenCalled();
            });
            expect(get(store)).toEqual(finalValue);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(finalValue, initial);
            unsubscribe();
        });
    });
    // Batching tests need re-evaluation for functional API
    /*
    it('listenPaths should work correctly with batching', () => { ... }); // Use listenPaths
    */
});
