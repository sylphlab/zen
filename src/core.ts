// 极致优化的轻量级状态管理库 (怪兽性能版) - 核心类型定义

// 基本类型定义
export type Listener<T> = (value: T, oldValue?: T) => void; // Add oldValue
export type Unsubscribe = () => void; // Define Unsubscribe type

// Event Payloads and Callbacks
export interface EventPayload {
    shared: Record<string | symbol, any>;
}
export interface SetPayload<T> extends EventPayload {
    newValue: T;
    abort: () => void;
    changedPath?: PathString; // Optional path that changed in setKey
}
export interface NotifyPayload<T> extends EventPayload {
    newValue: T;
    abort: () => void;
    changedPath?: PathString; // Optional path that changed
}

export type EventCallback = (payload: EventPayload) => void | (() => void); // Mount/Start/Stop can return cleanup
export type SetEventCallback<T> = (payload: SetPayload<T>) => void;
export type NotifyEventCallback<T> = (payload: NotifyPayload<T>) => void;

// Key subscription types
export type PathString = string; // For deep paths like 'a.b.0.c'
export type PathArray = (string | number)[]; // For deep paths like ['a', 'b', 0, 'c']
export type Path = PathString | PathArray; // Union type for paths
export type Keys = PathString[]; // Array of path strings to listen to

// Listener for a specific key/path
export type KeyListener<V = any> = Listener<V>; // Simple alias for now

// 核心接口定义
export interface Atom<T = any> {
  // Internal Event Listener Sets (using any for simplicity, refine later if needed)
  _onMount?: Set<EventCallback>;
  _onStart?: Set<EventCallback>;
  _onStop?: Set<EventCallback>;
  _onSet?: Set<SetEventCallback<any>>;
  _onNotify?: Set<NotifyEventCallback<any>>;
  // Mount state
  _mountCleanups?: Set<Unsubscribe>;
  _active?: boolean;
  // Key listeners map (path string -> Set<Listener>) - Added
  _keyListeners?: Map<PathString, Set<KeyListener<any>>>;

  get(): T;
  set(newValue: T, forceNotify?: boolean, payload?: Partial<SetPayload<T>>): void; // Add optional payload
  subscribe(listener: Listener<T>): Unsubscribe; // Use Unsubscribe type
  readonly value: T;
  readonly listeners: ReadonlySet<Listener<T>>;
  _notify(value: T, oldValue?: T, payloadFromSet?: EventPayload): void; // Add payloadFromSet
  _notifyBatch(): void;
  _value: T;
  _listeners: Set<Listener<T>> | undefined;
}

export interface ReadonlyAtom<T = any> {
  // Internal Event Listener Sets (copy from Atom)
  _onMount?: Set<EventCallback>;
  _onStart?: Set<EventCallback>;
  _onStop?: Set<EventCallback>;
  _onSet?: Set<SetEventCallback<any>>; // Although readonly, computed might trigger internal set
  _onNotify?: Set<NotifyEventCallback<any>>;
  // Mount state (copy from Atom)
  _mountCleanups?: Set<Unsubscribe>;
  _active?: boolean;
  // Key listeners map (path string -> Set<Listener>) - Added
  _keyListeners?: Map<PathString, Set<KeyListener<any>>>;

  get(): T;
  subscribe(listener: Listener<T>): Unsubscribe; // Use Unsubscribe type
  readonly value: T;
  readonly listeners: ReadonlySet<Listener<T>>;
  _notify(value: T, oldValue?: T, payloadFromSet?: EventPayload): void; // Add payloadFromSet
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
  _update?(triggeredBySourceChange?: boolean): void; // Add optional parameter
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
