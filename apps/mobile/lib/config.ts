/**
 * When EXPO_PUBLIC_API_URL is set the app runs in server mode: username +
 * PIN login, data in Postgres via the REST API. When unset it runs fully
 * local (AsyncStorage), as before.
 */
export const apiUrl: string | null = process.env.EXPO_PUBLIC_API_URL ?? null;

export const isRemote: boolean = apiUrl !== null;
