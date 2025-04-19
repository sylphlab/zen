import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { get, subscribe, type Atom } from '@sylphlab/zen-core';

/**
 * Subscribes to a Zen store and returns its value as a reactive Vue ref.
 *
 * @template Value The type of the store's value.
 * @param store The Zen store to subscribe to.
 * @returns A reactive Vue ref containing the store's current value.
 */
export function useStore<Value>(store: Atom<Value>): Ref<Value> {
  // Get the initial value synchronously
  const initialValue = get(store);
  // Create a reactive ref with the initial value
  const state = ref<Value>(initialValue) as Ref<Value>; // Cast needed for initial value type

  let unsubscribe: (() => void) | undefined;

  // Use onMounted to ensure subscription happens client-side
  // and after the component is mounted.
  onMounted(() => {
    // Subscribe to store changes
    unsubscribe = subscribe(store, (newValue: Value) => {
      // Update the ref's value when the store changes
      state.value = newValue;
    });
  });

  // Use onUnmounted to clean up the subscription when the component unmounts
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return state;
}