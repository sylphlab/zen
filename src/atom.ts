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
import { LIFECYCLE, emit } from './events'; // Import lifecycle events

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

  // Modified set - includes onSet event
  set(newValue: any, forceNotify: boolean = false) {
    const oldValue = this._value;

    // Perform the actual set if value changed
    if (forceNotify || !Object.is(newValue, oldValue)) {
      emit(this, LIFECYCLE.onSet, newValue); // Emit onSet before setting
      this._value = newValue;

      if (batchDepth > 0) {
        // Only add to queue if not already present
        if (!batchQueue.has(this)) {
           this._oldValueBeforeBatch = oldValue; // Store old value for batch
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
    emit(this, LIFECYCLE.onNotify, value); // Emit onNotify after notifying listeners
  },

  // Modified batch notify - uses stored old value and checks for change
  _notifyBatch() {
      const oldValue = this._oldValueBeforeBatch;
      const newValue = this._value;
      delete this._oldValueBeforeBatch; // Clear stored old value immediately

      // Only call _notify if the value actually changed compared to before the batch
      if (!Object.is(newValue, oldValue)) {
          this._notify(newValue, oldValue);
      }
      // REMOVED: delete (this as any)._batchValue;
  },

  // Modified subscribe - includes onMount, onStart events
  subscribe(listener: Listener<any>): Unsubscribe {
    const isFirstListener = !this._listeners || this._listeners.size === 0;

    // Optimized listener set initialization and addition
    (this._listeners = this._listeners || new Set()).add(listener);

    if (isFirstListener) {
      emit(this, LIFECYCLE.onStart); // Emit onStart for the first listener
    }
    emit(this, LIFECYCLE.onMount, listener); // Emit onMount for every listener

    listener(this._value, undefined); // Immediate notification with current value

    // Return unsubscribe function directly using 'this'
    // Note: 'this' context within the returned function might be unpredictable
    // if the function is detached or called with a different 'this'.
    // Let's test if Terser handles this well or if we need the explicit capture.
    // Reverting to explicit capture if tests fail.
    const self = this; // Use 'self' for explicit capture, safer than relying on 'this' in closure
    return function unsubscribe(): void {
      // Use captured 'self' instead of potentially ambiguous 'this'
      const currentListeners = self._listeners;
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          // delete self._listeners; // Optional: Clean up empty set
          emit(self, LIFECYCLE.onStop); // Emit onStop when the last listener unsubscribes
        }
      }
    };
  },

  // REMOVED: Convenience getter
  // get value(): any {
  //   return this.get();
  // },

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
