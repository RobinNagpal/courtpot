import type { ReactElement } from "react";
import { Screen } from "../components/Screen";
import { MenuList } from "../components/MenuList";
import type { MenuEntry } from "../components/MenuList";

const ENTRIES: readonly MenuEntry[] = [
  {
    href: "/member-bookings",
    label: "Member bookings",
    hint: "Court costs split between players",
    icon: "calendar-outline",
  },
  {
    href: "/guest-bookings",
    label: "Guest bookings",
    hint: "Guests charged, members credited",
    icon: "person-add-outline",
  },
];

export default function BookingsMenuScreen(): ReactElement {
  return (
    <Screen nav>
      <MenuList entries={ENTRIES} />
    </Screen>
  );
}
