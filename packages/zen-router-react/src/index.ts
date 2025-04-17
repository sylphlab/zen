import { useState, useEffect } from 'react';
import { $router, RouterState } from '@sylph/router';
import { subscribe, get } from '@sylph/core';

/**
 * React hook to subscribe to the router state.
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
      // Note: $router is a map store, newState is the full state object
      setState(newState);
    });

    // Initial sync check after mount, in case state changed between initial get() and subscribe()
    const currentState = get($router);
    if (currentState !== state) {
        setState(currentState);
    }


    // Unsubscribe on component unmount
    return unsubscribe;
  }, [state]); // Dependency array includes state to ensure re-sync if needed, though typically subscription handles it.

  return state;
}

// Re-export core types for convenience if needed
export type { RouterState, Params, Search } from '@sylph/router';