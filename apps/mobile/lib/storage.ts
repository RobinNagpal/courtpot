import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createLocalLedgerClient } from "@courtpot/api";
import type { LedgerClient } from "@courtpot/api";

/** Local persistence for the five raw collections. */
export const ledgerClient: LedgerClient = createLocalLedgerClient({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
});

/** Persists the TanStack Query cache across app restarts. */
export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage });
