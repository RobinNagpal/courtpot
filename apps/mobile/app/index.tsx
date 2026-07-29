import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Role } from "@courtpot/schemas";
import { Button, SectionTitle, cardClass } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { isRemote } from "../lib/config";
import { useTeam } from "../lib/team";

type IconName = keyof typeof Ionicons.glyphMap;

const sections: { href: string; label: string; hint: string; icon: IconName }[] = [
  { href: "/balances", label: "Balances", hint: "Who owes what", icon: "wallet-outline" },
  { href: "/member-bookings", label: "Member Bookings", hint: "Court costs split between players", icon: "calendar-outline" },
  { href: "/guest-bookings", label: "Guest Bookings", hint: "Guests charged, members credited", icon: "person-add-outline" },
  { href: "/transfers", label: "Transfers", hint: "Money actually paid back", icon: "swap-horizontal-outline" },
];

/** The team's home page: every section of the ledger hangs off here. */
export default function TeamHomeScreen(): ReactElement {
  const router = useRouter();
  const { activeTeam, teams } = useTeam();
  const { member, logout } = useAuth();
  const isAdmin = member?.role === Role.Admin || activeTeam?.role === Role.TeamMemberAdmin;
  const showTeams = isRemote && (teams.length > 1 || isAdmin);

  return (
    <Screen>
      <View className={cardClass}>
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {activeTeam?.name ?? "CourtPot"}
        </Text>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {activeTeam === null ? "Offline — this device only" : activeTeam.role}
        </Text>
      </View>

      <SectionTitle label="Ledger" />
      <View className="gap-2">
        {sections.map((section) => (
          <Pressable
            key={section.href}
            onPress={() => router.push(section.href)}
            className="flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <Ionicons name={section.icon} size={22} color="#64748b" />
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{section.label}</Text>
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">{section.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>
        ))}
      </View>

      <SectionTitle label="Team" />
      <Button label="People" variant="ghost" onPress={() => router.push("/people")} />
      {/* Only useful to someone with a choice to make, or an admin who manages teams. */}
      {showTeams ? <Button label="Teams" variant="ghost" onPress={() => router.push("/teams")} /> : null}
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
