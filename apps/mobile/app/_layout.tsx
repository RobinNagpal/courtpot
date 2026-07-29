import "../global.css";
import type { ReactElement, ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { LedgerClientProvider, createLedgerQueryClient } from "@courtpot/api";
import { LoadingState } from "@courtpot/ui";
import { AuthProvider, useAuth } from "../lib/auth";
import { TeamProvider, useTeam } from "../lib/team";
import { isRemote } from "../lib/config";
import { ledgerClient, queryPersister } from "../lib/storage";
import { LoginScreen } from "../components/LoginScreen";
import { TeamPickerScreen } from "../components/TeamPickerScreen";
import { HomeButton } from "../components/HomeButton";

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
  return <TeamGate>{children}</TeamGate>;
}

/**
 * One team goes straight through; several means picking one first. The picker is
 * also reachable later from the team page, so the choice is not permanent.
 */
function TeamGate({ children }: { children: ReactNode }): ReactElement {
  const { ready, needsChoice } = useTeam();
  if (!ready) {
    return <LoadingState />;
  }
  if (needsChoice) {
    return <TeamPickerScreen />;
  }
  return <>{children}</>;
}

export default function RootLayout(): ReactElement {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <LedgerClientProvider client={ledgerClient}>
        <AuthProvider>
          <TeamProvider>
            <StatusBar style="auto" />
            <AuthGate>
              {/* Every section screen gets a home button back to the team page. */}
              <Stack screenOptions={{ headerLeft: () => <HomeButton /> }}>
                <Stack.Screen name="index" options={{ title: "Team", headerLeft: undefined }} />
                <Stack.Screen name="balances" options={{ title: "Balances" }} />
                <Stack.Screen name="member-bookings" options={{ title: "Member Bookings" }} />
                <Stack.Screen name="guest-bookings" options={{ title: "Guest Bookings" }} />
                <Stack.Screen name="transfers" options={{ title: "Transfers" }} />
                <Stack.Screen name="people" options={{ title: "People" }} />
                <Stack.Screen name="teams" options={{ title: "Switch team" }} />
                <Stack.Screen name="booking/member/new" options={{ presentation: "modal", title: "New member booking" }} />
                <Stack.Screen name="booking/guest/new" options={{ presentation: "modal", title: "New guest booking" }} />
                <Stack.Screen name="booking/[id]" options={{ title: "Edit booking" }} />
                <Stack.Screen name="transfer/new" options={{ presentation: "modal", title: "Record transfer" }} />
              </Stack>
            </AuthGate>
          </TeamProvider>
        </AuthProvider>
      </LedgerClientProvider>
    </PersistQueryClientProvider>
  );
}
