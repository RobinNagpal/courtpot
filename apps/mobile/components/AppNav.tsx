import type { ReactElement } from "react";
import { usePathname, useRouter } from "expo-router";
import { Role } from "@courtpot/schemas";
import { useAuth } from "../lib/auth";
import { isRemote } from "../lib/config";
import { useTeam } from "../lib/team";
import { NavChips } from "./NavChips";
import type { NavIconName } from "./NavChips";

interface Destination {
  href: string;
  label: string;
  icon: NavIconName;
}

const DESTINATIONS: readonly Destination[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/balances", label: "Balances", icon: "wallet-outline" },
  { href: "/member-bookings", label: "Member bookings", icon: "calendar-outline" },
  { href: "/guest-bookings", label: "Guest bookings", icon: "person-add-outline" },
  { href: "/transfers", label: "Transfers", icon: "swap-horizontal-outline" },
  { href: "/people", label: "People", icon: "people-outline" },
];

const TEAMS: Destination = { href: "/teams", label: "Teams", icon: "swap-vertical-outline" };

/**
 * One bar on every section screen listing every destination, so any page is one
 * tap from any other — including the member/guest booking cross-links.
 */
export function AppNav(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { teams, activeTeam } = useTeam();
  const { member } = useAuth();

  const isAdmin = member?.role === Role.Admin || activeTeam?.role === Role.TeamMemberAdmin;
  const destinations = isRemote && (teams.length > 1 || isAdmin) ? [...DESTINATIONS, TEAMS] : DESTINATIONS;

  return (
    <NavChips
      chips={destinations.map((destination) => ({
        key: destination.href,
        label: destination.label,
        icon: destination.icon,
        active: pathname === destination.href,
        onPress: () => router.navigate(destination.href),
      }))}
    />
  );
}
