import { useState, useEffect } from 'preact/hooks'; // Import hooks from preact
import { $router, RouterState } from '@sylph/router';
import { subscribe, get } from '@sylph/core';

/**
 * Preact hook to subscribe to the router state.
 *
 * Returns the current router state object ({ path, params, search }).
 * The component will re-render when the router state changes.
 *
 * @returns The current router state.
 */
export function useRouter(): RouterState {
  // Get the initial state synchronously
  const [state, setState] = useState<RouterState>(get($router));

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = subscribe($router, (newState: RouterState) => {
      // Update state on change
      setState(newState);
    });

    // Initial sync check after mount, in case state changed between initial get() and subscribe()
    const currentState = get($router);
    if (currentState !== state) {
        setState(currentState);
    }

    // Unsubscribe on component unmount
    return unsubscribe;
  }, [state]); // Dependency array includes state to ensure re-sync if needed

  return state;
}

// Re-export core types for convenience
export type { RouterState, Params, Search } from '@sylph/router';