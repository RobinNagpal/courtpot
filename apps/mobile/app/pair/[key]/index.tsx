import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMatches } from "@courtpot/api";
import { computePairRankings, pairKeyPlayers } from "@courtpot/domain";
import { MatchRange } from "@courtpot/schemas";
import { EmptyState, ErrorState, LoadingState, SectionTitle } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EntityHeading } from "../../../components/EntityHeading";
import { MatchRow } from "../../../components/MatchRow";
import { RangeChips } from "../../../components/RangeChips";
import { matchesForPair, matchesInRange, pairLabel } from "../../../lib/matches";
import { usePersonHref, usePersonNames } from "../../../lib/people";
import { useActiveTeamId } from "../../../lib/team";

/** One pair: their record, and every match they played together. */
export default function PairViewScreen(): ReactElement {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const teamId = useActiveTeamId();
  const matches = useMatches();
  const names = usePersonNames();
  const hrefFor = usePersonHref();
  const [range, setRange] = useState<MatchRange>(MatchRange.AllTime);

  const players = pairKeyPlayers(key);

  const theirs = useMemo(() => {
    if (players === null) {
      return [];
    }
    return matchesForPair(
      matchesInRange((matches.data ?? []).filter((match) => match.teamId === teamId), range),
      key,
    );
  }, [matches.data, teamId, range, key, players]);

  if (matches.isPending) {
    return <LoadingState />;
  }
  if (matches.isError) {
    return <ErrorState message="Could not load the pair." />;
  }
  if (players === null) {
    return <ErrorState message="That is not a pair." />;
  }

  const nameOf = (personId: string): string => names.get(personId) ?? "?";
  const label = pairLabel(players, nameOf);
  // The pair's own line out of the standings for exactly these matches, so the
  // record here and on the rankings table can never disagree.
  const record = computePairRankings(theirs).find((pair) => pair.key === key);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Pair" }} />
      <EntityHeading name={label} subtitle={record === undefined ? "No matches yet" : `${record.won}W · ${record.lost}L`} />

      <RangeChips range={range} onChange={setRange} />

      <View>
        <Detail label="Played" value={String(record?.played ?? 0)} />
        <Detail label="Won" value={String(record?.won ?? 0)} />
        <Detail label="Lost" value={String(record?.lost ?? 0)} />
        <Detail label="Win rate" value={record === undefined ? "—" : `${Math.round(record.winRate * 100)}%`} />
      </View>

      <SectionTitle label="Matches" />
      {theirs.length === 0 ? (
        <EmptyState
          message={range === MatchRange.Today ? "This pair has not played today." : "This pair has no matches yet."}
        />
      ) : (
        <View>
          {theirs.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              nameOf={nameOf}
              // Tapping this pair again would go nowhere; the other one opens.
              onPressPair={(other) => {
                if (other !== key) {
                  router.push(`/pair/${other}`);
                }
              }}
              onPressPerson={(personId) => {
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
