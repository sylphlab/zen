// 极致优化的轻量级状态管理库 (怪兽性能版) - 可变辅助实现

import { Atom } from './core';
import { atom } from './atom';

/**
 * 创建优化的 **可变** 数组 atom。
 * 方法直接修改内部数组以提高性能。
 * WARNING: This atom's value is mutated directly. Use with caution.
 */
export function mutableArrayAtom<T>(initialItems: T[] = []): Atom<T[]> & {
  push(...items: T[]): number;
  pop(): T | undefined;
  unshift(...items: T[]): number;
  shift(): T | undefined;
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  update(index: number, updater: (item: T) => T): void;
  filter(predicate: (value: T, index: number, array: T[]) => boolean): void; 
  map(mapper: (value: T, index: number, array: T[]) => T): void;
  sort(compareFn?: (a: T, b: T) => number): void;
  reverse(): void;
  setIndex(index: number, value: T): void;
} {
  // Start with a copy to ensure the initial array isn't mutated externally
  const baseAtom = atom<T[]>(initialItems.slice());
  const enhanced = baseAtom as any; // Cast to add methods

  // Use Array.prototype methods directly for potential micro-optimizations
  const push = Array.prototype.push;
  const pop = Array.prototype.pop;
  const unshift = Array.prototype.unshift;
  const shift = Array.prototype.shift;
  const splice = Array.prototype.splice;
  const sort = Array.prototype.sort;
  const reverse = Array.prototype.reverse;
  const filter = Array.prototype.filter;
  const map = Array.prototype.map;

  enhanced.push = function(...items: T[]) {
    const current = this._value; // Access internal value directly
    const result = push.apply(current, items);
    this.set(current, true); // Force notify with mutated array
    return result; // Return new length
  };

  enhanced.pop = function() {
    const current = this._value;
    if (current.length === 0) return undefined;
    const result = pop.call(current);
    this.set(current, true); // Force notify
    return result; // Return popped item
  };

  enhanced.unshift = function(...items: T[]) {
    const current = this._value;
    const result = unshift.apply(current, items);
    this.set(current, true); // Force notify
    return result; // Return new length
  };

  enhanced.shift = function() {
    const current = this._value;
    if (current.length === 0) return undefined;
    const result = shift.call(current);
    this.set(current, true); // Force notify
    return result; // Return shifted item
  };

  enhanced.splice = function(start: number, deleteCount: number = 0, ...items: T[]) {
    const current = this._value;
    // Adjust deleteCount if undefined (behaves like native splice)
    const actualDeleteCount = deleteCount === undefined ? current.length - start : deleteCount;
    const result = splice.call(current, start, actualDeleteCount, ...items);
    this.set(current, true); // Force notify
    return result; // Return array of removed items
  };

  enhanced.update = function(index: number, updater: (item: T) => T) {
    const current = this._value;
    if (index < 0 || index >= current.length) return; // Index out of bounds
    const originalValue = current[index];
    const newValue = updater(originalValue);
    // Only notify if the value actually changed
    if (!Object.is(originalValue, newValue)) {
        current[index] = newValue;
        this.set(current, true); // Force notify
    }
  };

  enhanced.filter = function(predicate: (value: T, index: number, array: T[]) => boolean) {
      const current = this._value;
      // Filter creates a *new* array, so we replace the internal one
      const filtered = filter.call(current, predicate);
      // Only update if the length or content actually changed
      if (filtered.length !== current.length || filtered.some((v, i) => v !== current[i])) {
          this._value = filtered; // Directly replace internal value
          this.set(this._value, true); // Force notify with the new array reference
      }
  };

  enhanced.map = function(mapper: (value: T, index: number, array: T[]) => T) {
      const current = this._value;
      // Map creates a *new* array
      const mapped = map.call(current, mapper);
      // Always update as map creates a new array, even if values are identical
      this._value = mapped; // Directly replace internal value
      this.set(this._value, true); // Force notify with the new array reference
  };

  enhanced.sort = function(compareFn?: (a: T, b: T) => number) {
      const current = this._value;
      sort.call(current, compareFn);
      this.set(current, true); // Force notify
  };

  enhanced.reverse = function() {
      const current = this._value;
      reverse.call(current);
      this.set(current, true); // Force notify
  };

  enhanced.setIndex = function(index: number, value: T) {
    const current = this._value;
    if (index < 0 || index >= current.length) {
        console.warn(`mutableArrayAtom.setIndex: Index ${index} out of bounds (length ${current.length})`);
        return;
    }
    if (!Object.is(current[index], value)) {
        current[index] = value;
        this.set(current, true); // Force notify
    }
  };

  return enhanced;
}

/**
 * 创建优化的 **可变** Map atom。
 * 方法直接修改内部 Map 以提高性能。
 * WARNING: This atom's value is mutated directly. Use with caution.
 */
export function mutableMapAtom<K, V>(initialMap?: Map<K, V> | Iterable<readonly [K, V]>): Atom<Map<K, V>> & {
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  update(key: K, updater: (current: V | undefined) => V | undefined): void; // Allow returning undefined to delete
} {
  // Start with a new Map to ensure the initial one isn't mutated externally
  const baseAtom = atom<Map<K, V>>(new Map(initialMap));
  const enhanced = baseAtom as any; // Cast to add methods
  const mapSet = Map.prototype.set;
  const mapDelete = Map.prototype.delete;
  const mapClear = Map.prototype.clear;
  const mapGet = Map.prototype.get;
  const mapHas = Map.prototype.has;

  enhanced.set = function(key: K, value: V) {
    const current = this._value; // Access internal value
    // Only notify if value changed or key is new
    if (!mapHas.call(current, key) || !Object.is(mapGet.call(current, key), value)) {
        mapSet.call(current, key, value);
        this.set(current, true); // Force notify
    }
  };

  enhanced.delete = function(key: K) {
    const current = this._value;
    const result = mapDelete.call(current, key);
    if (result) { // Only notify if something was actually deleted
      this.set(current, true); // Force notify
    }
    return result;
  };

  enhanced.clear = function() {
    const current = this._value;
    if (current.size > 0) {
      mapClear.call(current);
      this.set(current, true); // Force notify
    }
  };

  enhanced.update = function(key: K, updater: (current: V | undefined) => V | undefined) {
    const current = this._value;
    const currentValue = mapGet.call(current, key);
    const newValue = updater(currentValue);

    if (newValue === undefined) {
        // If updater returns undefined, delete the key
        if (mapHas.call(current, key)) {
            mapDelete.call(current, key);
            this.set(current, true); // Force notify
        }
    } else {
        // Otherwise, set the new value, notify only if changed
        if (!mapHas.call(current, key) || !Object.is(currentValue, newValue)) {
            mapSet.call(current, key, newValue);
            this.set(current, true); // Force notify
        }
    }
  };

  return enhanced;
}

/**
 * 创建优化的 **可变** 对象 atom。
 * 方法直接修改内部对象以提高性能。
 * WARNING: This atom's value is mutated directly. Use with caution.
 */
export function mutableObjectAtom<T extends object>(initialState: T): Atom<T> & {
  update(updater: (state: T) => T | void): void; // Allow updater to return new state or mutate
  setKey<K extends keyof T>(key: K, value: T[K]): void;
  deleteKey<K extends keyof T>(key: K): void;
} {
  // Start with a copy
  const baseAtom = atom<T>({ ...initialState });
  const enhanced = baseAtom as any;

  enhanced.update = function(updater: (state: T) => T | void) {
    const current = this._value;
    // Allow updater to either mutate 'current' directly or return a new object
    const maybeNewState = updater(current);
    const newState = maybeNewState === undefined ? current : maybeNewState;

    // If updater returned a new object, replace the internal value
    if (newState !== current) {
        this._value = newState;
        this.set(newState, true); // Force notify with new reference
    } else {
        // If updater mutated 'current', force notify with the same reference
        // We need a way to detect if mutation happened. This is tricky.
        // Safest bet: always notify if updater didn't return a new state.
        // Or require updaters to signal change. For simplicity, always notify on mutation.
        this.set(current, true); // Force notify (assuming mutation happened)
    }
  };

  enhanced.setKey = function<K extends keyof T>(key: K, value: T[K]) {
    const current = this._value;
    if (!Object.is(current[key], value)) {
      current[key] = value; // Mutate in place
      this.set(current, true); // Force notify
    }
  };

  enhanced.deleteKey = function<K extends keyof T>(key: K) {
    const current = this._value;
    if (key in current) {
      delete current[key]; // Mutate in place
      this.set(current, true); // Force notify
    }
  };

  return enhanced;
}