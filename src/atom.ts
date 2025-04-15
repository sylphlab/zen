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
} from './core';

// Helper function to trigger event listeners (Exported)
export function triggerEvent(listeners: Set<(payload: any) => any> | undefined, payload: any): boolean {
    if (!listeners || listeners.size === 0) return false; // No listeners, proceed
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
  _active: false, // Initialize active state
  _mountCleanups: undefined, // Initialize mount cleanups
  // Event listeners
  _onMount: undefined,
  _onStart: undefined,
  _onStop: undefined,
  _onSet: undefined,
  _onNotify: undefined,

  get(): any {
    // TODO: Add read tracking if needed for advanced computed/effects later
    return this._value;
  },

  set(newValue: any, forceNotify: boolean = false) {
    const oldValue = this._value;
    const payload = { newValue, shared: {} } as SetPayload<any>; // Create payload ONCE

    // Trigger onSet listeners
    let setAborted = false;
    if (this._onSet && this._onSet.size > 0) {
        payload.abort = () => { setAborted = true; };
        for (const listener of this._onSet) {
            listener(payload);
            if (setAborted) break;
        }
    }
    if (setAborted) return;

    // Perform the actual set if value changed
    if (forceNotify || !Object.is(newValue, oldValue)) {
      this._value = newValue;

      if (batchDepth > 0) {
        batchQueue.add(this);
        // TODO: Store payload/oldValue with the atom in the queue?
      } else {
        // Pass the *same payload* to _notify for non-batched calls
        this._notify(newValue, oldValue, payload);
      }
    }
  },

  // Update method signature on the prototype itself
  _notify: function(value: any, oldValue?: any, payloadFromSet?: EventPayload) {
    // Trigger onNotify listeners
    let notifyAborted = false;
    // Ensure payload exists and 'abort' can be attached. Reuse shared state if possible.
    const notifyPayload: NotifyPayload<any> = payloadFromSet
      ? { ...payloadFromSet, newValue: value, abort: () => { notifyAborted = true; } }
      : { newValue: value, shared: {}, abort: () => { notifyAborted = true; } };

    if (this._onNotify && this._onNotify.size > 0) {
        notifyPayload.abort = () => { notifyAborted = true; }; // Ensure abort is attached
        for (const listener of this._onNotify) {
            listener(notifyPayload);
            if (notifyAborted) break;
        }
    }
    if (notifyAborted) return;

    // Notify actual store listeners
    if (this._listeners && this._listeners.size > 0) {
      const listenersCopy = Array.from(this._listeners);
      for (const listener of listenersCopy) {
        listener(value, oldValue);
      }
    }
  },

  _notifyBatch() {
      // TODO: Handle oldValue/payload correctly for batching.
      // For now, trigger notify without shared payload and undefined oldValue.
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

    // Trigger onStart/onMount only if it wasn't already active
    if (isFirst && !this._active) {
        this._active = true;
        // TODO: Cancel debounce timer for onStop if exists

        const payload: EventPayload = { shared: {} };
        triggerLifecycleEvent(this._onStart, payload);
        // Let onMount handlers manage adding cleanups to _mountCleanups
        triggerLifecycleEvent(this._onMount, payload);
    }

    // Call listener explicitly AFTER potentially triggering mount/start
    listener(this._value, undefined); // Call immediately, oldValue is undefined

    const atomInstance = this;
    return function unsubscribe(): void {
      const currentListeners = atomInstance._listeners;
      if (currentListeners) {
        currentListeners.delete(listener);

        // Trigger onStop/unmount only if it becomes inactive
        if (currentListeners.size === 0 && atomInstance._active) {
            atomInstance._active = false;
            // TODO: Start debounce timer for onStop/unmount
            // For now, trigger immediately without debounce
            const payload: EventPayload = { shared: {} };

            // Run and clear mount cleanups *before* onStop
            if (atomInstance._mountCleanups && atomInstance._mountCleanups.size > 0) {
                 const cleanupsToRun = Array.from(atomInstance._mountCleanups);
                 atomInstance._mountCleanups.clear();
                 cleanupsToRun.forEach(cleanup => cleanup());
            }
            // Trigger onStop *after* cleanups are done
            triggerLifecycleEvent(atomInstance._onStop, payload); // Ensure onStop is called
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
  return atomInstance;
}
