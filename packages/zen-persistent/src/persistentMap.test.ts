import { get, set } from '@sylphlab/zen-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistentMap } from './index';

// --- Mocks ---

// Basic localStorage mock (Consider extracting to a shared test utility later)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = value.toString();
      // Basic event simulation (can be improved)
      // const event = new StorageEvent('storage', { key, newValue: value, storageArea: localStorageMock });
      // window.dispatchEvent(event);
    },
    removeItem(key: string): void {
      delete store[key];
      // const event = new StorageEvent('storage', { key, newValue: null, storageArea: localStorageMock });
      // window.dispatchEvent(event);
    },
    clear(): void {
      store = {};
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
    _getStore(): Record<string, string> {
      return store;
    },
  };
})();

// --- Tests ---

describe('persistentMap', () => {
  const TEST_KEY = 'testMapKey';

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with initialValue if storage is empty', () => {
    const initial = { name: 'Anon', age: 0 };
    const store = persistentMap(TEST_KEY, initial);
    expect(get(store)).toEqual(initial);
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(initial));
  });

  it('should load value from storage if present', () => {
    const storedValue = { name: 'Zen', age: 1 };
    localStorageMock.setItem(TEST_KEY, JSON.stringify(storedValue));

    const initial = { name: 'Anon', age: 0 }; // Different initial value
    const store = persistentMap(TEST_KEY, initial);

    expect(get(store)).toEqual(storedValue);
  });

  it('should update storage when the whole map value is set', () => {
    const initial = { name: 'Anon', age: 0 };
    const store = persistentMap(TEST_KEY, initial);
    const newValue = { name: 'Zen Master', age: 99, location: 'Cloud' };

    set(store, newValue); // Use core set function for maps

    expect(get(store)).toEqual(newValue);
    expect(localStorageMock.getItem(TEST_KEY)).toBe(JSON.stringify(newValue));
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
