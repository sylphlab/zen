import { describe, expect, test, vi } from 'vitest';
import { batch, get, setKey, subscribe } from './index'; // Use index functions
import { mapCreator } from './mapCreator';
describe('mapCreator', () => {
    test('creates a function that generates map stores', () => {
        const initializer = vi.fn();
        const createUser = mapCreator(initializer);
        const user1 = createUser('id1');
        expect(user1).toBeDefined();
        expect(user1._kind).toBe('map');
        expect(get(user1)).toEqual({}); // Starts empty before initializer runs (sync)
        expect(initializer).toHaveBeenCalledTimes(1);
        expect(initializer).toHaveBeenCalledWith(user1, 'id1');
    });
    test('initializer sets initial state', () => {
        const initializer = (store, id) => {
            setKey(store, 'name', `User ${id}`);
        };
        const createUser = mapCreator(initializer);
        const user1 = createUser('id1');
        expect(get(user1)).toEqual({ name: 'User id1' });
        const user2 = createUser('id2');
        expect(get(user2)).toEqual({ name: 'User id2' });
    });
    test('caches store instances by ID', () => {
        const initializer = vi.fn((store, id) => {
            setKey(store, 'name', `User ${id}`);
        });
        const createUser = mapCreator(initializer);
        const user1a = createUser('id1');
        const user1b = createUser('id1');
        const user2 = createUser('id2');
        expect(user1a).toBe(user1b); // Should return the same instance
        expect(user1a).not.toBe(user2); // Should return different instances for different IDs
        expect(initializer).toHaveBeenCalledTimes(2); // Initializer called only once per ID
        expect(initializer).toHaveBeenCalledWith(user1a, 'id1');
        expect(initializer).toHaveBeenCalledWith(user2, 'id2');
    });
    test('passes additional arguments to initializer', () => {
        const initializer = vi.fn();
        // Define types for ID and additional args
        const createItem = mapCreator(initializer);
        const item1 = createItem(123, 'A');
        expect(initializer).toHaveBeenCalledTimes(1);
        expect(initializer).toHaveBeenCalledWith(item1, 123, 'A');
        // Test caching with additional args (cache key is only ID)
        const item1Cached = createItem(123, 'B'); // Should return cached item1
        expect(item1Cached).toBe(item1);
        expect(initializer).toHaveBeenCalledTimes(1); // Initializer not called again
    });
    test('handles async initializers (mapCreator itself is sync)', async () => {
        const promise = new Promise((resolve) => setTimeout(() => resolve('Async Data'), 10));
        const initializer = async (store, _id) => {
            setKey(store, 'loading', true);
            const data = await promise;
            // Wrap subsequent updates in a batch
            batch(() => {
                setKey(store, 'data', data);
                setKey(store, 'loading', false);
            });
        };
        const createData = mapCreator(initializer);
        const dataStore = createData('data1');
        const listener = vi.fn();
        const unsub = subscribe(dataStore, listener); // Cast dataStore to any
        // 1. Initial synchronous subscribe call. Initializer sets loading:true synchronously.
        expect(listener).toHaveBeenCalledTimes(1);
        // The value passed to the listener is the state *after* the sync part of the initializer.
        expect(listener).toHaveBeenCalledWith({ loading: true }, undefined);
        expect(get(dataStore)).toEqual({ loading: true });
        listener.mockClear();
        // 2. Wait for async initializer to complete
        await promise; // Wait for the async operation in the initializer
        // 3. Check final state
        const finalState = { data: 'Async Data', loading: false };
        expect(get(dataStore)).toEqual(finalState);
        // 4. Check listener calls *after* mockClear
        // Assuming the async part (setting data and loading:false) happens in a way
        // that triggers one notification after the initial sync one.
        expect(listener).toHaveBeenCalled(); // Should have been called at least once after clear
        // Add check to ensure listener was called before accessing calls array
        if (listener.mock.calls.length > 0) {
            // Use non-null assertion operator (!) after checking length
            expect(listener.mock.calls[listener.mock.calls.length - 1]?.[0]).toEqual(finalState);
            // The oldValue should be the state after the sync part of the initializer
            expect(listener.mock.calls[listener.mock.calls.length - 1]?.[1]).toEqual({ loading: true });
        }
        else {
            // Fail the test explicitly if the listener wasn't called after clear
            expect(listener.mock.calls.length).toBeGreaterThan(0);
        }
        // Check caching
        unsub();
    });
    test('handles initializer errors gracefully', () => {
        const error = new Error('Initializer failed');
        const initializer = vi.fn(() => {
            throw error;
        });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const createBroken = mapCreator(initializer);
        let store; // Use object instead of {}
        expect(() => {
            store = createBroken('broken1');
        }).not.toThrow(); // mapCreator itself should not throw
        expect(store).toBeDefined(); // Store instance should still be created and cached
        expect(initializer).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error during mapCreator initializer for ID "broken1":', error);
        // Check if cache works even after error
        const storeCached = createBroken('broken1');
        expect(storeCached).toBe(store);
        expect(initializer).toHaveBeenCalledTimes(1); // Initializer not called again
        consoleErrorSpy.mockRestore();
    });
});
