import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { TeamPageT } from "@courtpot/schemas";
import {
  Avatar,
  BalanceChip,
  Button,
  EmptyState,
  Input,
  ListItem,
  SectionTitle,
  cardClass,
  formatCents,
} from "@courtpot/ui";
import { Screen } from "../../components/Screen";
import { FormError } from "../../components/FormError";
import { publicTeamApi } from "../../lib/storage";

/**
 * Read-only team page, opened with the team's PIN rather than a login. No edit
 * controls, no navigation bar and no team switcher — whoever has the PIN is not
 * necessarily a member.
 */
export default function PublicTeamScreen(): ReactElement {
  // A slug like "sher-e-smash", or the raw team id.
  const { team: handle } = useLocalSearchParams<{ team: string }>();
  const [pin, setPin] = useState("");
  const [page, setPage] = useState<TeamPageT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = async (): Promise<void> => {
    if (publicTeamApi === null) {
      setError("This build has no API configured, so team pages are unavailable.");
      return;
    }
    setBusy(true);
    try {
      setPage(await publicTeamApi.unlock(handle, pin));
      setError(null);
    } catch (problem) {
      setPage(null);
      setError(problem instanceof Error ? problem.message : "Could not open this team.");
    } finally {
      setBusy(false);
    }
  };

  if (page === null) {
    return (
      <Screen>
        <View className={cardClass}>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Team page</Text>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">
            Enter the team PIN to view its balances. Read-only.
          </Text>
        </View>
        <Input
          label="Team PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="4 digits"
          keyboardType="number-pad"
        />
        <FormError message={error} />
        <Button
          label={busy ? "Opening…" : "View team"}
          onPress={() => {
            void unlock();
          }}
        />
      </Screen>
    );
  }

  const names = new Map<string, string>(
    [...page.members, ...page.guests].map((person) => [person.id, person.name]),
  );
  const memberBalances = page.balances.filter((balance) => balance.kind === "member");
  const guestBalances = page.balances.filter((balance) => balance.kind === "guest");

  return (
    <Screen>
      <View className={cardClass}>
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{page.team.name}</Text>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">View only</Text>
      </View>

      <SectionTitle label="Member balances" />
      {memberBalances.length === 0 ? (
        <EmptyState message="No members yet." />
      ) : (
        <View>
          {memberBalances.map((balance) => (
            <ListItem
              key={balance.personId}
              title={balance.name}
              right={<BalanceChip owedCents={balance.owedCents} />}
            />
          ))}
        </View>
      )}

      <SectionTitle label="Guest balances" />
      {guestBalances.length === 0 ? (
        <EmptyState message="No guests yet." />
      ) : (
        <View>
          {guestBalances.map((balance) => (
            <ListItem
              key={balance.personId}
              title={balance.name}
              right={<BalanceChip owedCents={balance.owedCents} />}
            />
          ))}
        </View>
      )}

      <SectionTitle label="People" />
      <View className="flex-row flex-wrap gap-2">
        {[...page.members, ...page.guests].map((person) => (
          <View key={person.id} className="flex-row items-center gap-1.5">
            <Avatar name={person.name} />
            <Text className="text-sm text-neutral-700 dark:text-neutral-200">{person.name}</Text>
          </View>
        ))}
      </View>

      <SectionTitle label="Transfers" />
      {page.transfers.length === 0 ? (
        <EmptyState message="No transfers yet." />
      ) : (
        <View>
          {page.transfers.map((transfer) => (
            <ListItem
              key={transfer.id}
              title={`${names.get(transfer.fromId) ?? "?"} → ${names.get(transfer.toId) ?? "?"}: ${formatCents(
                transfer.amount,
              )}`}
              subtitle={`${transfer.date}${transfer.note === undefined ? "" : ` · ${transfer.note}`}`}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
