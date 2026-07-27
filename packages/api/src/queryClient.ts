import { QueryClient } from "@tanstack/react-query";

const ONE_MINUTE = 60 * 1000;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Query client tuned for offline-first use: the data-access client is
 * local, so queries and mutations run regardless of connectivity
 * (networkMode "always"), and gcTime is long enough for cache persistence.
 */
export function createLedgerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: "always",
        staleTime: ONE_MINUTE,
        gcTime: ONE_WEEK,
        retry: 1,
      },
      mutations: {
        networkMode: "always",
        retry: 1,
      },
    },
  });
}
