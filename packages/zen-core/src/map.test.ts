import { describe, expect, it, vi } from 'vitest';
import { map, set, setKey } from './map';
import { batch, get, subscribe } from './zen'; // get/subscribe/batch are from atom

describe('map', () => {
  it('should create a map atom with initial value', () => {
    const initial = { name: 'A', value: 1 };
    const mapAtom = map(initial);
    expect(mapAtom._kind).toBe('map');
    expect(get(mapAtom)).toEqual(initial);
    expect(get(mapAtom)).not.toBe(initial); // Should be a shallow copy
  });

  describe('setKey', () => {
    it('should update a key and notify listeners', () => {
      const initial = { name: 'A', value: 1 };
      const mapAtom = map(initial);
      const listener = vi.fn();
      const unsubscribe = subscribe(mapAtom, listener);
      listener.mockClear(); // Clear initial call

      setKey(mapAtom, 'name', 'B');

      expect(get(mapAtom)).toEqual({ name: 'B', value: 1 });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ name: 'B', value: 1 }, initial);

      unsubscribe();
    });

    it('should not notify if value is the same', () => {
      const initial = { name: 'A', value: 1 };
      const mapAtom = map(initial);
      const listener = vi.fn();
      const unsubscribe = subscribe(mapAtom, listener);
      listener.mockClear();

      setKey(mapAtom, 'name', 'A'); // Same value

      expect(get(mapAtom)).toEqual(initial);
      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should batch updates', () => {
      const initial = { name: 'A', value: 1 };
      const mapAtom = map(initial);
      const listener = vi.fn();
      const unsubscribe = subscribe(mapAtom, listener);
      listener.mockClear();

      batch(() => {
        setKey(mapAtom, 'name', 'B');
        setKey(mapAtom, 'value', 2);
        expect(listener).not.toHaveBeenCalled(); // Not called inside batch
      });

      expect(get(mapAtom)).toEqual({ name: 'B', value: 2 });
      expect(listener).toHaveBeenCalledTimes(1); // Called once after batch
      expect(listener).toHaveBeenCalledWith({ name: 'B', value: 2 }, initial);

      unsubscribe();
    });

    // Key-specific listeners are tested via events.test.ts
  });

  describe('set', () => {
    it('should update the whole object and notify listeners', () => {
      const initial = { name: 'A', value: 1 };
      const mapAtom = map(initial);
      const listener = vi.fn();
      const unsubscribe = subscribe(mapAtom, listener);
      listener.mockClear();

      const newValue = { name: 'C', value: 3 };
      set(mapAtom, newValue);

      expect(get(mapAtom)).toEqual(newValue);
      expect(get(mapAtom)).not.toBe(newValue); // Should create a new object
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(newValue, initial);

      unsubscribe();
    });

    it('should not notify if object reference is the same', () => {
      const initial = { name: 'A', value: 1 };
      const mapAtom = map(initial);
      const listener = vi.fn();
      const unsubscribe = subscribe(mapAtom, listener);
      listener.mockClear(); // Clear initial call from subscribe

      set(mapAtom, initial); // Set same object reference

      expect(get(mapAtom)).toEqual(initial);
      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should batch updates', () => {
      const initial = { name: 'A', value: 1 };
      const mapAtom = map(initial);
      const listener = vi.fn();
      const unsubscribe = subscribe(mapAtom, listener);
      listener.mockClear();

      const finalValue = { name: 'D', value: 4 };
      batch(() => {
        set(mapAtom, { name: 'B', value: 2 });
        set(mapAtom, finalValue);
        expect(listener).not.toHaveBeenCalled(); // Not called inside batch
      });

      expect(get(mapAtom)).toEqual(finalValue);
      expect(listener).toHaveBeenCalledTimes(1); // Called once after batch
      expect(listener).toHaveBeenCalledWith(finalValue, initial);

      unsubscribe();
    });

    // Key change emission logic is tested via events.test.ts indirectly
  });
});
