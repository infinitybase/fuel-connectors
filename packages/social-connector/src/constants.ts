export const APP_NAME = 'Social Connector';
export const APP_DESCRIPTION =
  'Social login via Dynamic (Google/Email) with Bako predicates integration';

export const DEFAULT_POPUP = {
  width: 500,
  height: 650,
};

export const EVENTS = {
  AUTH_STATE_CHANGED: 'authStateChanged',
  SESSION_EXPIRED: 'sessionExpired',
} as const;

export const WINDOW: Window & typeof globalThis = globalThis.window as Window &
  typeof globalThis;
