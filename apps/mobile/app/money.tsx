import type { ReactElement } from "react";
import { Screen } from "../components/Screen";
import { MenuList } from "../components/MenuList";
import type { MenuEntry } from "../components/MenuList";

const ENTRIES: readonly MenuEntry[] = [
  { href: "/balances", label: "Balances", hint: "Who owes what", icon: "wallet-outline" },
  { href: "/transfers", label: "Transfers", hint: "Money actually paid back", icon: "swap-horizontal-outline" },
];

export default function MoneyMenuScreen(): ReactElement {
  return (
    <Screen nav>
      <MenuList entries={ENTRIES} />
    </Screen>
  );
}
