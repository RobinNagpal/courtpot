import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  createAuthApi,
  createLocalLedgerClient,
  createPublicTeamApi,
  createRestLedgerClient,
  createTeamsApi,
} from "@courtpot/api";
import type { AuthApi, LedgerClient, PublicTeamApi, RestClientConfig, TeamsApi } from "@courtpot/api";
import { apiUrl } from "./config";
import { tokenRef, unauthorizedHandler } from "./session";

const restConfig: RestClientConfig | null =
  apiUrl === null
    ? null
    : {
        baseUrl: apiUrl,
        getToken: tokenRef.get,
        onUnauthorized: () => unauthorizedHandler.current?.(),
      };

/** Server mode (REST + Postgres) when configured, local AsyncStorage otherwise. */
export const ledgerClient: LedgerClient =
  restConfig === null
    ? createLocalLedgerClient({
        getItem: (key) => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
      })
    : createRestLedgerClient(restConfig);

export const authApi: AuthApi | null = restConfig === null ? null : createAuthApi(restConfig);

export const teamsApi: TeamsApi | null = restConfig === null ? null : createTeamsApi(restConfig);

/** Needs no session — the team PIN is the only credential. */
export const publicTeamApi: PublicTeamApi | null = apiUrl === null ? null : createPublicTeamApi(apiUrl);

/** Persists the TanStack Query cache across app restarts. */
export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage });
