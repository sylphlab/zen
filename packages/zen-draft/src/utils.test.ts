import { describe, it, expect } from 'vitest';
import { isDraftable, isMap, isSet, deepFreeze } from './utils';

describe('isDraftable', () => {
  it('should return true for plain objects and arrays', () => {
    expect(isDraftable({})).toBe(true);
    expect(isDraftable([])).toBe(true);
    expect(isDraftable(Object.create(null))).toBe(true);
  });

  it('should return false for primitives and non-plain objects/collections', () => {
    expect(isDraftable(1)).toBe(false);
    expect(isDraftable('string')).toBe(false);
    expect(isDraftable(true)).toBe(false);
    expect(isDraftable(null)).toBe(false);
    expect(isDraftable(undefined)).toBe(false);
    expect(isDraftable(Symbol('a'))).toBe(false);
    expect(isDraftable(() => {})).toBe(false);
    expect(isDraftable(new Date())).toBe(false);
    expect(isDraftable(/regex/)).toBe(false);
    expect(isDraftable(new Map())).toBe(false); // Handled separately
    expect(isDraftable(new Set())).toBe(false); // Handled separately
    expect(isDraftable(Promise.resolve())).toBe(false);
  });
});

describe('isMap', () => {
  it('should return true for Maps', () => {
    expect(isMap(new Map())).toBe(true);
  });
  it('should return false for non-Maps', () => {
    expect(isMap({})).toBe(false);
    expect(isMap([])).toBe(false);
    expect(isMap(new Set())).toBe(false);
    expect(isMap(1)).toBe(false);
  });
});

describe('isSet', () => {
  it('should return true for Sets', () => {
    expect(isSet(new Set())).toBe(true);
  });
  it('should return false for non-Sets', () => {
    expect(isSet({})).toBe(false);
    expect(isSet([])).toBe(false);
    expect(isSet(new Map())).toBe(false);
    expect(isSet(1)).toBe(false);
  });
});

describe('deepFreeze', () => {
  it('should freeze plain objects recursively', () => {
    const obj = { a: 1, b: { c: 2 }, d: [3, { e: 4 }] };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.b)).toBe(true);
    expect(Object.isFrozen(obj.d)).toBe(true);
    expect(Object.isFrozen(obj.d[1])).toBe(true);
  });

  it('should not freeze non-plain objects like Map/Set/Date', () => {
    const map = new Map([['a', 1]]);
    const set = new Set([1]);
    const date = new Date();
    const obj = { map, set, date };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true); // The container object is frozen
    expect(Object.isFrozen(map)).toBe(false);
    expect(Object.isFrozen(set)).toBe(false);
    expect(Object.isFrozen(date)).toBe(false);
  });

  it('should handle null and primitives', () => {
    expect(() => deepFreeze(null)).not.toThrow();
    expect(() => deepFreeze(1)).not.toThrow();
    expect(() => deepFreeze('test')).not.toThrow();
  });

  it('should handle already frozen objects', () => {
     const obj = Object.freeze({ a: 1 });
     expect(() => deepFreeze(obj)).not.toThrow();
     expect(Object.isFrozen(obj)).toBe(true);
  });
});