import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useBalances, useGuests, useLedgerInput } from "@courtpot/api";
import { countPersonReferences } from "@courtpot/domain";
import { Avatar, BalanceChip, ErrorState, LoadingState } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EditButton } from "../../../components/EditButton";
import { useActiveTeamId } from "../../../lib/team";

/** Read-only detail for one guest. */
export default function GuestViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teamId = useActiveTeamId();
  const guests = useGuests();
  const { input } = useLedgerInput(teamId);
  const { balances } = useBalances(teamId);

  if (guests.isPending) {
    return <LoadingState />;
  }
  if (guests.isError) {
    return <ErrorState message="Could not load the guest." />;
  }

  const guest = guests.data.find((row) => row.id === id);
  if (guest === undefined) {
    return <ErrorState message="Guest not found." />;
  }

  const balance = balances.find((row) => row.personId === guest.id);
  const references = input === null ? null : countPersonReferences(guest.id, input);

  return (
    <Screen>
      <Stack.Screen
        options={{ title: guest.name, headerRight: () => <EditButton href={`/guest/${guest.id}/edit`} /> }}
      />
      <View className="items-center py-2">
        <Avatar name={guest.name} />
      </View>
      <View>
        <Detail label="Name" value={guest.name} />
        <Detail label="Note" value={guest.note ?? "—"} />
        <Detail
          label="Balance"
          value={balance === undefined ? "—" : <BalanceChip owedCents={balance.owedCents} />}
        />
        <Detail
          label="Appears in"
          value={references === null ? "—" : `${references} booking/transfer row${references === 1 ? "" : "s"}`}
        />
      </View>
    </Screen>
  );
}
