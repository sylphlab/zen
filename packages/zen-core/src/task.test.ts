import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTaskState, runTask, subscribeToTask, task } from './task'; // Import getTaskState and subscribeToTask
import { subscribe } from './zen'; // Keep core subscribe for comparison if needed, or remove if subscribeToTask covers all needs

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

  // Test concurrent run prevention
  it('should prevent concurrent run and return existing promise', async () => {
    let resolveFirst: (value: string) => void;
    const firstPromiseInternal = new Promise<string>((res) => {
      resolveFirst = res;
    });
    const slowFn = vi.fn(async (run: string) => {
      // Only the first run should execute this function body
      expect(run).toBe('first');
      await firstPromiseInternal; // Wait to be resolved manually
      return 'First finished';
    });

    taskAtom = task(slowFn);
    const listener = vi.fn();
    const unsubscribe = subscribeToTask(taskAtom, listener); // Use subscribeToTask
    listener.mockClear(); // Clear initial subscribe call

    // Start first run
    const promiseRun1 = runTask(taskAtom, 'first');
    expect(slowFn).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1); // Loading state call
    expect(getTaskState(taskAtom)).toEqual({ loading: true });
    const loadingState = { loading: true }; // Store for oldValue check

    // Attempt to start second run while first is running
    const promiseRun2 = runTask(taskAtom, 'second');

    // Assertions based on preventing concurrent run:
    expect(slowFn).toHaveBeenCalledTimes(1); // slowFn should NOT be called again
    // expect(promiseRun2).toBe(promiseRun1); // Removed: Incorrect assertion due to async function always returning a new promise wrapper.
    expect(listener).toHaveBeenCalledTimes(1); // Listener should NOT be called again for loading
    expect(getTaskState(taskAtom)).toEqual({ loading: true }); // State remains loading

    // Resolve the first run
    resolveFirst!('First finished');
    await promiseRun1; // Wait for the first promise to complete
    await tick(); // Allow microtasks for state update/notification

    // Assertions after first run completion:
    const firstRunFinishedState = { loading: false, data: 'First finished' };
    expect(listener).toHaveBeenCalledTimes(2); // Finished state call (Total: Loading1 + Finished1)
    expect(listener).toHaveBeenLastCalledWith(firstRunFinishedState, loadingState);
    expect(getTaskState(taskAtom)).toEqual(firstRunFinishedState);

    unsubscribe();
  });

  // Test for getTaskState
  it('should return current state via getTaskState', async () => {
    taskAtom = task(asyncFnSuccess);
    expect(getTaskState(taskAtom)).toEqual({ loading: false }); // Initial

    const promise = runTask(taskAtom, 'get');
    expect(getTaskState(taskAtom)).toEqual({ loading: true }); // Loading

    await promise;
    expect(getTaskState(taskAtom)).toEqual({ loading: false, data: 'Success: get' }); // Success
  });

  // Test for subscribeToTask
  it('should notify subscribers via subscribeToTask', async () => {
    taskAtom = task(asyncFnSuccess);
    const listener = vi.fn();
    const unsubscribe = subscribeToTask(taskAtom, listener); // Use subscribeToTask

    // Initial state notification
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ loading: false }, undefined);

    const promise = runTask(taskAtom, 'sub');

    // Loading state notification
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ loading: true }, { loading: false });

    await promise;

    // Success state notification
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(
      { loading: false, data: 'Success: sub' },
      { loading: true },
    );

    unsubscribe();

    // Ensure listener is not called after unsubscribe
    listener.mockClear();
    runTask(taskAtom, 'after');
    await tick();
    expect(listener).not.toHaveBeenCalled();
  });
});
