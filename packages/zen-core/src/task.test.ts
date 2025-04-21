import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribe } from './atom'; // Assuming subscribe handles TaskAtom
import { runTask, task } from './task';

// Helper to wait for promises/microtasks
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('task', () => {
  let taskAtom;
  const asyncFnSuccess = vi.fn(async (arg: string) => {
    await tick();
    return `Success: ${arg}`;
  });
  const asyncFnError = vi.fn(async (arg: string) => {
    await tick();
    throw new Error(`Failure: ${arg}`);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a task atom with initial state', () => {
    taskAtom = task(asyncFnSuccess);
    expect(taskAtom._kind).toBe('task');
    expect(taskAtom._value).toEqual({ loading: false, error: undefined, data: undefined });
    expect(taskAtom._asyncFn).toBe(asyncFnSuccess);
  });

  it('should update state to loading when run starts', () => {
    taskAtom = task(asyncFnSuccess);
    runTask(taskAtom, 'test');
    expect(taskAtom._value).toEqual({ loading: true, error: undefined, data: undefined });
    expect(asyncFnSuccess).toHaveBeenCalledWith('test');
  });

  it('should update state with data on successful completion', async () => {
    taskAtom = task(asyncFnSuccess);
    const promise = runTask(taskAtom, 'abc');
    expect(taskAtom._value.loading).toBe(true);

    await promise; // Wait for the async function to complete

    expect(taskAtom._value).toEqual({ loading: false, error: undefined, data: 'Success: abc' });
    expect(asyncFnSuccess).toHaveBeenCalledTimes(1);
  });

  it('should update state with error on failure', async () => {
    taskAtom = task(asyncFnError);
    const errorListener = vi.fn();

    // Use try/catch as run() re-throws the error
    try {
      await runTask(taskAtom, 'fail');
    } catch (e) {
      errorListener(e);
    }

    expect(taskAtom._value.loading).toBe(false);
    expect(taskAtom._value.error).toBeInstanceOf(Error);
    expect(taskAtom._value.error?.message).toBe('Failure: fail');
    expect(taskAtom._value.data).toBeUndefined();
    expect(asyncFnError).toHaveBeenCalledTimes(1);
    expect(errorListener).toHaveBeenCalledTimes(1); // Ensure error was caught
  });

  it('should notify subscribers on state changes', async () => {
    taskAtom = task(asyncFnSuccess);
    const listener = vi.fn();
    const unsubscribe = subscribe(taskAtom, listener);

    // Initial state notification from subscribe
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      { loading: false, error: undefined, data: undefined },
      undefined, // oldValue is undefined on initial subscribe call
    );

    const promise = runTask(taskAtom, 'notify');

    // Loading state notification
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      { loading: true, error: undefined, data: undefined },
      { loading: false, error: undefined, data: undefined },
    );

    await promise;

    // Success state notification
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(
      { loading: false, error: undefined, data: 'Success: notify' },
      { loading: true, error: undefined, data: undefined },
    );

    unsubscribe();
  });

  it('should handle multiple runs, only processing the latest if overlapping', async () => {
    const slowFn = vi.fn(async (arg: string) => {
      if (arg === 'first') {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Use timeout for delay
        return 'First finished';
      }
      await tick();
      return `Finished: ${arg}`;
    });

    taskAtom = task(slowFn);
    const listener = vi.fn();
    const unsubscribe = subscribe(taskAtom, listener);
    listener.mockClear(); // Clear initial subscribe call

    // Start first run
    const promiseRun1 = runTask(taskAtom, 'first');
    expect(slowFn).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1); // Loading state
    expect(taskAtom._value.loading).toBe(true);

    // Start second run before first finishes
    const promiseRun2 = runTask(taskAtom, 'second');
    expect(slowFn).toHaveBeenCalledTimes(1); // Should not run again if already running
    // State remains loading, listener not called again for loading
    expect(listener).toHaveBeenCalledTimes(1);
    expect(taskAtom._value.loading).toBe(true);

    // Finish second run
    await promiseRun2;
    expect(listener).toHaveBeenCalledTimes(2); // Finished state for second run
    expect(taskAtom._value).toEqual({ loading: false, error: undefined, data: 'First finished' }); // Expect first run's data

    // Now finish first run
    await promiseRun1;

    // Listener should NOT be called again, state should remain from second run
    expect(listener).toHaveBeenCalledTimes(2);
    expect(taskAtom._value).toEqual({ loading: false, error: undefined, data: 'First finished' }); // State remains from first run

    unsubscribe();
  });
});
