import { DYNAMIC_KEYS, HAS_WINDOW } from '../constants';

/**
 * Verify that the Dynamic session key is saved in local storage.
 *
 * @returns true if it has the key, false otherwise.
 */
export function checkClientSessionKey(): boolean {
  return Boolean(
    HAS_WINDOW && window.localStorage.getItem(DYNAMIC_KEYS.CLIENT_SESSION),
  );
}
