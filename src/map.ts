// 极致优化的轻量级状态管理库 (怪兽性能版) - Map Atom 实现 (v1 - No subscribeKey)

import { Atom, Listener, Unsubscribe, Keys, KeyListener } from './core'; // Add Keys, KeyListener
import { atom } from './atom';
// Import simplified key subscription functions (they aren't truly fine-grained yet)
import { subscribeKeys as subscribeKeysFn, listenKeys as listenKeysFn } from './keys';

// Map Atom 类型定义 (扩展基础 Atom)
export interface MapAtom<T extends object> extends Atom<T> {
  setKey<K extends keyof T>(key: K, value: T[K]): void;
  // Key Subscriptions
  subscribeKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
  listenKeys(keys: Keys, listener: Listener<T>): Unsubscribe;
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

  enhancedAtom.setKey = function <K extends keyof T>(key: K, value: T[K]): void {
      const current = this._value;
      if (!Object.is(current[key], value)) {
          const newValue = { ...current, [key]: value };
          // Use base atom's set method
          this.set(newValue); // 'this' correctly refers to the atom instance
      }
  };

  // Add key subscription methods (using simplified functions for now)
  enhancedAtom.subscribeKeys = function (keys: Keys, listener: Listener<T>): Unsubscribe {
      // Delegate to the function from keys.ts, passing the store instance
      return subscribeKeysFn(this, keys, listener);
  };

  enhancedAtom.listenKeys = function (keys: Keys, listener: Listener<T>): Unsubscribe {
      // Delegate to the function from keys.ts, passing the store instance
      return listenKeysFn(this, keys, listener);
  };

  return enhancedAtom;
}
