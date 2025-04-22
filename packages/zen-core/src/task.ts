// Task zen implementation for managing asynchronous operations.
// import type { Zen } from './zen'; // Removed unused Zen import
import type {
  AnyZen,
  Listener,
  TaskState,
  TaskZen,
  Unsubscribe /* ZenWithValue, */,
} from './types'; // Removed unused ZenWithValue, Add AnyZen, Remove unused ZenValue
import { notifyListeners, subscribe as subscribeToCoreZen } from './zen'; // Import core subscribe AND notifyListeners
// Removed import { notifyListeners } from './internalUtils'; // Import notifyListeners
// Removed createZen, getZenValue, setZenValue, subscribeToZen imports

// --- Type Definition ---
/**
 * Represents a Task Zen, which wraps an asynchronous function
 * and provides its state (loading, error, data) reactively.
 */
// TaskZen type is now defined in types.ts

// --- Internal state for tracking running promises ---
// WeakMap to associate TaskZen instances with their currently running promise.
const runningPromises = new WeakMap<TaskZen<unknown>, Promise<unknown>>(); // Use unknown

/**
 * Creates a Task Zen to manage the state of an asynchronous operation.
 *
 * @template T The type of the data returned by the async function.
 * @param asyncFn The asynchronous function to execute when `runTask` is called.
 * @returns A TaskZen instance.
 */
// Add Args generic parameter matching TaskZen type
export function task<T = void, Args extends unknown[] = unknown[]>(
  // Use unknown[] for Args
  asyncFn: (...args: Args) => Promise<T>,
): TaskZen<T, Args> {
  // Return TaskZen with Args
  // Create the merged TaskZen object directly
  const taskZen: TaskZen<T, Args> = {
    // Use TaskZen with Args
    _kind: 'task',
    _value: { loading: false }, // Initial TaskState
    _asyncFn: asyncFn,
    // Listener properties (_listeners, etc.) are initially undefined
  };
  // No need for STORE_MAP_KEY_SET marker for task zens
  return taskZen;
}

// --- Functional API for Task ---

/**
 * Runs the asynchronous function associated with the task.
 * If the task is already running, returns the existing promise.
 * Updates the task's state zen based on the outcome.
 * @param taskZen The task zen to run.
 * @param args Arguments to pass to the asynchronous function.
 * @returns A promise that resolves with the result or rejects with the error.
 */
// Add Args generic parameter matching TaskZen type
export function runTask<T, Args extends unknown[]>(
  taskZen: TaskZen<T, Args>,
  ...args: Args
): Promise<T> {
  // Use unknown[] for Args
  // Operate directly on taskZen
  // const stateZen = taskZen._stateZen; // Removed

  // Check if a promise is already running for this task using the WeakMap.
  // Cast taskZen for WeakMap key compatibility
  const existingPromise = runningPromises.get(taskZen as TaskZen<unknown>); // Cast to unknown
  if (existingPromise) {
    // console.log('Task already running, returning existing promise.'); // Optional debug log
    // Cast existing promise back to Promise<T> for return type compatibility
    return existingPromise as Promise<T>;
  }

  // Define the actual execution logic within an async function.
  const execute = async (): Promise<T> => {
    // Set loading state immediately. Clear previous error/data.
    const oldState = taskZen._value;
    taskZen._value = { loading: true, error: undefined, data: undefined };
    // Notify listeners directly attached to TaskZen, cast to AnyZen.
    notifyListeners(taskZen as AnyZen, taskZen._value, oldState);

    // Call the stored async function and store the promise.
    const promise = taskZen._asyncFn(...args);
    // Cast taskZen for WeakMap key compatibility
    runningPromises.set(taskZen as TaskZen<unknown>, promise); // Cast to unknown

    try {
      // Wait for the async function to complete.
      const result = await promise;

      // **Crucially**, only update the state if this *specific* promise instance
      // is still the one tracked in the WeakMap.
      // Cast taskZen for WeakMap key compatibility
      if (runningPromises.get(taskZen as TaskZen<unknown>) === promise) {
        // Cast to unknown
        // console.log('Task succeeded, updating state.'); // Optional debug log
        const oldStateSuccess = taskZen._value;
        taskZen._value = { loading: false, data: result, error: undefined };
        // Notify listeners directly attached to TaskZen, cast to AnyZen.
        notifyListeners(taskZen as AnyZen, taskZen._value, oldStateSuccess);
        // Cast taskZen for WeakMap key compatibility
        runningPromises.delete(taskZen as TaskZen<unknown>); // Cast to unknown
      } else {
        // console.log('Task succeeded, but a newer run is active. Ignoring result.'); // Optional debug log
      }

      return result; // Return the successful result.
    } catch (error) {
      // Similar check for race conditions on error.
      // Cast taskZen for WeakMap key compatibility
      if (runningPromises.get(taskZen as TaskZen<unknown>) === promise) {
        // Cast to unknown
        // console.error('Task failed, updating state:', error); // Optional debug log
        // Ensure the error stored is always an Error instance.
        const errorObj =
          error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
        const oldStateError = taskZen._value;
        taskZen._value = { loading: false, error: errorObj, data: undefined };
        // Notify listeners directly attached to TaskZen, cast to AnyZen.
        notifyListeners(taskZen as AnyZen, taskZen._value, oldStateError);
        // Cast taskZen for WeakMap key compatibility
        runningPromises.delete(taskZen as TaskZen<unknown>); // Cast to unknown
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
 * Gets the current state of a task zen.
 * @param taskZen The task zen to read from.
 * @returns The current TaskState.
 */
export function getTaskState<T, Args extends unknown[]>(taskZen: TaskZen<T, Args>): TaskState<T> {
  // TaskZen now directly holds the TaskState value
  return taskZen._value;
}

/**
 * Subscribes to changes in a task zen's state.
 * @param taskZen The task zen to subscribe to.
 * @param listener The listener function.
 * @returns An unsubscribe function.
 */
export function subscribeToTask<T, Args extends unknown[]>(
  taskZen: TaskZen<T, Args>,
  listener: Listener<TaskState<T>>,
): Unsubscribe {
  // Subscribe directly to the TaskZen using the core subscribe function.
  // Cast taskZen to AnyZen and listener to any to satisfy the generic signature.
  // biome-ignore lint/suspicious/noExplicitAny: Listener type requires any due to complex generic resolution
  return subscribeToCoreZen(taskZen as AnyZen, listener as any);
}

// Removed temporary UpdatedTaskZen type and updatedCreateTask function
