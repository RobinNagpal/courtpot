import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import type { LedgerClient } from "./client";

const LedgerClientContext = createContext<LedgerClient | null>(null);

export function LedgerClientProvider({
  client,
  children,
}: {
  client: LedgerClient;
  children: ReactNode;
}): ReactElement {
  return <LedgerClientContext.Provider value={client}>{children}</LedgerClientContext.Provider>;
}

export function useLedgerClient(): LedgerClient {
  const client = useContext(LedgerClientContext);
  if (client === null) {
    throw new Error("useLedgerClient must be used inside a LedgerClientProvider");
  }
  return client;
}
