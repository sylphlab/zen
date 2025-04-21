import { get, set } from '@sylphlab/zen-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistentMap } from './index';

// --- Mocks ---

// Simple in-memory mock for localStorage
let simpleStorageMock: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string): string | null => simpleStorageMock[key] ?? null,
  setItem: (key: string, value: string): void => { simpleStorageMock[key] = value; },
  removeItem: (key: string): void => { delete simpleStorageMock[key]; },
  clear: (): void => { simpleStorageMock = {}; },
  get length(): number { return Object.keys(simpleStorageMock).length; },
  key: (index: number): string | null => Object.keys(simpleStorageMock)[index] ?? null,
};

// --- Tests ---

describe('persistentMap', () => {
  const TEST_KEY = 'testMapKey';

  beforeEach(() => {
    // Assign the simple mock to globalThis for the test
    (globalThis as any).localStorage = localStorageMock;
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
    (globalThis as any).localStorage = undefined; // Clean up mock
  });

  it('should initialize with initialValue if storage is empty', () => { // Remove async
    const initial = { name: 'Anon', age: 0 };
    const store = persistentMap(TEST_KEY, initial);
    expect(get(store)).toEqual(initial);
    // await nextTick(); // Remove await
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(initial)); // Use mock
  });

  it('should load value from storage if present', () => { // Remove async
    const storedValue = { name: 'Zen', age: 1 };
    localStorageMock.setItem(TEST_KEY, JSON.stringify(storedValue));

    const initial = { name: 'Anon', age: 0 }; // Different initial value
    const store = persistentMap(TEST_KEY, initial);

    expect(get(store)).toEqual(storedValue);
  });

  it('should update storage when the whole map value is set', () => { // Remove async
    const initial = { name: 'Anon', age: 0 };
    const store = persistentMap(TEST_KEY, initial);
    const newValue = { name: 'Zen Master', age: 99, location: 'Cloud' };

    set(store, newValue); // Use core set function for maps

    expect(get(store)).toEqual(newValue);
    // await nextTick(); // Remove await
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(newValue)); // Use mock
  });

  // Note: setKey is not directly tested here as it modifies the underlying map,
  // which then triggers the 'subscribe' listener that persists the *whole* map.
  // Testing setKey would indirectly test the subscribe mechanism.

  // TODO: Add tests for:
  // - sessionStorage
  // - custom serializer
  // - storage event handling (cross-tab sync)
  // - error handling
  // - setKey behavior (verify whole map is persisted)
});
