import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTransfers } from "@courtpot/api";
import { Avatar, ErrorState, LoadingState, formatCents } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EditButton } from "../../../components/EditButton";
import { usePersonNames } from "../../../lib/people";

/** Read-only detail for one transfer. */
export default function TransferViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transfers = useTransfers();
  const names = usePersonNames();

  if (transfers.isPending) {
    return <LoadingState />;
  }
  if (transfers.isError) {
    return <ErrorState message="Could not load the transfer." />;
  }

  const transfer = transfers.data.find((row) => row.id === id);
  if (transfer === undefined) {
    return <ErrorState message="Transfer not found." />;
  }

  const from = names.get(transfer.fromId) ?? "?";
  const to = names.get(transfer.toId) ?? "?";

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Transfer",
          headerRight: () => <EditButton href={`/transfer/${transfer.id}/edit`} />,
        }}
      />
      <View>
        <Detail label="Amount" value={formatCents(transfer.amount)} />
        <Detail label="Date" value={transfer.date} />
        <Detail label="From" value={<Person name={from} />} />
        <Detail label="To" value={<Person name={to} />} />
        <Detail label="Note" value={transfer.note ?? "—"} />
      </View>
    </Screen>
  );
}

function Person({ name }: { name: string }): ReactElement {
  return (
    <View className="flex-row items-center gap-2">
      <Avatar name={name} />
      <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</Text>
    </View>
  );
}
