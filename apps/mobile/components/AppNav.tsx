import type { ReactElement } from "react";
import { usePathname, useRouter } from "expo-router";
import { NavChips } from "./NavChips";
import type { NavIconName } from "./NavChips";

interface Destination {
  href: string;
  label: string;
  icon: NavIconName;
}

/**
 * Switching team is not here: it belongs on the team home header, where it is
 * shown only to someone who has another team or manages them.
 */
const DESTINATIONS: readonly Destination[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/balances", label: "Balances", icon: "wallet-outline" },
  { href: "/member-bookings", label: "Member bookings", icon: "calendar-outline" },
  { href: "/guest-bookings", label: "Guest bookings", icon: "person-add-outline" },
  { href: "/transfers", label: "Transfers", icon: "swap-horizontal-outline" },
  { href: "/matches", label: "Matches", icon: "tennisball-outline" },
  { href: "/rankings", label: "Rankings", icon: "trophy-outline" },
  { href: "/people", label: "People", icon: "people-outline" },
];

/**
 * One bar on every section screen listing every destination, so any page is one
 * tap from any other. The home menu groups these three-by-two; this bar stays
 * flat, because its whole point is skipping the menu.
 */
export function AppNav(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <NavChips
      chips={DESTINATIONS.map((destination) => ({
        key: destination.href,
        label: destination.label,
        icon: destination.icon,
        active: pathname === destination.href,
        onPress: () => router.navigate(destination.href),
      }))}
    />
  );
}
