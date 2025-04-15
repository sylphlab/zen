// 极致优化的轻量级状态管理库 (怪兽性能版)
// 经过极致性能优化，包含可变辅助函数以最大化性能

// 基本类型定义
export type Listener<T> = (value: T) => void;

// 核心接口定义
export interface Atom<T = any> {
  get(): T;
  set(newValue: T, forceNotify?: boolean): void;
  subscribe(listener: Listener<T>): () => void;
  readonly value: T;
  readonly listeners: ReadonlySet<Listener<T>>;
  _notify(value: T): void;
  _notifyBatch(): void;
  _value: T;
  _listeners: Set<Listener<T>> | undefined;
}

export interface ReadonlyAtom<T = any> {
  get(): T;
  subscribe(listener: Listener<T>): () => void;
  readonly value: T;
  readonly listeners: ReadonlySet<Listener<T>>;
  _notify(value: T): void;
  _notifyBatch(): void;
  _value: T;
  _listeners?: Set<Listener<T>>;
  // Computed specific properties (make internal explicit)
  _dirty?: boolean;
  _sources?: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
  _sourceValues?: any[];
  _calculation?: Function;
  _equalityFn?: (a: T, b: T) => boolean;
  _unsubscribers?: (() => void)[] | null;
  _onChangeHandler?: () => void;
  _onChange?(): void;
  _update?(): void;
  _subscribeToSources?(): void;
  _unsubscribeFromSources?(): void;
}

// 共享的空集合常量 - 使用类型断言确保正确的类型
const EMPTY_SET = (() => {
  const set = new Set<Listener<any>>();
  if (Object.freeze) Object.freeze(set);
  return set as unknown as ReadonlySet<Listener<any>>;
})();

// 批处理系统
let batchDepth = 0;
const batchQueue = new Set<Atom<any> | ReadonlyAtom<any>>(); // Ensure correct type

// 批处理API
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    if (--batchDepth === 0 && batchQueue.size > 0) {
      // Create a copy before iterating, in case notifications trigger more batching
      const queue = Array.from(batchQueue);
      batchQueue.clear();
      for (const atom of queue) {
        // Use internal method directly
        atom._notifyBatch();
      }
    }
  }
}

// 原子原型 - 极致性能优化版本
const AtomProto: Atom<any> = {
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


// Computed相关类型
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
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

// --- Specialized Computed Atom Creators ---

function createSingleSourceComputed<S, T>(
  source: Atom<S> | ReadonlyAtom<S>,
  calculation: (sourceValue: S) => T,
  equalityFn: (a: T, b: T) => boolean
): ReadonlyAtom<T> {
  const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
  computedAtom._sources = [source];
  computedAtom._sourceValues = [undefined]; // Lazy init value
  computedAtom._calculation = calculation;
  computedAtom._equalityFn = equalityFn;
  computedAtom._dirty = true; // Start dirty, calculate on first get/subscribe
  // _value will be set on first update
  // _listeners lazy init
  return computedAtom;
}

function createTwoSourceComputed<S1, S2, T>(
  s1: Atom<S1> | ReadonlyAtom<S1>, s2: Atom<S2> | ReadonlyAtom<S2>,
  calculation: (v1: S1, v2: S2) => T,
  equalityFn: (a: T, b: T) => boolean
): ReadonlyAtom<T> {
  const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
  computedAtom._sources = [s1, s2];
  computedAtom._sourceValues = [undefined, undefined];
  computedAtom._calculation = calculation;
  computedAtom._equalityFn = equalityFn;
  computedAtom._dirty = true;
  return computedAtom;
}

function createThreeSourceComputed<S1, S2, S3, T>(
  s1: Atom<S1> | ReadonlyAtom<S1>, s2: Atom<S2> | ReadonlyAtom<S2>, s3: Atom<S3> | ReadonlyAtom<S3>,
  calculation: (v1: S1, v2: S2, v3: S3) => T,
  equalityFn: (a: T, b: T) => boolean
): ReadonlyAtom<T> {
  const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
  computedAtom._sources = [s1, s2, s3];
  computedAtom._sourceValues = [undefined, undefined, undefined];
  computedAtom._calculation = calculation;
  computedAtom._equalityFn = equalityFn;
  computedAtom._dirty = true;
  return computedAtom;
}

function createFourSourceComputed<S1, S2, S3, S4, T>(
  s1: Atom<S1> | ReadonlyAtom<S1>, s2: Atom<S2> | ReadonlyAtom<S2>, s3: Atom<S3> | ReadonlyAtom<S3>, s4: Atom<S4> | ReadonlyAtom<S4>,
  calculation: (v1: S1, v2: S2, v3: S3, v4: S4) => T,
  equalityFn: (a: T, b: T) => boolean
): ReadonlyAtom<T> {
    const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
    computedAtom._sources = [s1, s2, s3, s4];
    computedAtom._sourceValues = [undefined, undefined, undefined, undefined];
    computedAtom._calculation = calculation;
    computedAtom._equalityFn = equalityFn;
    computedAtom._dirty = true;
    return computedAtom;
}

function createFiveSourceComputed<S1, S2, S3, S4, S5, T>(
  s1: Atom<S1> | ReadonlyAtom<S1>, s2: Atom<S2> | ReadonlyAtom<S2>, s3: Atom<S3> | ReadonlyAtom<S3>, s4: Atom<S4> | ReadonlyAtom<S4>, s5: Atom<S5> | ReadonlyAtom<S5>,
  calculation: (v1: S1, v2: S2, v3: S3, v4: S4, v5: S5) => T,
  equalityFn: (a: T, b: T) => boolean
): ReadonlyAtom<T> {
    const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
    computedAtom._sources = [s1, s2, s3, s4, s5];
    computedAtom._sourceValues = [undefined, undefined, undefined, undefined, undefined];
    computedAtom._calculation = calculation;
    computedAtom._equalityFn = equalityFn;
    computedAtom._dirty = true;
    return computedAtom;
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


// 计算atom原型 - 高性能版本
const ComputedAtomProto: ReadonlyAtom<any> = {
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
 * 创建优化的选择器atom (本质上是单依赖 computed)
 * 使用 `===` 进行快速比较，适用于选择对象属性或数组索引。
 */
export function selector<T, K extends keyof T>(
  source: Atom<T> | ReadonlyAtom<T>,
  key: K
): ReadonlyAtom<T[K]> {
  // Directly use the optimized single source computed creator
  return createSingleSourceComputed(
      source,
      value => value[key],
      (a, b) => a === b // Fast equality check
  );
}


// --- MUTABLE HELPER ATOMS ---
// WARNING: These modify data in-place for performance. They break immutability.

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
  filter(predicate: (value: T, index: number, array: T[]) => boolean): void; // Note: standard filter args
  map(mapper: (value: T, index: number, array: T[]) => T): void; // Note: standard map args
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