import type { PrivyState, PrivyStateChangeListener } from '../types';

/**
 * Privy Auth State Manager - Singleton
 *
 * Manages Privy authentication state (ready) without React.
 * This allows other parts of the app to check Privy state without coupling to Privy directly.
 *
 * Architecture:
 * - PrivyEventsWatcher injects state updates
 * - usePrivyReady() hook reads the state and subscribes to changes
 */
class PrivyStateManager {
  private state: PrivyState = {
    ready: false,
  };

  private listeners: Set<PrivyStateChangeListener> = new Set();

  /**
   * Update the Privy state.
   * Called by PrivyEventsWatcher when the observer emits events.
   */
  updateState(updates: Partial<PrivyState>): void {
    const newState = { ...this.state, ...updates };

    if (newState.ready !== this.state.ready) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  /**
   * Get current state snapshot.
   */
  getState(): PrivyState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes.
   * Returns unsubscribe function.
   */
  subscribe(listener: PrivyStateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change.
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }
}

const privyStateManager = new PrivyStateManager();

export { privyStateManager };
