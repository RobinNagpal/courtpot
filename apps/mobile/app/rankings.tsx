import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { usePairRankings } from "@courtpot/api";
import { AvatarRow, EmptyState, ErrorState, ListItem, LoadingState, cardClass } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { pairLabel } from "../lib/matches";
import { usePersonNames } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

/** Whole percent — win rates are read at a glance, not to three decimals. */
function winPercent(winRate: number): string {
  return `${Math.round(winRate * 100)}%`;
}

export default function RankingsScreen(): ReactElement {
  const teamId = useActiveTeamId();
  const { rankings, isPending, isError } = usePairRankings(teamId);
  const names = usePersonNames();

  if (isPending) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load rankings." />;
  }

  const nameOf = (personId: string): string => names.get(personId) ?? "?";

  return (
    <Screen nav>
      <View className={cardClass}>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {rankings.length === 0
            ? "Pairs appear here once doubles matches are recorded."
            : `${rankings.length} pair${rankings.length === 1 ? "" : "s"}, most wins first. Singles are not ranked.`}
        </Text>
      </View>

      {rankings.length === 0 ? (
        <EmptyState message="No pairs yet. Record a doubles match to start the table." />
      ) : (
        <View>
          {rankings.map((pair) => (
            <ListItem
              key={pair.key}
              title={pairLabel(pair.playerIds, nameOf)}
              subtitle={`${pair.won}W · ${pair.lost}L · ${pair.played} played`}
              right={
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {winPercent(pair.winRate)}
                </Text>
              }
              footer={
                <AvatarRow people={pair.playerIds.map((personId) => ({ id: personId, name: nameOf(personId) }))} />
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
