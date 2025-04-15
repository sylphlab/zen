// 极致优化的轻量级状态管理库 (怪兽性能版) - Map Atom 实现 (v1 - No subscribeKey)

import { Atom, Listener } from './core';
import { atom, AtomProto } from './atom';

// Map Atom 类型定义 (扩展基础 Atom)
export interface MapAtom<T extends object> extends Atom<T> {
  setKey<K extends keyof T>(key: K, value: T[K]): void;
  // subscribeKey is omitted in v1 for size optimization
}

/**
 * 创建一个优化的 map atom (对象 atom)。
 * 提供 setKey 方法用于高效更新单个属性。
 *
 * 提供 setKey 方法用于高效更新单个属性。
 *
 * @param initialValue 初始对象状态
 * @returns MapAtom 实例
 */
export function map<T extends object>(initialValue: T): MapAtom<T> {
  // Use the core atom to store the object state
  // Start with a shallow copy to avoid mutating the input object
  const baseAtom = atom<T>({ ...initialValue });

  // Enhance the existing atom instance directly
  const enhancedAtom = baseAtom as MapAtom<T>;

  // Define and assign the setKey method directly, ensuring correct 'this' and type context
  enhancedAtom.setKey = function <K extends keyof T>(key: K, value: T[K]): void {
      const current = this._value; // 'this' refers to enhancedAtom (which is baseAtom)
      // Only notify if the value for the specific key has changed
      if (!Object.is(current[key], value)) {
          // Create a new object shallowly copying the old one
          // This ensures the atom's reference changes for listeners
          const newValue = { ...current, [key]: value };
          // Use the base atom's set method to update value and notify
          // 'this.set' correctly refers to AtomProto.set via the prototype chain
          this.set(newValue);
      }
  }; // No need to bind 'this' here as it's a regular method assignment

  return enhancedAtom;
}
