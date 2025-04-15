// Minimal Map Helper (Post-Optimization)

import { Atom, Listener, Unsubscribe } from './core'; // Removed Keys, KeyListener
import { atom } from './atom';
// REMOVED: import { subscribeKeys as subscribeKeysFn, listenKeys as listenKeysFn } from './keys';

// Minimal Map Atom Interface
export interface MapAtom<T extends object> extends Atom<T> {
  setKey<K extends keyof T>(key: K, value: T[K], forceNotify?: boolean): void; // Added optional forceNotify
  // REMOVED: Key Subscriptions
  // subscribeKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
  // listenKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
}

/**
 * 创建一个优化的 map atom (对象 atom)。
 * 提供 setKey 方法用于高效更新单个属性。
 *
 * @param initialValue 初始对象状态
 * @returns MapAtom 实例
 */
export function map<T extends object>(initialValue: T): MapAtom<T> {
  // Start with a shallow copy
  const baseAtom = atom<T>({ ...initialValue });
  const enhancedAtom = baseAtom as MapAtom<T>;

  enhancedAtom.setKey = function <K extends keyof T>(key: K, value: T[K], forceNotify: boolean = false): void {
      const current = this._value;
      // Simple check for top-level key change
      if (forceNotify || !Object.is(current[key], value)) {
          const newValue = { ...current, [key]: value };
          // Use the simplified set method - no payload/changedPath
          this.set(newValue, forceNotify);
      }
  };

  // REMOVED: Key subscription methods
  // enhancedAtom.subscribeKeys = ...
  // enhancedAtom.listenKeys = ...
  // REMOVED extra closing brace here

  return enhancedAtom;
}
