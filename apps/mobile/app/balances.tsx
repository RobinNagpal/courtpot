import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useBalances } from "@courtpot/api";
import type { BalanceT } from "@courtpot/schemas";
import {
  BalanceChip,
  EmptyState,
  ErrorState,
  ListItem,
  LoadingState,
  SectionTitle,
  cardClass,
  formatCents,
} from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { useActiveTeamId } from "../lib/team";

function BalanceRows({ balances }: { balances: readonly BalanceT[] }): ReactElement {
  return (
    <View>
      {balances.map((balance) => (
        <ListItem key={balance.personId} title={balance.name} right={<BalanceChip owedCents={balance.owedCents} />} />
      ))}
    </View>
  );
}

export default function BalancesScreen(): ReactElement {
  const teamId = useActiveTeamId();
  // Scoped to the active team — the ledger belongs to one team.
  const { balances, isPending, isError } = useBalances(teamId);

  if (isPending) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load balances." />;
  }

  const members = balances.filter((b) => b.kind === "member");
  const guests = balances.filter((b) => b.kind === "guest");
  const totalOutstanding = balances.filter((b) => b.owedCents > 0).reduce((sum, b) => sum + b.owedCents, 0);
  const guestOwing = guests.filter((b) => b.owedCents > 0).reduce((sum, b) => sum + b.owedCents, 0);

  return (
    <Screen>
      <View className={cardClass}>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {`Outstanding ${formatCents(totalOutstanding)} · guests owe ${formatCents(guestOwing)}`}
        </Text>
      </View>

      {balances.length === 0 ? (
        <EmptyState message="No people yet. Add members and guests from the team page." />
      ) : (
        <>
          <SectionTitle label="Members" />
          <BalanceRows balances={members} />
          <SectionTitle label="Guests" />
          {guests.length === 0 ? <EmptyState message="No guests yet." /> : <BalanceRows balances={guests} />}
        </>
      )}

    </Screen>
  );
}
