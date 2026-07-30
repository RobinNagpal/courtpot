import type { ReactElement } from "react";
import { View } from "react-native";
import type { TransferT } from "@courtpot/schemas";
import { EmptyState, ListItem, formatCents } from "@courtpot/ui";

interface PersonTransfersProps {
  personId: string;
  transfers: readonly TransferT[];
  names: Map<string, string>;
  onOpen: (transferId: string) => void;
}

/**
 * Money this person sent or received. Framed from their side — "to Robin" or
 * "from Sam" — since the row already belongs to their page.
 */
export function PersonTransfers({ personId, transfers, names, onOpen }: PersonTransfersProps): ReactElement {
  if (transfers.length === 0) {
    return <EmptyState message="No transfers yet." />;
  }
  return (
    <View>
      {transfers.map((transfer) => {
        const sent = transfer.fromId === personId;
        const otherId = sent ? transfer.toId : transfer.fromId;
        const other = names.get(otherId) ?? "?";
        return (
          <ListItem
            key={transfer.id}
            title={`${sent ? "Paid" : "Received"} ${formatCents(transfer.amount)}`}
            subtitle={`${sent ? "to" : "from"} ${other} · ${transfer.date}${
              transfer.note === undefined ? "" : ` · ${transfer.note}`
            }`}
            onPress={() => onOpen(transfer.id)}
          />
        );
      })}
    </View>
  );
}
