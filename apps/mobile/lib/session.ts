/**
 * Mutable session token shared between the REST client (which reads it on
 * every request) and the AuthProvider (which sets it on login/logout).
 */
let currentToken: string | null = null;

export const tokenRef = {
  get: (): string | null => currentToken,
  set: (token: string | null): void => {
    currentToken = token;
  },
};

/** Set by AuthProvider so the REST client can force a logout on 401. */
export const unauthorizedHandler: { current: (() => void) | null } = { current: null };
