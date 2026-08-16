import type { ReactElement } from "react";
import { Text, View } from "react-native";
import type { PairRanking } from "@courtpot/domain";
import { AvatarRow, EmptyState, ListItem } from "@courtpot/ui";

interface PairRankingRowsProps {
  rankings: readonly PairRanking[];
  nameOf: (personId: string) => string;
  empty: string;
}

/**
 * The standings table, shared by the signed-in screen and the public team page
 * so the two cannot drift apart.
 *
 * Names are sorted here rather than taken in `playerIds` order: a pair's ids are
 * held sorted so it has one identity, but that is UUID order, which would read
 * as random and would disagree with nothing else on the row.
 */
export function PairRankingRows({ rankings, nameOf, empty }: PairRankingRowsProps): ReactElement {
  if (rankings.length === 0) {
    return <EmptyState message={empty} />;
  }
  return (
    <View>
      {rankings.map((pair) => {
        const people = pair.playerIds
          .map((personId) => ({ id: personId, name: nameOf(personId) }))
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <ListItem
            key={pair.key}
            title={people.map((person) => person.name).join(" & ")}
            subtitle={`${pair.won}W · ${pair.lost}L · ${pair.played} played`}
            right={
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {`${Math.round(pair.winRate * 100)}%`}
              </Text>
            }
            footer={<AvatarRow people={people} />}
          />
        );
      })}
    </View>
  );
}
