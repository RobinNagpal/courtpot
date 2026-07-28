/**
 * Server mode (username + PIN login, data in Postgres via the REST API)
 * is controlled by EXPO_PUBLIC_API_URL:
 *
 * - set to a URL        → server mode against that API
 * - set to "local"      → force local AsyncStorage mode (no login)
 * - unset in dev        → defaults to the local API on :7071, so `pnpm dev`
 *                         always shows the login gate
 * - unset in production → local mode (a deployed build never guesses a URL)
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
const explicit = fromEnv === undefined || fromEnv === "" ? null : fromEnv;

export const apiUrl: string | null =
  explicit === "local" ? null : (explicit ?? (__DEV__ ? "http://localhost:7071" : null));

export const isRemote: boolean = apiUrl !== null;
