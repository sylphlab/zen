// 极致优化的轻量级状态管理库 (怪兽性能版) - 核心类型定义

// 基本类型定义
export type Listener<T> = (value: T, oldValue?: T) => void;
export type Unsubscribe = () => void;

// REMOVED: Event Payloads and Callbacks
// REMOVED: Key subscription types

// Minimal Atom Interface
export interface Atom<T = any> {
  [key: symbol]: any; // Allow symbol indexing for lifecycle listeners
  // REMOVED: Internal Event Listeners, Mount State, Key Listeners

  get(): T;
  set(newValue: T, forceNotify?: boolean): void; // Simplified set signature
  subscribe(listener: Listener<T>): Unsubscribe;
  // REMOVED: readonly value: T;
  // REMOVED: readonly listeners: ReadonlySet<Listener<T>>;
  _notify(value: T, oldValue?: T): void; // Simplified notify signature
  _notifyBatch(): void;
  _value: T;
  _listeners: Set<Listener<T>> | undefined;
  // Internal property used in simplified batching
  _batchValue?: T; // Note: This might be redundant/removable now? Check AtomProto.
  _oldValueBeforeBatch?: T; // Store old value for batch key/path emission
}

// Minimal Readonly Atom Interface (e.g., for computed)
export interface ReadonlyAtom<T = any> {
  [key: symbol]: any; // Allow symbol indexing for lifecycle listeners
  // REMOVED: Internal Event Listeners, Mount State, Key Listeners

  get(): T;
  subscribe(listener: Listener<T>): Unsubscribe;
  // REMOVED: readonly value: T;
  // REMOVED: readonly listeners: ReadonlySet<Listener<T>>;
  _notify(value: T, oldValue?: T): void; // Simplified notify signature
  _notifyBatch(): void;
  _value: T;
  _listeners?: Set<Listener<T>>;
  // Internal property used in simplified batching
  _batchValue?: T; // Note: This might be redundant/removable now? Check AtomProto.
  _oldValueBeforeBatch?: T; // Store old value for batch key/path emission
  // Keep computed specific properties
  _dirty?: boolean; // Indicates if the computed value needs recalculation
  _sources?: ReadonlyArray<Atom<any> | ReadonlyAtom<any>>; // Source atoms
  _sourceValues?: any[]; // Last known values of sources
  _calculation?: Function; // The function to compute the value
  _equalityFn?: (a: T, b: T) => boolean; // Optional equality check
  _unsubscribers?: (() => void)[]; // Array of unsubscribe functions for sources
  _onChangeHandler?: () => void; // Bound handler for source changes
  _onChange?(): void; // Internal method called on source change
  _update?(): void; // Internal method to update value if dirty
  _subscribeToSources?(): void; // Internal method to subscribe to sources
  _unsubscribeFromSources?(): void; // Internal method to unsubscribe
}

// REMOVED: EMPTY_SET Constant

// 批处理系统
export let batchDepth = 0;
export const batchQueue = new Set<Atom<any> | ReadonlyAtom<any>>(); // Ensure correct type

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
