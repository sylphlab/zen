// 极致优化的轻量级状态管理库 (怪兽性能版) - 核心类型定义

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
export const EMPTY_SET = (() => {
  const set = new Set<Listener<any>>();
  if (Object.freeze) Object.freeze(set);
  return set as unknown as ReadonlySet<Listener<any>>;
})();

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