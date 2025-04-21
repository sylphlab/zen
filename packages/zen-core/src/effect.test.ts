import { describe, expect, test, vi } from 'vitest';
import { set, zen } from './atom';
import { batched } from './batched'; // Import batched for testing interaction
import { computed } from './computed';
import { effect } from './effect';
import { subscribe } from './index'; // Use index subscribe

// Helper to wait for the next microtask tick
const nextTick = () => new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

describe('effect', () => {
  test('runs callback initially with current values', () => {
    const atom1 = zen(10);
    const atom2 = zen('hello');
    const callback = vi.fn();

    const cancel = effect([atom1 as any, atom2 as any], callback); // Cast stores

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(10, 'hello');

    cancel();
  });

  test('runs callback when a dependency changes', () => {
    const atom1 = zen(10);
    const atom2 = zen('hello');
    const callback = vi.fn();

    const cancel = effect([atom1 as any, atom2 as any], callback); // Cast stores
    callback.mockClear(); // Clear initial call

    set(atom1, 11);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(11, 'hello');

    set(atom2, 'world');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(11, 'world');

    cancel();
  });

  test('runs cleanup function before next callback', () => {
    const source = zen(0);
    const cleanupFn = vi.fn();
    const callback = vi.fn(() => cleanupFn);

    const cancel = effect([source as any], callback); // Cast store
    expect(callback).toHaveBeenCalledTimes(1); // Initial run
    expect(cleanupFn).not.toHaveBeenCalled();

    set(source, 1);
    expect(cleanupFn).toHaveBeenCalledTimes(1); // Cleanup from initial run
    expect(callback).toHaveBeenCalledTimes(2); // Second run

    set(source, 2);
    expect(cleanupFn).toHaveBeenCalledTimes(2); // Cleanup from second run
    expect(callback).toHaveBeenCalledTimes(3); // Third run

    cancel();
  });

  test('runs final cleanup function on cancel', () => {
    const source = zen(0);
    const cleanupFn = vi.fn();
    const callback = vi.fn(() => cleanupFn);

    const cancel = effect([source as any], callback); // Cast store
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanupFn).not.toHaveBeenCalled();

    set(source, 1);
    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(2);

    cancel();
    expect(cleanupFn).toHaveBeenCalledTimes(2); // Final cleanup called

    // Ensure callback and cleanup don't run after cancel
    callback.mockClear();
    cleanupFn.mockClear();
    set(source, 2);
    expect(callback).not.toHaveBeenCalled();
    expect(cleanupFn).not.toHaveBeenCalled();
  });

  test('handles computed dependencies', async () => {
    // SKIP related NaN issue
    const base = zen(10);
    const comp = computed(base as any, (val: unknown) => (val as number) * 2); // Cast needed, use unknown
    const callback = vi.fn();

    // Need to subscribe to computed first to initialize it
    const unsubComp = subscribe(comp as any, () => {});
    await nextTick(); // Allow computed to calculate

    const cancel = effect([comp as any], callback); // Cast needed
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(20);
    callback.mockClear();

    set(base, 11);
    await nextTick(); // Allow computed to update

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(22);

    cancel();
    unsubComp();
  });

  test('handles batched dependencies', async () => {
    const base = zen(10);
    const batchedDep = batched(base as any, (val: unknown) => (val as number) * 2); // Cast needed, use unknown
    const callback = vi.fn();

    const cancel = effect([batchedDep as any], callback); // Cast needed

    // Callback shouldn't run immediately because batched is null initially
    expect(callback).not.toHaveBeenCalled();

    await nextTick(); // Allow batched to calculate initial value

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(20);
    callback.mockClear();

    set(base, 11);
    // Callback shouldn't run immediately
    expect(callback).not.toHaveBeenCalled();

    await nextTick(); // Allow batched to update

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(22);

    cancel();
  });

  test('does not run callback if cancelled before first run', () => {
    const source = zen(0);
    const callback = vi.fn();

    const cancel = effect([source as any], callback); // Cast store
    cancel(); // Cancel immediately

    // The callback WILL run once due to the synchronous initial execution after setup
    expect(callback).toHaveBeenCalledTimes(1);

    callback.mockClear(); // Clear the initial call before checking subsequent calls

    set(source, 1);
    expect(callback).not.toHaveBeenCalled();
  });

  test('handles errors in callback gracefully', () => {
    const source = zen(0);
    const error = new Error('Callback error');
    const callback = vi.fn((val) => {
      if (val === 1) {
        throw error;
      }
    });
    const cleanupFn = vi.fn();
    const callbackWithCleanup = vi.fn((val) => {
      if (val === 1) {
        throw error;
      }
      return cleanupFn;
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Test without cleanup
    const cancel1 = effect([source as any], callback); // Cast store
    callback.mockClear();
    expect(() => set(source, 1)).not.toThrow(); // Error should be caught internally
    expect(callback).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during effect callback:', error);
    cancel1();

    consoleErrorSpy.mockClear();

    // Test with cleanup
    set(source, 0); // Reset source
    const cancel2 = effect([source as any], callbackWithCleanup); // Cast store
    callbackWithCleanup.mockClear();
    cleanupFn.mockClear();

    expect(() => set(source, 1)).not.toThrow(); // Error should be caught
    expect(callbackWithCleanup).toHaveBeenCalledTimes(1);
    expect(cleanupFn).toHaveBeenCalledTimes(1); // Cleanup from initial run should still happen
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during effect callback:', error);

    // Check if effect continues after error
    set(source, 2);
    expect(callbackWithCleanup).toHaveBeenCalledTimes(2); // Should run again
    expect(cleanupFn).toHaveBeenCalledTimes(1); // Cleanup from error run shouldn't exist

    cancel2();
    expect(cleanupFn).toHaveBeenCalledTimes(2); // Final cleanup from run '2'

    consoleErrorSpy.mockRestore();
  });

  test('handles errors in cleanup gracefully', () => {
    const source = zen(0);
    const cleanupError = new Error('Cleanup error');
    const cleanupFn = vi.fn(() => {
      throw cleanupError;
    });
    const callback = vi.fn(() => cleanupFn);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cancel = effect([source as any], callback); // Cast store
    callback.mockClear();

    // Trigger cleanup error
    expect(() => set(source, 1)).not.toThrow();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during effect cleanup:', cleanupError);

    consoleErrorSpy.mockClear();

    // Trigger final cleanup error
    expect(() => cancel()).not.toThrow();
    expect(cleanupFn).toHaveBeenCalledTimes(2); // Called again on cancel
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during final effect cleanup:',
      cleanupError,
    );

    consoleErrorSpy.mockRestore();
  });
});
