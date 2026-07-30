import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTransfers } from "@courtpot/api";
import { Avatar, ErrorState, LoadingState, formatCents } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EditButton } from "../../../components/EditButton";
import { usePersonNames, usePersonOptions } from "../../../lib/people";
import { personHref } from "../../../lib/personLink";

/** Read-only detail for one transfer. */
export default function TransferViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transfers = useTransfers();
  const router = useRouter();
  const names = usePersonNames();
  const people = usePersonOptions();

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
  // A person who is neither a known member nor guest is shown but not tappable.
  const hrefFor = (personId: string): (() => void) | undefined => {
    const kind = people.find((person) => person.id === personId)?.kind;
    return kind === undefined ? undefined : () => router.push(personHref(personId, kind));
  };

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
        <Detail label="From" value={<Person name={from} onPress={hrefFor(transfer.fromId)} />} />
        <Detail label="To" value={<Person name={to} onPress={hrefFor(transfer.toId)} />} />
        <Detail label="Note" value={transfer.note ?? "—"} />
      </View>
    </Screen>
  );
}

function Person({ name, onPress }: { name: string; onPress?: () => void }): ReactElement {
  const body = (
    <View className="flex-row items-center gap-2">
      <Avatar name={name} />
      <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</Text>
    </View>
  );
  if (onPress === undefined) {
    return body;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
      {body}
    </Pressable>
  );
}
