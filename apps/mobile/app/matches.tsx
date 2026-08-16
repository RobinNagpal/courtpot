import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMatchMutations, useMatches } from "@courtpot/api";
import { AvatarRow, Button, EmptyState, ErrorState, ListItem, LoadingState } from "@courtpot/ui";
import { matchPlayerIds } from "@courtpot/schemas";
import { Screen } from "../components/Screen";
import { RowMenu } from "../components/RowMenu";
import { ChipGroup } from "../components/ChipGroup";
import { formatDateTime } from "../lib/date";
import { matchTitle, matchesPerson, scoreLabel } from "../lib/matches";
import { usePersonNames, usePersonOptions } from "../lib/people";
import { personHref } from "../lib/personLink";
import { useActiveTeamId } from "../lib/team";

export default function MatchesScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const matches = useMatches();
  const { remove } = useMatchMutations();
  const people = usePersonOptions();
  const names = usePersonNames();
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const rows = useMemo(() => {
    const mine = (matches.data ?? []).filter((match) => match.teamId === teamId);
    const filtered = personFilter === null ? mine : mine.filter((match) => matchesPerson(match, personFilter));
    // Newest first. playedAt is ISO-8601 UTC, so comparing the strings is
    // comparing the instants.
    return [...filtered].sort((a, b) => b.playedAt.localeCompare(a.playedAt) || a.id.localeCompare(b.id));
  }, [matches.data, teamId, personFilter]);

  if (matches.isPending) {
    return <LoadingState />;
  }
  if (matches.isError) {
    return <ErrorState message="Could not load matches." />;
  }

  const nameOf = (personId: string): string => names.get(personId) ?? "?";

  return (
    <Screen nav>
      <Button label="+ Record match" onPress={() => router.push("/match/new")} />

      <ChipGroup
        label="Filter by player"
        options={people.map((person) => ({ id: person.id, label: person.name }))}
        selectedIds={personFilter === null ? [] : [personFilter]}
        onToggle={(id) => setPersonFilter((prev) => (prev === id ? null : id))}
      />

      {rows.length === 0 ? (
        <EmptyState message="No matches yet. Record one with the button above." />
      ) : (
        <View>
          {rows.map((match) => (
            <ListItem
              key={match.id}
              title={matchTitle(match, nameOf)}
              subtitle={`${formatDateTime(match.playedAt)} · ${scoreLabel(match)}`}
              onPress={() => router.push(`/match/${match.id}`)}
              footer={
                <AvatarRow
                  people={matchPlayerIds(match).map((personId) => ({ id: personId, name: nameOf(personId) }))}
                  onPress={(personId) =>
                    router.push(personHref(personId, people.find((p) => p.id === personId)?.kind ?? "member"))
                  }
                />
              }
              right={
                <RowMenu
                  accessibilityLabel="Match actions"
                  actions={[
                    { label: "Edit", onPress: () => router.push(`/match/${match.id}/edit`) },
                    {
                      label: "Delete",
                      destructive: true,
                      confirm: {
                        title: "Delete match?",
                        message: `${matchTitle(match, nameOf)} — ${scoreLabel(match)}. This removes it from the rankings.`,
                      },
                      onPress: () => remove.mutate(match.id),
                    },
                  ]}
                />
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
