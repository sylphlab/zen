import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/preact'; // Need to ensure this is installed
import { useRouter } from '../index';
import { $router } from '@sylph/router'; // Import the core router store
import { set } from '@sylph/core'; // Import set to manipulate the store

describe('@sylph/router-preact', () => {
  it('useRouter should return the current router state', () => {
    // Set an initial state for the core router store
    const initialState = { path: '/preact-home', params: {}, search: { view: 'test' } };
    set($router, initialState);

    // Render the hook
    const { result } = renderHook(() => useRouter());

    // Expect the hook to return the initial state
    expect(result.current).toEqual(initialState);

    // TODO: Add tests for updates when the $router store changes
  });

  // TODO: Add tests for hook behavior during navigation
});
