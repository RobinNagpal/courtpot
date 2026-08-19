import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMatches } from "@courtpot/api";
import { Button, EmptyState, ErrorState, LoadingState } from "@courtpot/ui";
import { MatchRange } from "@courtpot/schemas";
import { Screen } from "../components/Screen";
import { ChipGroup } from "../components/ChipGroup";
import { RangeChips } from "../components/RangeChips";
import { MatchRow } from "../components/MatchRow";
import { matchesInRange, matchesPerson } from "../lib/matches";
import { usePersonHref, usePersonNames, usePersonOptions } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function MatchesScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const matches = useMatches();
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
            <MatchRow
              key={match.id}
              match={match}
              nameOf={nameOf}
              onPressPair={(key) => router.push(`/pair/${key}`)}
              onPressPerson={(personId) => {
                // Nothing happens for somebody we cannot identify, rather than
                // a confident jump to the wrong kind of page.
                const href = hrefFor(personId);
                if (href !== null) {
                  router.push(href);
                }
              }}
              onPressMatch={() => router.push(`/match/${match.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
