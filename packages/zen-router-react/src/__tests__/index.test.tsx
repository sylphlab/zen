import { setKey } from '@sylphlab/zen-core'; // To update the store
import { $router } from '@sylphlab/zen-router'; // The store the hook reads from
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRouter } from '../index'; // The hook under test

describe('useRouter Hook', () => {
  // Reset store before each test
  beforeEach(() => {
    // Set a known initial state for predictability
    setKey($router, 'path', '/');
    setKey($router, 'params', {});
    setKey($router, 'search', {});
  });

  it('should return the initial router state', () => {
    const { result } = renderHook(() => useRouter());

    expect(result.current).toEqual({
      path: '/',
      params: {},
      search: {},
    });
  });

  it('should update when the router store changes', () => {
    const { result } = renderHook(() => useRouter());

    // Check initial state
    expect(result.current.path).toBe('/');

    // Update the store state
    act(() => {
      setKey($router, 'path', '/new-path');
      setKey($router, 'params', { id: '123' });
    });

    // Check if the hook's return value updated
    expect(result.current.path).toBe('/new-path');
    expect(result.current.params).toEqual({ id: '123' });
  });

  // Add more tests later if needed (e.g., unmounting)
});
