import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMatchMutations, useMatches } from "@courtpot/api";
import { AvatarRow, Button, EmptyState, ErrorState, ListItem, LoadingState } from "@courtpot/ui";
import { MatchRange } from "@courtpot/schemas";
import { Screen } from "../components/Screen";
import { RowMenu } from "../components/RowMenu";
import { ChipGroup } from "../components/ChipGroup";
import { RangeChips } from "../components/RangeChips";
import { formatDateTime } from "../lib/date";
import { matchPeople, matchTitle, matchesInRange, matchesPerson, scoreLabel } from "../lib/matches";
import { usePersonHref, usePersonNames, usePersonOptions } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function MatchesScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const matches = useMatches();
  const { remove } = useMatchMutations();
  const people = usePersonOptions();
  const names = usePersonNames();
  const hrefFor = usePersonHref();
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [range, setRange] = useState<MatchRange>(MatchRange.AllTime);

  const rows = useMemo(() => {
    const mine = matchesInRange(
      (matches.data ?? []).filter((match) => match.teamId === teamId),
      range,
    );
    const filtered = personFilter === null ? mine : mine.filter((match) => matchesPerson(match, personFilter));
    // Newest first. playedAt is ISO-8601 UTC at a fixed precision, so comparing
    // the strings is comparing the instants.
    return [...filtered].sort((a, b) => b.playedAt.localeCompare(a.playedAt) || a.id.localeCompare(b.id));
  }, [matches.data, teamId, personFilter, range]);

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

      <RangeChips range={range} onChange={setRange} />

      <ChipGroup
        label="Filter by player"
        options={people.map((person) => ({ id: person.id, label: person.name }))}
        selectedIds={personFilter === null ? [] : [personFilter]}
        onToggle={(id) => setPersonFilter((prev) => (prev === id ? null : id))}
      />

      {rows.length === 0 ? (
        <EmptyState
          message={
            range === MatchRange.Today
              ? "No matches played today."
              : "No matches yet. Record one with the button above."
          }
        />
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
                  people={matchPeople(match, nameOf)}
                  onPress={(personId) => {
                    // Nothing happens for somebody we cannot identify, rather
                    // than a confident jump to the wrong kind of page.
                    const href = hrefFor(personId);
                    if (href !== null) {
                      router.push(href);
                    }
                  }}
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
