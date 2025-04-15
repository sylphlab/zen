// 极致优化的轻量级状态管理库 (怪兽性能版) - 基本 Atom 实现

import {
  Atom,
  Listener,
  Unsubscribe,
  EMPTY_SET,
  batchDepth,
  batchQueue,
  EventPayload,
  SetPayload,
  NotifyPayload,
  PathString,
  KeyListener
} from './core';
// Import checkPaths helper
import { checkPaths } from './keys';

// Helper function to trigger event listeners (Exported)
export function triggerEvent(listeners: Set<(payload: any) => any> | undefined, payload: any): boolean {
    if (!listeners || listeners.size === 0) return false;
    let aborted = false;
    payload.abort = () => { aborted = true; };
    for (const listener of listeners) {
        listener(payload);
        if (aborted) break;
    }
    return aborted;
}

// Helper function to trigger mount/start/stop listeners (Exported)
export function triggerLifecycleEvent(listeners: Set<(payload: EventPayload) => void | Unsubscribe> | undefined, payload: EventPayload): (Unsubscribe | void)[] {
    const cleanups: (Unsubscribe | void)[] = [];
    if (listeners && listeners.size > 0) {
        for (const listener of listeners) {
             cleanups.push(listener(payload));
        }
    }
    return cleanups;
}

// 原子原型 - 极致性能优化版本
export const AtomProto: Atom<any> = {
  _value: undefined as any,
  _listeners: undefined,
  _active: false,
  _mountCleanups: undefined,
  _keyListeners: undefined, // Added
  _onMount: undefined,
  _onStart: undefined,
  _onStop: undefined,
  _onSet: undefined,
  _onNotify: undefined,

  get(): any {
    return this._value;
  },

  // Updated set signature to accept optional payload
  set(newValue: any, forceNotify: boolean = false, payload?: Partial<SetPayload<any>>) {
    const oldValue = this._value;
    // Use existing payload if provided, ensuring shared object exists
    const finalPayload: SetPayload<any> = {
        newValue,
        shared: payload?.shared ?? {}, // Ensure shared is an object
        changedPath: payload?.changedPath, // Carry over changedPath if provided
        abort: () => {} // Placeholder, triggerEvent will overwrite
    };

    // Trigger onSet listeners using helper
    if (triggerEvent(this._onSet, finalPayload)) {
        return; // Aborted by onSet listener
    }

    // Perform the actual set if value changed
    if (forceNotify || !Object.is(newValue, oldValue)) {
      this._value = newValue;

      if (batchDepth > 0) {
        batchQueue.add(this);
        // TODO: Store oldValue/payload (including changedPath) for batching
      } else {
        // Pass the potentially augmented payload (with changedPath) to _notify
        this._notify(newValue, oldValue, finalPayload);
      }
    }
  },

  _notify: function(value: any, oldValue?: any, payloadFromSet?: EventPayload) {
    let notifyAborted = false;
    const changedPath = (payloadFromSet as SetPayload<any>)?.changedPath;

    const notifyPayload: NotifyPayload<any> = payloadFromSet
      ? { ...payloadFromSet, newValue: value, abort: () => { notifyAborted = true; } }
      : { newValue: value, shared: {}, abort: () => { notifyAborted = true; } };
    notifyPayload.changedPath = changedPath;

    // Trigger onNotify listeners
    if (this._onNotify && this._onNotify.size > 0) {
        notifyPayload.abort = () => { notifyAborted = true; };
        for (const listener of this._onNotify) {
            listener(notifyPayload);
            if (notifyAborted) break;
        }
    }
    if (notifyAborted) return;

    // --- Fine-Grained Notification Logic ---
    let notifiedListeners: Set<Listener<any>> | undefined = undefined;

    // 1. Notify relevant key listeners if the map/deepMap has key listeners
    if (this._keyListeners && this._keyListeners.size > 0) {
        notifiedListeners = new Set();
        for (const [listenerPath, listenerSet] of this._keyListeners.entries()) {
             // If a specific path changed, check relevance. If no path specified (full set), notify all key listeners.
             if (!changedPath || checkPaths(changedPath, listenerPath)) {
                 for (const keyListener of listenerSet) {
                     if (!notifiedListeners.has(keyListener)) {
                         keyListener(value, oldValue);
                         notifiedListeners.add(keyListener);
                     }
                 }
             }
        }
    }

    // 2. Notify general store listeners (only if they haven't been notified via key listener)
    if (this._listeners && this._listeners.size > 0) {
      const listenersCopy = Array.from(this._listeners);
      for (const listener of listenersCopy) {
         if (!notifiedListeners || !notifiedListeners.has(listener)) {
             listener(value, oldValue);
         }
      }
    }
  },

  _notifyBatch() {
      // TODO: Handle oldValue/payload/changedPath correctly for batching.
      this._notify(this._value, undefined, undefined);
  },

  subscribe(listener: Listener<any>): Unsubscribe {
    const isFirst = !this._listeners || this._listeners.size === 0;
    let listeners = this._listeners;
    if (!listeners) {
      listeners = new Set();
      this._listeners = listeners;
    }
    listeners.add(listener);
    if (isFirst && !this._active) {
        this._active = true;
        const payload: EventPayload = { shared: {} };
        triggerLifecycleEvent(this._onStart, payload);
        triggerLifecycleEvent(this._onMount, payload);
    }
    listener(this._value, undefined);
    const atomInstance = this;
    return function unsubscribe(): void {
      const currentListeners = atomInstance._listeners;
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0 && atomInstance._active) {
            atomInstance._active = false;
            const payload: EventPayload = { shared: {} };
            if (atomInstance._mountCleanups && atomInstance._mountCleanups.size > 0) {
                 const cleanupsToRun = Array.from(atomInstance._mountCleanups);
                 atomInstance._mountCleanups.clear();
                 cleanupsToRun.forEach(cleanup => cleanup());
            }
            triggerLifecycleEvent(atomInstance._onStop, payload);
        }
      }
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
  // Initialize instance-specific properties
  atomInstance._listeners = undefined;
  atomInstance._keyListeners = undefined; // Initialize key listeners map
  atomInstance._active = false;
  atomInstance._mountCleanups = undefined;
  atomInstance._onMount = undefined;
  atomInstance._onStart = undefined;
  atomInstance._onStop = undefined;
  atomInstance._onSet = undefined;
  atomInstance._onNotify = undefined;

  return atomInstance;
}
