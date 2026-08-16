import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Role } from "@courtpot/schemas";
import { Button, SectionTitle, cardClass } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { MenuList } from "../components/MenuList";
import type { MenuEntry } from "../components/MenuList";
import { SwitchTeamButton } from "../components/SwitchTeamButton";
import { useAuth } from "../lib/auth";
import { isRemote } from "../lib/config";
import { useTeam } from "../lib/team";

/** Three doors, each opening onto the two screens that belong together. */
const MENU: readonly MenuEntry[] = [
  { href: "/money", label: "Money", hint: "Balances and settling up", icon: "wallet-outline" },
  { href: "/bookings", label: "Bookings", hint: "Court costs for members and guests", icon: "calendar-outline" },
  { href: "/play", label: "Play", hint: "Match results and pair rankings", icon: "tennisball-outline" },
];

/** The team's home page: every section of the app hangs off these three. */
export default function TeamHomeScreen(): ReactElement {
  const router = useRouter();
  const { activeTeam, teams } = useTeam();
  const { member, logout } = useAuth();
  // Nothing to switch to with one team — but an admin still needs a way into
  // team management, which lives behind the same button.
  const isAdmin = member?.role === Role.Admin || activeTeam?.role === Role.TeamMemberAdmin;
  const showSwitch = isRemote && (teams.length > 1 || isAdmin);

  return (
    <Screen nav>
      <Stack.Screen
        options={{
          title: activeTeam?.name ?? "CourtPot",
          // Home is the root: () => null actually hides the back button, where
          // undefined would fall back to showing the default one.
          headerLeft: () => null,
          headerRight: showSwitch ? () => <SwitchTeamButton /> : undefined,
        }}
      />
      <View className={cardClass}>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {activeTeam === null ? "Offline — this device only" : `You are ${activeTeam.role} on this team`}
        </Text>
      </View>

      <SectionTitle label="Ledger" />
      <MenuList entries={MENU} />

      <SectionTitle label="Team" />
      <Button label="People" variant="ghost" onPress={() => router.push("/people")} />
      {isRemote ? (
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void logout();
          }}
        />
      ) : null}
    </Screen>
  );
}
