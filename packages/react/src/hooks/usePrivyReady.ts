import { useEffect, useState } from 'react';
import { privyStateManager } from '../providers/PrivyStateManager';
import type { PrivyState } from '../types';

/**
 * Hook to read Privy state.
 *
 * Returns the current Privy state and triggers re-renders when it changes.
 * Works without Context by using a singleton state manager.
 *
 * @returns {PrivyState} Current Privy state (ready)
 */
export const usePrivyReady = (): PrivyState => {
  const [state, setState] = useState<PrivyState>(() =>
    privyStateManager.getState(),
  );

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = privyStateManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
  };
};
