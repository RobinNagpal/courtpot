import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTransferMutations, useTransfers } from "@courtpot/api";
import { Button, EmptyState, ErrorState, ListItem, LoadingState, formatCents } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { RowMenu } from "../components/RowMenu";
import { usePersonNames } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function TransfersScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const transfers = useTransfers();
  const { remove } = useTransferMutations();
  const names = usePersonNames();

  if (transfers.isPending) {
    return <LoadingState />;
  }
  if (transfers.isError) {
    return <ErrorState message="Could not load transfers." />;
  }

  const rows = transfers.data.filter((t) => t.teamId === teamId).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));


  return (
    <Screen nav>
      <Button label="+ Record transfer" onPress={() => router.push("/transfer/new")} />
      {rows.length === 0 ? (
        <EmptyState message="No transfers yet. Record one when someone pays someone back." />
      ) : (
        <View>
          {rows.map((transfer) => {
            const label = `${names.get(transfer.fromId) ?? "?"} → ${names.get(transfer.toId) ?? "?"}: ${formatCents(transfer.amount)}`;
            return (
              <ListItem
                key={transfer.id}
                title={label}
                subtitle={`${transfer.date}${transfer.note === undefined ? "" : ` · ${transfer.note}`}`}
                onPress={() => router.push(`/transfer/${transfer.id}`)}
                right={
                  <RowMenu
                    accessibilityLabel="Transfer actions"
                    actions={[
                      { label: "Edit", onPress: () => router.push(`/transfer/${transfer.id}`) },
                      {
                        label: "Delete",
                        destructive: true,
                        confirm: { title: "Delete transfer?", message: `${label} on ${transfer.date}` },
                        onPress: () => remove.mutate(transfer.id),
                      },
                    ]}
                  />
                }
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
