// 极致优化的轻量级状态管理库 (怪兽性能版) - 基本 Atom 实现

import {
  Atom,
  Listener,
  Unsubscribe,
  // EMPTY_SET, // Removed
  batchDepth,
  batchQueue,
  // EventPayload, // Removed
  // SetPayload, // Removed
  // NotifyPayload, // Removed
  // PathString, // Removed
  // KeyListener // Removed
} from './core';
// Import checkPaths helper - REMOVED
// import { checkPaths } from './keys';

// Helper function to trigger event listeners (Exported) - REMOVED
// Helper function to trigger mount/start/stop listeners (Exported) - REMOVED

// Minimal Atom Prototype
export const AtomProto: Atom<any> = {
  _value: undefined as any,
  _listeners: undefined, // Set of Listener<any> or undefined
  // _active: false, // Removed - Implicitly active if listeners exist
  // _mountCleanups: undefined, // Removed
  // _keyListeners: undefined, // Removed
  // _onMount: undefined, // Removed
  // _onStart: undefined, // Removed
  // _onStop: undefined, // Removed
  // _onSet: undefined, // Removed
  // _onNotify: undefined, // Removed

  get(): any {
    return this._value;
  },

  // Simplified set - no payload, no events
  set(newValue: any, forceNotify: boolean = false) {
    const oldValue = this._value;

    // Perform the actual set if value changed
    if (forceNotify || !Object.is(newValue, oldValue)) {
      this._value = newValue;

      if (batchDepth > 0) {
        // Only add to queue if not already present
        if (!batchQueue.has(this)) {
           batchQueue.add(this);
           // REMOVED: _batchValue logic
        }
      } else {
        // Notify immediately with new and old value
        this._notify(newValue, oldValue);
      }
    }
  },

  // Simplified notify - no payload, no events, no key listeners
  _notify: function(value: any, oldValue?: any) {
    // Notify general store listeners
    if (this._listeners && this._listeners.size > 0) {
      // Iterate directly over the set (safe as mutations happen before iteration)
      for (const listener of this._listeners) {
        listener(value, oldValue);
      }
    };
  },

  // Simplified batch notify - sends the current value, oldValue is undefined
  _notifyBatch() {
      this._notify(this._value, undefined);
      // REMOVED: delete (this as any)._batchValue;
  },

  // Simplified subscribe - no events, no mount/start/stop
  subscribe(listener: Listener<any>): Unsubscribe {
    let listeners = this._listeners;
    if (!listeners) {
      listeners = new Set();
      this._listeners = listeners;
    }
    listeners.add(listener);

    listener(this._value, undefined); // Immediate notification with current value

    const atomInstance = this; // Capture instance for unsubscribe closure
    return function unsubscribe(): void {
      const currentListeners = atomInstance._listeners;
      if (currentListeners) {
        currentListeners.delete(listener);
        // No need to check for empty or trigger lifecycle events
      }
    };
  },

  // Keep the convenience getter
  get value(): any {
    return this.get();
  },

  // listeners getter REMOVED
  // get listeners(): ReadonlySet<Listener<any>> { ... }
};


/**
 * Creates a minimal, highly optimized atom.
 */
export function atom<T>(initialValue: T): Atom<T> {
  // Use Object.create for prototype delegation (memory efficient)
  const atomInstance = Object.create(AtomProto);
  atomInstance._value = initialValue;
  // No need to explicitly initialize _listeners = undefined, prototype has it
  return atomInstance as Atom<T>;
}
