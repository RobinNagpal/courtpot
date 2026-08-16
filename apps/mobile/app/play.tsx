import type { ReactElement } from "react";
import { Screen } from "../components/Screen";
import { MenuList } from "../components/MenuList";
import type { MenuEntry } from "../components/MenuList";

const ENTRIES: readonly MenuEntry[] = [
  { href: "/matches", label: "Matches", hint: "Record who played and the score", icon: "tennisball-outline" },
  { href: "/rankings", label: "Rankings", hint: "Every pair's wins and losses", icon: "trophy-outline" },
];

export default function PlayMenuScreen(): ReactElement {
  return (
    <Screen nav>
      <MenuList entries={ENTRIES} />
    </Screen>
  );
}
