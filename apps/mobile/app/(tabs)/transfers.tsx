import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTransferMutations, useTransfers } from "@courtpot/api";
import type { TransferT } from "@courtpot/schemas";
import { Button, EmptyState, ErrorState, ListItem, LoadingState, confirmAsync, formatCents } from "@courtpot/ui";
import { Screen } from "../../components/Screen";
import { usePersonNames } from "../../lib/people";

export default function TransfersScreen(): ReactElement {
  const router = useRouter();
  const transfers = useTransfers();
  const { remove } = useTransferMutations();
  const names = usePersonNames();

  if (transfers.isPending) {
    return <LoadingState />;
  }
  if (transfers.isError) {
    return <ErrorState message="Could not load transfers." />;
  }

  const rows = [...transfers.data].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const handleDelete = async (transfer: TransferT): Promise<void> => {
    const from = names.get(transfer.fromId) ?? "?";
    const to = names.get(transfer.toId) ?? "?";
    const confirmed = await confirmAsync(
      "Delete transfer?",
      `${from} → ${to}: ${formatCents(transfer.amount)} on ${transfer.date}`,
    );
    if (confirmed) {
      remove.mutate(transfer.id);
    }
  };

  return (
    <Screen>
      <Button label="+ Record transfer" onPress={() => router.push("/transfer/new")} />
      {rows.length === 0 ? (
        <EmptyState message="No transfers yet. Record one when someone pays someone back." />
      ) : (
        <View>
          {rows.map((transfer) => (
            <ListItem
              key={transfer.id}
              title={`${names.get(transfer.fromId) ?? "?"} → ${names.get(transfer.toId) ?? "?"}: ${formatCents(transfer.amount)}`}
              subtitle={`${transfer.date}${transfer.note === undefined ? "" : ` · ${transfer.note}`} · tap to delete`}
              onPress={() => {
                void handleDelete(transfer);
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
