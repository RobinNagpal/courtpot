import type { ReactElement } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Role } from "@courtpot/schemas";
import { useAuth } from "../lib/auth";
import { isRemote } from "../lib/config";
import { useTeam } from "../lib/team";

type IconName = keyof typeof Ionicons.glyphMap;

interface Destination {
  href: string;
  label: string;
  icon: IconName;
}

const DESTINATIONS: readonly Destination[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/balances", label: "Balances", icon: "wallet-outline" },
  { href: "/member-bookings", label: "Members", icon: "calendar-outline" },
  { href: "/guest-bookings", label: "Guests", icon: "person-add-outline" },
  { href: "/transfers", label: "Transfers", icon: "swap-horizontal-outline" },
  { href: "/people", label: "People", icon: "people-outline" },
];

const TEAMS: Destination = { href: "/teams", label: "Teams", icon: "swap-vertical-outline" };

/**
 * One bar on every section screen listing every destination, so any page is one
 * tap from any other — including the member/guest booking cross-links. Scrolls
 * horizontally rather than wrapping, so it never steals vertical space.
 */
export function AppNav(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { teams, activeTeam } = useTeam();
  const { member } = useAuth();

  const isAdmin = member?.role === Role.Admin || activeTeam?.role === Role.TeamMemberAdmin;
  const destinations = isRemote && (teams.length > 1 || isAdmin) ? [...DESTINATIONS, TEAMS] : DESTINATIONS;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pb-1"
      className="-mx-1 shrink-0 grow-0 px-1"
    >
      {destinations.map((destination) => {
        const current = pathname === destination.href;
        return (
          <Pressable
            key={destination.href}
            onPress={() => router.navigate(destination.href)}
            disabled={current}
            accessibilityRole="button"
            accessibilityLabel={destination.label}
            accessibilityState={{ selected: current }}
            className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${
              current ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            <Ionicons
              name={destination.icon}
              size={15}
              color={current ? "#f8fafc" : "#475569"}
            />
            <Text
              className={`text-sm font-semibold ${
                current ? "text-neutral-50 dark:text-neutral-900" : "text-neutral-700 dark:text-neutral-200"
              }`}
            >
              {destination.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
