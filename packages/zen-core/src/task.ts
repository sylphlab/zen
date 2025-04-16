// Task atom implementation for managing asynchronous operations.
import type { Atom } from './atom'; // Import Atom type
import type { Listener, Unsubscribe, AtomWithValue, TaskState } from './types'; // Import from types
import { atom as createAtom, get as getAtomValue, set as setAtomValue, subscribe as subscribeToAtom } from './atom'; // Import updated functional atom API, alias atom as createAtom for internal use
// Removed duplicate: import { atom } from './atom';
// Removed TaskState definition, imported from types.ts

// --- Type Definition ---
/**
 * Represents a Task Atom, which wraps an asynchronous function
 * and provides its state (loading, error, data) reactively.
 */
export type TaskAtom<T = any> = {
  readonly _stateAtom: Atom<TaskState<T>>;
  readonly _asyncFn: (...args: any[]) => Promise<T>; // Store the async function
};


// --- Internal state for tracking running promises ---
// WeakMap to associate TaskAtom instances with their currently running promise.
const runningPromises = new WeakMap<TaskAtom<any>, Promise<any>>();

/**
 * Creates a Task Atom to manage the state of an asynchronous operation.
 *
 * @template T The type of the data returned by the async function.
 * @param asyncFn The asynchronous function to execute when `runTask` is called.
 * @returns A TaskAtom instance.
 */
export function task<T = void>( // Rename createTask to task
  asyncFn: (...args: any[]) => Promise<T>
): TaskAtom<T> {
  // 1. Internal atom to hold the task's state (loading, error, data).
  const stateAtom = createAtom<TaskState<T>>({ loading: false }); // Use createAtom

  // 2. Create the TaskAtom object, storing the async function.
  // Optimize: Only initialize essential properties.
  const taskAtom: TaskAtom<T> = {
    _stateAtom: stateAtom,
    _asyncFn: asyncFn, // Store the async function
  };

  // 3. Return the created TaskAtom.
  return taskAtom;
}

// --- Functional API for Task ---

/**
 * Runs the asynchronous function associated with the task.
 * If the task is already running, returns the existing promise.
 * Updates the task's state atom based on the outcome.
 * @param taskAtom The task atom to run.
 * @param args Arguments to pass to the asynchronous function.
 * @returns A promise that resolves with the result or rejects with the error.
 */
export function runTask<T>(taskAtom: TaskAtom<T>, ...args: any[]): Promise<T> {
  const stateAtom = taskAtom._stateAtom;

  // Check if a promise is already running for this task using the WeakMap.
  const existingPromise = runningPromises.get(taskAtom);
  if (existingPromise) {
    // console.log('Task already running, returning existing promise.'); // Optional debug log
    return existingPromise;
  }

  // Define the actual execution logic within an async function.
  const execute = async (): Promise<T> => {
    // Set loading state immediately using functional API. Clear previous error/data.
    setAtomValue(stateAtom, { loading: true, error: undefined, data: undefined });

    // Call the stored async function and store the promise.
    const promise = taskAtom._asyncFn(...args);
    runningPromises.set(taskAtom, promise); // Track this promise using the WeakMap.

    try {
      // Wait for the async function to complete.
      const result = await promise;

      // **Crucially**, only update the state if this *specific* promise instance
      // is still the one tracked in the WeakMap.
      if (runningPromises.get(taskAtom) === promise) {
        // console.log('Task succeeded, updating state.'); // Optional debug log
        setAtomValue(stateAtom, { loading: false, data: result, error: undefined });
        runningPromises.delete(taskAtom); // Clear the running promise tracker.
      } else {
        // console.log('Task succeeded, but a newer run is active. Ignoring result.'); // Optional debug log
      }

      return result; // Return the successful result.
    } catch (error) {
      // Similar check for race conditions on error.
      if (runningPromises.get(taskAtom) === promise) {
        // console.error('Task failed, updating state:', error); // Optional debug log
        // Ensure the error stored is always an Error instance.
        const errorObj = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
        setAtomValue(stateAtom, { loading: false, error: errorObj, data: undefined });
        runningPromises.delete(taskAtom); // Clear the running promise tracker.
      } else {
         // console.error('Task failed, but a newer run is active. Ignoring error.'); // Optional debug log
      }

      throw error; // Re-throw the error so the caller's catch block works.
    }
  };

  // Start the execution and return the promise.
  return execute();
}


/**
 * Gets the current state of a task atom.
 * @param taskAtom The task atom to read from.
 * @returns The current TaskState, or null if the internal atom's value is somehow null (shouldn't happen for task's stateAtom).
 */
export function getTaskState<T>(taskAtom: TaskAtom<T>): TaskState<T> | null {
    // Task's internal state atom should always be initialized and never computed,
    // so getAtomValue should not return null here in practice.
    // However, to satisfy the type checker based on getAtomValue's signature, we allow null.
    return getAtomValue(taskAtom._stateAtom);
}

/**
 * Subscribes to changes in a task atom's state.
 * @param taskAtom The task atom to subscribe to.
 * @param listener The listener function.
 * @returns An unsubscribe function.
 */
export function subscribeToTask<T>(taskAtom: TaskAtom<T>, listener: Listener<TaskState<T>>): Unsubscribe {
    return subscribeToAtom(taskAtom._stateAtom, listener);
}

// Removed temporary UpdatedTaskAtom type and updatedCreateTask function
