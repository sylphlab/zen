// Task atom implementation for managing asynchronous operations.
// import type { Atom } from './atom'; // Removed unused Atom import
import type { Listener, Unsubscribe, /* AtomWithValue, */ TaskState, TaskAtom } from './types'; // Removed unused AtomWithValue
import { subscribe as subscribeToCoreAtom, notifyListeners } from './atom'; // Import core subscribe AND notifyListeners
// Removed import { notifyListeners } from './internalUtils'; // Import notifyListeners
// Removed createAtom, getAtomValue, setAtomValue, subscribeToAtom imports

// --- Type Definition ---
/**
 * Represents a Task Atom, which wraps an asynchronous function
 * and provides its state (loading, error, data) reactively.
 */
// TaskAtom type is now defined in types.ts


// --- Internal state for tracking running promises ---
// WeakMap to associate TaskAtom instances with their currently running promise.
const runningPromises = new WeakMap<TaskAtom<unknown>, Promise<unknown>>(); // Use unknown

/**
 * Creates a Task Atom to manage the state of an asynchronous operation.
 *
 * @template T The type of the data returned by the async function.
 * @param asyncFn The asynchronous function to execute when `runTask` is called.
 * @returns A TaskAtom instance.
 */
 // Add Args generic parameter matching TaskAtom type
 export function task<T = void, Args extends unknown[] = unknown[]>( // Use unknown[] for Args
   asyncFn: (...args: Args) => Promise<T>
 ): TaskAtom<T, Args> { // Return TaskAtom with Args
   // Create the merged TaskAtom object directly
   const taskAtom: TaskAtom<T, Args> = { // Use TaskAtom with Args
    _kind: 'task',
    _value: { loading: false }, // Initial TaskState
    _asyncFn: asyncFn,
    // Listener properties (_listeners, etc.) are initially undefined
  };
  // No need for STORE_MAP_KEY_SET marker for task atoms
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
// Add Args generic parameter matching TaskAtom type
export function runTask<T, Args extends unknown[]>(taskAtom: TaskAtom<T, Args>, ...args: Args): Promise<T> { // Use unknown[] for Args
  // Operate directly on taskAtom
  // const stateAtom = taskAtom._stateAtom; // Removed

  // Check if a promise is already running for this task using the WeakMap.
  // Cast taskAtom for WeakMap key compatibility
    const existingPromise = runningPromises.get(taskAtom as TaskAtom<unknown>); // Cast to unknown
  if (existingPromise) {
    // console.log('Task already running, returning existing promise.'); // Optional debug log
        // Cast existing promise back to Promise<T> for return type compatibility
        return existingPromise as Promise<T>;
  }

  // Define the actual execution logic within an async function.
  const execute = async (): Promise<T> => {
    // Set loading state immediately. Clear previous error/data.
    const oldState = taskAtom._value;
    taskAtom._value = { loading: true, error: undefined, data: undefined };
    // Notify listeners directly attached to TaskAtom, add 'as any'
    notifyListeners(taskAtom as any, taskAtom._value, oldState);

    // Call the stored async function and store the promise.
    const promise = taskAtom._asyncFn(...args);
    // Cast taskAtom for WeakMap key compatibility
        runningPromises.set(taskAtom as TaskAtom<unknown>, promise); // Cast to unknown

    try {
      // Wait for the async function to complete.
      const result = await promise;

      // **Crucially**, only update the state if this *specific* promise instance
      // is still the one tracked in the WeakMap.
      // Cast taskAtom for WeakMap key compatibility
            if (runningPromises.get(taskAtom as TaskAtom<unknown>) === promise) { // Cast to unknown
        // console.log('Task succeeded, updating state.'); // Optional debug log
        const oldStateSuccess = taskAtom._value;
        taskAtom._value = { loading: false, data: result, error: undefined };
        // Notify listeners directly attached to TaskAtom, add 'as any'
        notifyListeners(taskAtom as any, taskAtom._value, oldStateSuccess);
        // Cast taskAtom for WeakMap key compatibility
                runningPromises.delete(taskAtom as TaskAtom<unknown>); // Cast to unknown
      } else {
        // console.log('Task succeeded, but a newer run is active. Ignoring result.'); // Optional debug log
      }

      return result; // Return the successful result.
    } catch (error) {
      // Similar check for race conditions on error.
      // Cast taskAtom for WeakMap key compatibility
            if (runningPromises.get(taskAtom as TaskAtom<unknown>) === promise) { // Cast to unknown
        // console.error('Task failed, updating state:', error); // Optional debug log
        // Ensure the error stored is always an Error instance.
        const errorObj = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
        const oldStateError = taskAtom._value;
        taskAtom._value = { loading: false, error: errorObj, data: undefined };
        // Notify listeners directly attached to TaskAtom, add 'as any'
        notifyListeners(taskAtom as any, taskAtom._value, oldStateError);
        // Cast taskAtom for WeakMap key compatibility
                runningPromises.delete(taskAtom as TaskAtom<unknown>); // Cast to unknown
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
 * @returns The current TaskState.
 */
export function getTaskState<T>(taskAtom: TaskAtom<T>): TaskState<T> {
    // TaskAtom now directly holds the TaskState value
    return taskAtom._value;
}

/**
 * Subscribes to changes in a task atom's state.
 * @param taskAtom The task atom to subscribe to.
 * @param listener The listener function.
 * @returns An unsubscribe function.
 */
export function subscribeToTask<T>(taskAtom: TaskAtom<T>, listener: Listener<TaskState<T>>): Unsubscribe {
    // Subscribe directly to the TaskAtom using the core subscribe function, add 'as any' to both args
    return subscribeToCoreAtom(taskAtom as any, listener as any);
}

// Removed temporary UpdatedTaskAtom type and updatedCreateTask function