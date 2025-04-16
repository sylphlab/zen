// Task atom implementation for managing asynchronous operations.
import { Atom, Listener, Unsubscribe } from './core';
import { atom } from './atom'; // Base atom factory

/**
 * Represents the possible states of a task atom.
 * @property loading - True if the task is currently running.
 * @property error - An Error object if the last run failed.
 * @property data - The data returned from the last successful run.
 */
export type TaskState<T = any> = {
  loading: boolean;
  error?: Error;
  data?: T;
};

/**
 * Represents a Task Atom, which wraps an asynchronous function
 * and provides its state (loading, error, data) as a reactive atom.
 */
export type TaskAtom<T = any> = {
  /** Gets the current state of the task (loading, error, data). */
  get(): TaskState<T>;
  /** Subscribes to changes in the task's state. */
  subscribe(listener: Listener<TaskState<T>>): Unsubscribe;
  /**
   * Runs the asynchronous function associated with the task.
   * If the task is already running, returns the existing promise.
   * Updates the task's state atom based on the outcome.
   * @param args Arguments to pass to the asynchronous function.
   * @returns A promise that resolves with the result or rejects with the error.
   */
  run(...args: any[]): Promise<T>;
};

/**
 * Creates a Task Atom to manage the state of an asynchronous operation.
 *
 * @template T The type of the data returned by the async function.
 * @param asyncFn The asynchronous function to execute when `run` is called.
 * @returns A TaskAtom instance.
 */
export function task<T = void>(
  asyncFn: (...args: any[]) => Promise<T>
): TaskAtom<T> {
  // 1. Internal atom to hold the task's state (loading, error, data).
  const stateAtom = atom<TaskState<T>>({ loading: false });

  // 2. Variable to track the currently running promise, preventing concurrent runs.
  let runningPromise: Promise<T> | null = null;

  // 3. Create the TaskAtom object.
  const taskAtom: TaskAtom<T> = {
    // Delegate `get` and `subscribe` to the internal state atom.
    get: () => stateAtom.get(),
    subscribe: (listener) => stateAtom.subscribe(listener),

    // `run` method implementation.
    run: function(...args: any[]): Promise<T> {
      // If a promise is already running for this task, return it immediately.
      if (runningPromise) {
        // console.log('Task already running, returning existing promise.'); // Optional debug log
        return runningPromise;
      }

      // Define the actual execution logic within an async function.
      const execute = async (): Promise<T> => {
        // Set loading state immediately. Clear previous error/data.
        stateAtom.set({ loading: true, error: undefined, data: undefined });

        // Call the provided async function and store the promise.
        const promise = asyncFn(...args);
        runningPromise = promise; // Mark this promise as the currently running one.

        try {
          // Wait for the async function to complete.
          const result = await promise;

          // **Crucially**, only update the state if this *specific* promise instance
          // is still the one tracked as `runningPromise`. This prevents race conditions
          // if `run` was somehow called again before the first finished.
          if (runningPromise === promise) {
            // console.log('Task succeeded, updating state.'); // Optional debug log
            stateAtom.set({ loading: false, data: result, error: undefined });
            runningPromise = null; // Clear the running promise tracker.
          } else {
            // console.log('Task succeeded, but a newer run is active. Ignoring result.'); // Optional debug log
          }

          return result; // Return the successful result.
        } catch (error) {
          // Similar check for race conditions on error.
          if (runningPromise === promise) {
            // console.error('Task failed, updating state:', error); // Optional debug log
            // Ensure the error stored is always an Error instance.
            const errorObj = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
            stateAtom.set({ loading: false, error: errorObj, data: undefined });
            runningPromise = null; // Clear the running promise tracker.
          } else {
             // console.error('Task failed, but a newer run is active. Ignoring error.'); // Optional debug log
          }

          throw error; // Re-throw the error so the caller's catch block works.
        }
      };

      // Start the execution and return the promise.
      return execute();
    }
  };

  // 4. Return the created TaskAtom.
  return taskAtom;
}
