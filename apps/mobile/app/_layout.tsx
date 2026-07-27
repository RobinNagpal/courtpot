import "../global.css";
import type { ReactElement, ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { LedgerClientProvider, createLedgerQueryClient } from "@courtpot/api";
import { LoadingState } from "@courtpot/ui";
import { AuthProvider, useAuth } from "../lib/auth";
import { isRemote } from "../lib/config";
import { ledgerClient, queryPersister } from "../lib/storage";
import { LoginScreen } from "../components/LoginScreen";

const queryClient = createLedgerQueryClient();

function AuthGate({ children }: { children: ReactNode }): ReactElement {
  const { ready, signedIn } = useAuth();
  if (!isRemote) {
    return <>{children}</>;
  }
  if (!ready) {
    return <LoadingState />;
  }
  if (!signedIn) {
    return <LoginScreen />;
  }
  return <>{children}</>;
}

export default function RootLayout(): ReactElement {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <LedgerClientProvider client={ledgerClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="booking/member/new" options={{ presentation: "modal", title: "New member booking" }} />
              <Stack.Screen name="booking/guest/new" options={{ presentation: "modal", title: "New guest booking" }} />
              <Stack.Screen name="booking/[id]" options={{ title: "Edit booking" }} />
              <Stack.Screen name="transfer/new" options={{ presentation: "modal", title: "Record transfer" }} />
              <Stack.Screen name="settle-up" options={{ presentation: "modal", title: "Settle up" }} />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </LedgerClientProvider>
    </PersistQueryClientProvider>
  );
}
