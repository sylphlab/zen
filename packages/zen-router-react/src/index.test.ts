// Import get/subscribe normally - they will be mocked by vi.mock below
import { type MapAtom, type Unsubscribe, get, map, subscribe } from '@sylphlab/zen-core';
import { $router, type RouterState } from '@sylphlab/zen-router'; // Import real $router
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouter } from './index'; // Import the hook

// Mock the core get/subscribe functions
vi.mock('@sylphlab/zen-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sylphlab/zen-core')>();
  return {
    ...actual,
    get: vi.fn(),
    subscribe: vi.fn(),
  };
});

// Mock the router store itself (optional, could use real one if preferred)
// vi.mock('@sylphlab/zen-router', async (importOriginal) => {
//     const actual = await importOriginal<typeof import('@sylphlab/zen-router')>();
//     const mockMap = map<RouterState>({ path: '/', search: {}, params: {} });
//     return {
//         ...actual,
//         $router: mockMap,
//     };
// });

describe('useRouter', () => {
  let mockGet: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let listeners: Set<(state: RouterState) => void>;
  let currentState: RouterState;

  beforeEach(() => {
    // Reset mocks and state
    vi.resetAllMocks();
    listeners = new Set();
    currentState = { path: '/', search: {}, params: {} }; // Initial state

    // Get mock functions using vi.mocked with the imported functions
    mockGet = vi.mocked(get);
    mockSubscribe = vi.mocked(subscribe);
    mockUnsubscribe = vi.fn();

    // Setup mock implementations
    mockGet.mockImplementation((_store: MapAtom<RouterState>) => {
      // Assume $router is passed correctly due to module execution order
      // if (store === $router) { // This check might be unreliable depending on mock strategy
      return currentState;
      // }
      // return undefined; // Fallback
    });

    mockSubscribe.mockImplementation(
      (_store: MapAtom<RouterState>, listener: (state: RouterState) => void): Unsubscribe => {
        // Assume $router is passed correctly
        // if (store === $router) {
        listeners.add(listener);
        // Simulate immediate call on subscribe
        listener(currentState);
        return mockUnsubscribe; // Return the mock unsubscribe function
        // }
        // return () => {}; // Fallback
      },
    );
  });

  it('should return the initial router state', () => {
    const { result } = renderHook(() => useRouter());
    expect(mockGet).toHaveBeenCalledWith($router);
    expect(result.current).toEqual({ path: '/', search: {}, params: {} });
  });

  it('should subscribe to the router store on mount', () => {
    renderHook(() => useRouter());
    expect(mockSubscribe).toHaveBeenCalledWith($router, expect.any(Function));
  });

  it('should update state when the router store changes', () => {
    const { result } = renderHook(() => useRouter());

    const newState: RouterState = { path: '/new', search: { q: 'test' }, params: {} };

    // Simulate store update by calling registered listeners
    act(() => {
      currentState = newState; // Update the state our mock `get` returns
      listeners.forEach((listener) => listener(newState));
    });

    expect(result.current).toEqual(newState);
  });

  it('should perform initial sync check if state changed between get and subscribe', () => {
    // Simulate state changing immediately after initial get but before subscribe's effect runs
    const initialState = { path: '/', search: {}, params: {} };
    const changedState = { path: '/changed', search: {}, params: {} };

    // Ensure the first call to get (in useState) returns initial state
    mockGet.mockImplementationOnce(() => initialState);
    // Subsequent calls (e.g., in useEffect) will use the general mock returning currentState
    mockGet.mockImplementation(() => currentState);

    currentState = initialState; // Start with initial state

    const { result } = renderHook(() => useRouter());

    // NOW simulate state changing *after* initial render but before effect runs
    currentState = changedState;

    // Initial render uses initialState
    expect(result.current).toEqual(initialState);

    // After useEffect runs, it should sync to changedState
    // Need to wait for effect - @testing-library/react handles this implicitly with act/updates
    // Re-assert after potential effect run (though direct check might be tricky without waitFor)
    // Let's verify the subscribe listener was called with the changed state eventually
    expect(mockSubscribe).toHaveBeenCalledWith($router, expect.any(Function));
    // Simulate the listener being called by the subscription *after* the state change
    // Also simulate the sync check within useEffect calling get again
    mockGet.mockReturnValue(changedState); // Subsequent calls to get return changed state
    act(() => {
      listeners.forEach((listener) => listener(currentState));
    });
    expect(result.current).toEqual(changedState);
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useRouter());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should return the same state reference if store value has not changed', () => {
    const { result, rerender } = renderHook(() => useRouter());
    const initialState = result.current;

    // Rerender without state change
    rerender();

    expect(result.current).toBe(initialState); // Expect referential equality

    // Simulate store update with the exact same object (shouldn't happen with immutable updates, but tests the hook)
    act(() => {
      listeners.forEach((listener) => listener(currentState));
    });

    expect(result.current).toBe(initialState); // Still the same reference
  });

  it('should return new state reference when store value changes', () => {
    const { result } = renderHook(() => useRouter());
    const initialState = result.current;

    const newState: RouterState = { path: '/new', search: { q: 'test' }, params: {} };

    act(() => {
      currentState = newState;
      listeners.forEach((listener) => listener(newState));
    });

    expect(result.current).not.toBe(initialState); // Expect new reference
    expect(result.current).toEqual(newState);
  });
});
