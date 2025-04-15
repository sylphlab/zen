// 极致优化的轻量级状态管理库 (怪兽性能版) - 计算属性实现

import { Atom, ReadonlyAtom, Listener, EMPTY_SET, batchDepth, batchQueue } from './core';
import { AtomProto } from './atom';

// Computed相关类型
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// 计算atom原型 - 高性能版本
export const ComputedAtomProto: ReadonlyAtom<any> = {
  _value: undefined as any,
  _listeners: undefined,
  _sources: undefined,
  _sourceValues: undefined,
  _calculation: undefined,
  _equalityFn: undefined,
  _unsubscribers: undefined,
  _onChangeHandler: undefined,
  _dirty: true,
  
  get(): any {
    if (this._dirty) {
       if (!this._unsubscribers && this._listeners && this._listeners.size > 0) {
           this._subscribeToSources?.();
       }
       this._update?.();
    }
    return this._value;
  },

  // 高效更新逻辑
  _update() {
    const sources = this._sources!;
    const sourceValues = this._sourceValues!;
    const calculation = this._calculation!;
    const sourceCount = sources.length;

    // 根据依赖数量优化收集源值并计算
    let newValue;
    // General case: Collect all values first
    for (let i = 0; i < sourceCount; i++) {
      sourceValues[i] = sources[i]!.get();
    }
    newValue = calculation.apply(null, sourceValues as any);

    // Mark as clean *before* notifying listeners
    this._dirty = false;

    // 值比较和通知 (使用注入的 equalityFn)
    if (!this._equalityFn!(newValue, this._value)) {
      this._value = newValue;

      // 批处理或直接通知 (使用自身的 _notify)
      if (batchDepth > 0) {
        batchQueue.add(this);
      } else {
        this._notify(newValue);
      }
    }
  },

  // 源变更处理 - 标记为脏并触发更新（如果需要）
  _onChange() {
    if (!this._dirty) {
      this._dirty = true;

      // 仅当有监听器时才立即或批量计划更新
      // If no listeners, the update will happen on the next .get() or .subscribe()
      if (this._listeners && this._listeners.size > 0) {
        if (batchDepth > 0) {
          batchQueue.add(this);
        } else {
           // Avoid immediate update if already in batch? No, batch handles deduplication.
           // If not batching, update now to ensure consistency for listeners.
           this._update!();
        }
      }
    }
  },

   // Helper method to encapsulate source subscription logic
  _subscribeToSources() {
      if (this._unsubscribers) return; // Already subscribed

      const sources = this._sources;
      if (!sources) return;
      
      const sourceCount = sources.length;
      this._unsubscribers = new Array(sourceCount);

      // 预先绑定处理器函数以避免在循环中创建
      if (!this._onChangeHandler) {
          const self = this; // Capture `this` reliably
          this._onChangeHandler = () => {
            self._onChange!();
          };
      }

      for (let i = 0; i < sourceCount; i++) {
          const source = sources[i];
          if (source) {
              this._unsubscribers[i] = source.subscribe(this._onChangeHandler!);
          }
      }
  },

  // Helper method to encapsulate source unsubscription logic
  _unsubscribeFromSources() {
      if (!this._unsubscribers) return; // Nothing to unsubscribe from

      const unsubscribers = this._unsubscribers;
      for (let i = 0; i < unsubscribers.length; i++) {
          const unsubscribe = unsubscribers[i];
          if (unsubscribe) unsubscribe();
      }
      this._unsubscribers = null; // Clear the array
  },

  // 高效订阅逻辑
  subscribe(listener: Listener<any>) {
    let listeners = this._listeners;
    if (!listeners) {
      listeners = new Set();
      this._listeners = listeners;
    }

    // 首次订阅?
    if (listeners.size === 0) {
      // 订阅所有源
      this._subscribeToSources!();

      // 确保值在首次订阅时是最新的
      // (get() handles this, but explicit check might be slightly clearer)
       if (this._dirty) {
           this._update!();
       }
    }

    // 添加监听器
    listeners.add(listener);

    // 立即通知当前值 (确保它是最新的)
    listener(this.get()); // Use get() to ensure value is calculated if dirty

    // 优化的退订函数
    const self = this; // Capture `this`
    return function unsubscribe(): boolean {
      const currentListeners = self._listeners;
      if (!currentListeners) return false;

      const removed = currentListeners.delete(listener);

      if (removed && currentListeners.size === 0) {
         self._unsubscribeFromSources!();
         self._dirty = true;
      }
      return removed;
    };
  },

  // --- Reuse AtomProto methods ---
  // Need to bind `this` correctly or ensure they are called with correct context
  // Object.create ensures `this` refers to the computed atom instance when called like `computedInstance._notify()`
  _notify: AtomProto._notify,
  _notifyBatch: AtomProto._notifyBatch,

  // 访问器属性
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
 * 创建高度优化的计算atom
 * @param stores 依赖的 atom 数组
 * @param calculation 计算函数
 * @param equalityFn 可选的等价函数，默认为 Object.is。传入 (a, b) => a === b 可获得微小性能提升（如果不需要 NaN 或 -0 处理）。
 */
export function computed<T, S extends Stores>(
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): ReadonlyAtom<T> {
  return createMultiSourceComputed(stores, calculation, equalityFn);
}

/**
 * 多依赖计算atom - 通用版本 (Fallback using apply)
 */
function createMultiSourceComputed<S extends Stores, T>(
  sources: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean
): ReadonlyAtom<T> {
  const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
  computedAtom._sources = sources;
  // Initialize with undefined, length matches sources
  computedAtom._sourceValues = Array(sources.length);
  computedAtom._calculation = calculation;
  computedAtom._equalityFn = equalityFn;
  computedAtom._dirty = true; // Start dirty
  return computedAtom;
}
