import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { persistentAtom } from './index';
import { get, set } from '@sylphlab/zen-core';

// --- Mocks ---

// Basic localStorage mock for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = value.toString();
      // Simulate storage event dispatch (basic) - needs refinement for real cross-tab tests
      // const event = new StorageEvent('storage', { key, newValue: value, storageArea: localStorageMock });
      // window.dispatchEvent(event);
    },
    removeItem(key: string): void {
      delete store[key];
      // Simulate storage event dispatch (basic)
      // const event = new StorageEvent('storage', { key, newValue: null, storageArea: localStorageMock });
      // window.dispatchEvent(event);
    },
    clear(): void {
      store = {};
      // Simulate storage event dispatch (basic) - clear might not fire specific events
      // const event = new StorageEvent('storage', { storageArea: localStorageMock });
      // window.dispatchEvent(event);
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
    // Helper to inspect store
    _getStore(): Record<string, string> {
        return store;
    }
  };
})();

// --- Tests ---

describe('persistentAtom', () => {
  const TEST_KEY = 'testAtomKey';

  beforeEach(() => {
    // Assign mock to global localStorage before each test
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear(); // Ensure clean state
  });

  afterEach(() => {
    localStorageMock.clear();
    // Restore original localStorage if needed, though usually not necessary in test env
  });

  it('should initialize with initialValue if storage is empty', () => {
    const initial = { count: 0 };
    const store = persistentAtom(TEST_KEY, initial);
    expect(get(store)).toEqual(initial);
    // Check if initial value was written to storage
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(initial));
  });

  it('should load value from storage if present', () => {
    const storedValue = { count: 10 };
    localStorageMock.setItem(TEST_KEY, JSON.stringify(storedValue));

    const initial = { count: 0 }; // Different initial value
    const store = persistentAtom(TEST_KEY, initial);

    // Value should be loaded from storage, overriding initialValue
    expect(get(store)).toEqual(storedValue);
  });

  it('should update storage when atom value is set', () => {
    const initial = { count: 0 };
    const store = persistentAtom(TEST_KEY, initial);
    const newValue = { count: 5 };

    set(store, newValue);

    expect(get(store)).toEqual(newValue);
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(newValue));
  });

  // TODO: Add tests for:
  // - sessionStorage
  // - custom serializer
  // - storage event handling (cross-tab sync) - might require more advanced mocking
  // - error handling (encode/decode errors, storage errors)
  // - behavior when storage is unavailable (fallback)
});