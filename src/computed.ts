// 极致优化的轻量级状态管理库 (怪兽性能版) - 计算属性实现

import {
  Atom,
  ReadonlyAtom,
  Listener,
  Unsubscribe,
  EMPTY_SET,
  batchDepth,
  batchQueue,
  EventPayload,
  SetPayload,
  NotifyPayload,
  EventCallback,
  SetEventCallback,
  NotifyEventCallback
} from './core';
// Import helpers from atom.ts
import { AtomProto, triggerEvent, triggerLifecycleEvent } from './atom';

// Computed相关类型
type Stores = ReadonlyArray<Atom<any> | ReadonlyAtom<any>>;
type StoreValues<S extends Stores> = {
  [K in keyof S]: S[K] extends Atom<infer V> | ReadonlyAtom<infer V> ? V : never
};

// 计算atom原型 - 高性能版本
export const ComputedAtomProto: ReadonlyAtom<any> = {
  // Inherit properties and methods
  ...AtomProto,

  // Override or add computed-specific properties
  _sources: undefined,
  _sourceValues: undefined,
  _calculation: undefined,
  _equalityFn: undefined,
  _unsubscribers: undefined,
  _onChangeHandler: undefined,
  _dirty: true,
  // Explicitly declare event/state properties
  _onMount: undefined,
  _onStart: undefined,
  _onStop: undefined,
  _onSet: undefined,
  _onNotify: undefined,
  _mountCleanups: undefined,
  _active: false,

  get(): any {
    // Subscribe to sources only if active and not already subscribed
    if (!this._unsubscribers && this._listeners && this._listeners.size > 0) {
        this._subscribeToSources?.();
    }
    // Calculate value if dirty
    if (this._dirty) {
       this._update?.(false); // Pass false: initial calculation
    }
    return this._value;
  },

  _update(triggeredBySourceChange: boolean = false) {
    const sources = this._sources!;
    const sourceValues = this._sourceValues!;
    const calculation = this._calculation!;
    const sourceCount = sources.length;

    let newValue;
    for (let i = 0; i < sourceCount; i++) {
      sourceValues[i] = sources[i]!.get();
    }
    newValue = calculation.apply(null, sourceValues as any);

    const oldValue = this._value;
    this._dirty = false; // Mark as clean

    if (!this._equalityFn!(newValue, oldValue)) {
      let payload: SetPayload<any> | undefined;
      let setAborted = false;

      // Trigger onSet *only if* triggered by a source change
      if (triggeredBySourceChange && this._onSet && this._onSet.size > 0) {
          payload = { newValue, shared: {} } as SetPayload<any>;
          payload.abort = () => { setAborted = true; };
          for (const listener of this._onSet) {
              listener(payload);
              if (setAborted) break;
          }
          if (setAborted) {
              this._dirty = true; // Revert dirty status if update was aborted
              return;
          }
      }

      this._value = newValue;

      if (batchDepth > 0) {
        batchQueue.add(this);
        // TODO: Handle oldValue/payload for batching
      } else {
        // Pass oldValue and payload (if created by onSet path)
        this._notify(newValue, oldValue, payload);
      }
    }
  },

  _onChange() {
    if (!this._dirty) {
      this._dirty = true;
      if (this._listeners && this._listeners.size > 0) {
        if (batchDepth > 0) {
          batchQueue.add(this);
        } else {
          this._update!(true); // Pass true: triggered by source change
        }
      }
    }
  },

  _subscribeToSources() {
      if (this._unsubscribers) return;
      const sources = this._sources;
      if (!sources) return;
      const sourceCount = sources.length;
      this._unsubscribers = new Array(sourceCount);

      if (!this._onChangeHandler) {
          const self = this;
          this._onChangeHandler = () => { self._onChange!(); };
      }

      for (let i = 0; i < sourceCount; i++) {
          const source = sources[i];
          if (source) {
              this._unsubscribers[i] = source.subscribe(this._onChangeHandler!);
          }
      }
  },

  _unsubscribeFromSources() {
      if (!this._unsubscribers) return;
      for (const unsubscribe of this._unsubscribers) {
          if (unsubscribe) unsubscribe();
      }
      this._unsubscribers = null;
  },

  subscribe(listener: Listener<any>): Unsubscribe {
    const isFirst = !this._listeners || this._listeners.size === 0;

    let listeners = this._listeners;
    if (!listeners) {
      listeners = new Set();
      this._listeners = listeners;
    }

    listeners.add(listener);

    // CRITICAL FIX: Removed explicit listener call here.
    // The initial notification now relies solely on the _notify
    // call triggered within this.get() -> this._update() if the value changes
    // from its initial undefined state during the first get().
    this.get(); // Ensure calculation & potential initial notification

    // Trigger onStart/onMount only if it wasn't already active
    if (isFirst && !this._active) {
      this._active = true;
      this._subscribeToSources!(); // Subscribe to sources when becoming active

      const payload: EventPayload = { shared: {} };
      triggerLifecycleEvent(this._onStart, payload);
      triggerLifecycleEvent(this._onMount, payload);
    }

    const self = this;
    return function unsubscribe(): void {
      const currentListeners = self._listeners;
      if (!currentListeners) return;

      currentListeners.delete(listener);

      if (currentListeners.size === 0 && self._active) {
        self._active = false;
        self._unsubscribeFromSources!();
        self._dirty = true;

        const payload: EventPayload = { shared: {} };

        if (self._mountCleanups && self._mountCleanups.size > 0) {
             const cleanupsToRun = Array.from(self._mountCleanups);
             self._mountCleanups.clear();
             cleanupsToRun.forEach(cleanup => cleanup());
        }
        triggerLifecycleEvent(self._onStop, payload);
      }
    };
  },

  _notify: AtomProto._notify,
  _notifyBatch: AtomProto._notifyBatch,

  get value(): any {
    return this.get();
  },
  get listeners(): ReadonlySet<Listener<any>> {
    return AtomProto.listeners;
  }
};

// Factory function
export function computed<T, S extends Stores>(
  stores: S,
  calculation: (...values: StoreValues<S>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): ReadonlyAtom<T> {
  const computedAtom = Object.create(ComputedAtomProto) as ReadonlyAtom<T>;
  computedAtom._sources = stores;
  computedAtom._sourceValues = Array(stores.length);
  computedAtom._calculation = calculation;
  computedAtom._equalityFn = equalityFn;
  computedAtom._dirty = true;
  return computedAtom;
}
