import { get, set } from '@sylphlab/zen-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistentZen } from './index';

// --- Mocks ---

// Simple in-memory mock for localStorage
let simpleStorageMock: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string): string | null => simpleStorageMock[key] ?? null,
  setItem: (key: string, value: string): void => { simpleStorageMock[key] = value; },
  removeItem: (key: string): void => { delete simpleStorageMock[key]; },
  clear: (): void => { simpleStorageMock = {}; },
  // Add length and key if needed by tests, otherwise omit for simplicity
  get length(): number { return Object.keys(simpleStorageMock).length; },
  key: (index: number): string | null => Object.keys(simpleStorageMock)[index] ?? null,
};

// --- Tests ---

describe('persistentZen', () => {
  const TEST_KEY = 'testAtomKey';

  beforeEach(() => {
    // Assign the simple mock to globalThis for the test
    (globalThis as any).localStorage = localStorageMock;
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
    (globalThis as any).localStorage = undefined; // Clean up mock
    // Restore original localStorage if needed, though usually not necessary in test env
  });

  it('should initialize with initialValue if storage is empty', () => { // Remove async
    const initial = { count: 0 };
    const store = persistentZen(TEST_KEY, initial);
    expect(get(store)).toEqual(initial);
    // Check if initial value was written to storage
    // await nextTick(); // Remove await
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(initial)); // Use mock
  });

  it('should load value from storage if present', () => { // Remove async
    const storedValue = { count: 10 };
    localStorageMock.setItem(TEST_KEY, JSON.stringify(storedValue)); // Use mock

    const initial = { count: 0 }; // Different initial value
    const store = persistentZen(TEST_KEY, initial);

    // Value should be loaded from storage, overriding initialValue
    expect(get(store)).toEqual(storedValue);
  });

  it('should update storage when atom value is set', () => { // Remove async
    const initial = { count: 0 };
    const store = persistentZen(TEST_KEY, initial);
    const newValue = { count: 5 };

    set(store, newValue);

    expect(get(store)).toEqual(newValue);
    // await nextTick(); // Remove await
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(newValue)); // Use mock
  });

  // TODO: Add tests for:
  // - sessionStorage
  // - custom serializer
  // - storage event handling (cross-tab sync) - might require more advanced mocking
  // - error handling (encode/decode errors, storage errors)
  // - behavior when storage is unavailable (fallback)
});
