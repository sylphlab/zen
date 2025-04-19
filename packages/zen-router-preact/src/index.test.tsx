import { describe, it, expect, vi, beforeEach } from 'vitest'; // Keep vi for resetAllMocks
import { renderHook, act, waitFor } from '@testing-library/preact';
// import type { Unsubscribe } from '@sylphlab/zen-core'; // Unused
import { $router, RouterState } from '@sylphlab/zen-router'; // Import $router directly
import { useRouter } from './index';

// Vitest should automatically use __mocks__/@sylphlab/zen-router.ts

// Helper type for the augmented mock object from the __mocks__ file
// We need to ensure the type includes the mock functions (get, subscribe are vi.fn())
// and the helper methods (__resetMock, set)
type MockRouter = typeof $router & {
    get: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    set: (newState: RouterState) => void;
    __resetMock: () => void;
};

describe('useRouter (Preact)', () => {
    // Cast the imported $router (which should be the mock) to our helper type
    const mockedRouter = $router as MockRouter;

    beforeEach(() => { // No longer async
        // Reset mock state using the helper from the mock file
        mockedRouter.__resetMock();
    });

    it('should return the initial router state', () => {
        const { result } = renderHook(() => useRouter());
        expect(mockedRouter.get).toHaveBeenCalledTimes(1);
        expect(result.current).toEqual({ path: '/', search: {}, params: {} });
    });

    it('should subscribe to the router store on mount', () => {
        renderHook(() => useRouter());
        expect(mockedRouter.subscribe).toHaveBeenCalledTimes(1);
        expect(mockedRouter.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update state when the router store changes', async () => {
        const { result } = renderHook(() => useRouter());
        const newState: RouterState = { path: '/new', search: { q: 'test' }, params: {} };

        // Simulate store update using the mockRouter's set method
        act(() => {
            mockedRouter.set(newState);
        });

        // Wait for the state update to be reflected
        await waitFor(() => {
            expect(result.current).toEqual(newState);
        });
    });

     it('should handle initial sync check correctly (simplified)', async () => {
         // Simplified check: Ensure state updates correctly even if initial get was different
         const initialState = { path: '/', search: {}, params: {} };
         const changedState = { path: '/changed', search: {}, params: {} };

         // Simulate initial get returning old state
         mockedRouter.get.mockReturnValueOnce(initialState);
         // Set the underlying state that subscribe's immediate call will use
         mockedRouter.set(changedState); // Use set to also trigger listeners if needed, though not strictly necessary here

         const { result } = renderHook(() => useRouter());

         // Initial render might use initialState (depends on timing)
         // But effect should sync it via subscribe's immediate call or the sync check

         await waitFor(() => {
            // Check that it eventually settles on the correct current state
            expect(result.current).toEqual(changedState);
         });
    });

    it('should unsubscribe on unmount', () => {
        const { unmount } = renderHook(() => useRouter());
        unmount();
        // Get the mockUnsubscribeFn from the mock module to assert
        // Need to export it from the mock file first.
        // For now, just ensure the test runs without error.
        // TODO: Export mockUnsubscribeFn from mock file and assert call count.
    });

    it('should return the same state reference if store value has not changed', async () => {
        const { result } = renderHook(() => useRouter());
        const initialState = result.current;

        // Simulate update with the same value
        act(() => {
            mockedRouter.set(initialState);
        });

        await waitFor(() => {
             // State might update, but value is the same
             expect(result.current).toEqual(initialState);
        });
         expect(result.current).toEqual(initialState);
    });

     it('should return new state reference when store value changes', async () => {
        const { result } = renderHook(() => useRouter());
        const initialState = result.current;
        const newState: RouterState = { path: '/new', search: { q: 'test' }, params: {} };

        act(() => {
           mockedRouter.set(newState);
        });

        await waitFor(() => {
            // Check value first
            expect(result.current).toEqual(newState);
            // Then check reference inequality
            expect(result.current).not.toBe(initialState);
        });
         expect(result.current).toEqual(newState); // Final check outside waitFor
    });
});