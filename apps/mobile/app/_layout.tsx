import "../global.css";
import type { ReactElement, ReactNode } from "react";
import { Stack, usePathname } from "expo-router";
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

/** The public team page lives outside the login gate. */
const PUBLIC_PREFIX = "/t/";

function AuthGate({ children }: { children: ReactNode }): ReactElement {
  const { ready, signedIn } = useAuth();
  const pathname = usePathname();
  if (!isRemote || pathname.startsWith(PUBLIC_PREFIX)) {
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
                <Stack.Screen name="balances" options={{ title: "Balances" }} />
                <Stack.Screen name="member-bookings" options={{ title: "Member Bookings" }} />
                <Stack.Screen name="guest-bookings" options={{ title: "Guest Bookings" }} />
                <Stack.Screen name="transfers" options={{ title: "Transfers" }} />
                <Stack.Screen name="matches" options={{ title: "Matches" }} />
                <Stack.Screen name="rankings" options={{ title: "Rankings" }} />
                <Stack.Screen name="money" options={{ title: "Money" }} />
                <Stack.Screen name="bookings" options={{ title: "Bookings" }} />
                <Stack.Screen name="play" options={{ title: "Play" }} />
                <Stack.Screen name="people" options={{ title: "People" }} />
                <Stack.Screen name="teams" options={{ title: "Switch team" }} />
                {/* Public: no home button, since the viewer has no team home. */}
                <Stack.Screen name="t/[team]" options={{ title: "Team", headerLeft: undefined }} />
                <Stack.Screen name="booking/member/new" options={{ presentation: "modal", title: "New member booking" }} />
                <Stack.Screen name="booking/guest/new" options={{ presentation: "modal", title: "New guest booking" }} />
                <Stack.Screen name="booking/[id]/index" options={{ title: "Booking" }} />
                <Stack.Screen name="booking/[id]/edit" options={{ title: "Edit booking" }} />
                <Stack.Screen name="transfer/[id]/index" options={{ title: "Transfer" }} />
                <Stack.Screen name="transfer/[id]/edit" options={{ title: "Edit transfer" }} />
                <Stack.Screen name="member/[id]/index" options={{ title: "Member" }} />
                <Stack.Screen name="member/[id]/edit" options={{ title: "Edit member" }} />
                <Stack.Screen name="guest/[id]/index" options={{ title: "Guest" }} />
                <Stack.Screen name="guest/[id]/edit" options={{ title: "Edit guest" }} />
                <Stack.Screen name="team/[id]/index" options={{ title: "Team" }} />
                <Stack.Screen name="team/[id]/edit" options={{ title: "Edit team" }} />
                <Stack.Screen name="transfer/new" options={{ presentation: "modal", title: "Record transfer" }} />
                <Stack.Screen name="match/new" options={{ presentation: "modal", title: "Record match" }} />
                <Stack.Screen name="match/[id]/index" options={{ title: "Match" }} />
                <Stack.Screen name="match/[id]/edit" options={{ title: "Edit match" }} />
              </Stack>
            </AuthGate>
          </TeamProvider>
        </AuthProvider>
      </LedgerClientProvider>
    </PersistQueryClientProvider>
  );
}
