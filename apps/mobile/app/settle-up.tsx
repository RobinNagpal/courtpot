import { useMemo } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useBalances, useLogSettlements } from "@courtpot/api";
import { suggestSettlements } from "@courtpot/domain";
import type { TransferT } from "@courtpot/schemas";
import { Button, EmptyState, ErrorState, ListItem, LoadingState, formatCents } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { newId } from "../lib/id";
import { useActiveTeamId } from "../lib/team";
import { todayIsoDate } from "../lib/date";
import { usePersonNames } from "../lib/people";

export default function SettleUpScreen(): ReactElement {
  const teamId = useActiveTeamId();
  const router = useRouter();
  const { balances, isPending, isError } = useBalances(teamId);
  const names = usePersonNames();
  const logSettlements = useLogSettlements();

  const settlements = useMemo(() => suggestSettlements(balances), [balances]);

  if (isPending) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load balances." />;
  }
  if (settlements.length === 0) {
    return <EmptyState message="Everyone is settled — nothing to log." />;
  }

  const handleLogAll = (): void => {
    const date = todayIsoDate();
    const transfers: TransferT[] = settlements.map((settlement) => ({
      id: newId(),
      teamId,
      date,
      fromId: settlement.fromId,
      toId: settlement.toId,
      amount: settlement.amountCents,
      note: "Settle up",
    }));
    logSettlements.mutate(transfers, { onSuccess: () => router.back() });
  };

  return (
    <Screen>
      <View>
        {settlements.map((settlement) => (
          <ListItem
            key={`${settlement.fromId}-${settlement.toId}`}
            title={`${names.get(settlement.fromId) ?? "?"} → ${names.get(settlement.toId) ?? "?"}`}
            subtitle={formatCents(settlement.amountCents)}
          />
        ))}
      </View>
      <Button label="Log all as transfers" onPress={handleLogAll} disabled={logSettlements.isPending} />
    </Screen>
  );
}
