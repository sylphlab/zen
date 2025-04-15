// 极致优化的轻量级状态管理库 (怪兽性能版) - 基本 Atom 实现

import { Atom, Listener, EMPTY_SET, batchDepth, batchQueue } from './core';

// 原子原型 - 极致性能优化版本
export const AtomProto: Atom<any> = {
  _value: undefined as any,
  _listeners: undefined,
  
  get(): any {
    return this._value;
  },

  set(newValue: any, forceNotify: boolean = false) {
    const currentValue = this._value;

    if (forceNotify || newValue !== currentValue ||
        (newValue !== newValue && currentValue !== currentValue)) {
      this._value = newValue;

      if (batchDepth > 0) {
        batchQueue.add(this);
      } else {
        this._notify(this._value);
      }
    }
  },

  _notify(value: any) {
    if (this._listeners && this._listeners.size > 0) {
      for (const listener of this._listeners) {
        listener(value);
      }
    }
  },

  _notifyBatch() {
    this._notify(this._value);
  },

  subscribe(listener: Listener<any>) {
    let listeners = this._listeners;
    if (!listeners) {
      listeners = new Set();
      this._listeners = listeners;
    }

    listeners.add(listener);
    listener(this._value);

    const atom = this;
    return function unsubscribe(): boolean {
      const currentListeners = atom._listeners;
      if (currentListeners) {
        return currentListeners.delete(listener);
      }
      return false;
    };
  },

  get value(): any {
    return this.get();
  },

  get listeners(): ReadonlySet<Listener<any>> {
    if (!this._listeners) return EMPTY_SET;
    const set = new Set(this._listeners);
    if (Object.freeze) Object.freeze(set);
    return set as ReadonlySet<Listener<any>>;
  }
};

/**
 * 创建一个极致优化的atom
 */
export function atom<T>(initialValue: T): Atom<T> {
  const atomInstance = Object.create(AtomProto) as Atom<T>;
  atomInstance._value = initialValue;
  // _listeners is lazily initialized on first subscribe
  return atomInstance;
}