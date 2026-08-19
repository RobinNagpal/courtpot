import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import type { PairRanking } from "@courtpot/domain";
import { EmptyState } from "@courtpot/ui";
import { PlayerLines } from "./PlayerLines";

interface PairRankingRowsProps {
  rankings: readonly PairRanking[];
  nameOf: (personId: string) => string;
  empty: string;
  /** Omitted on the public page, which has no pair page to open. */
  onPressPair?: (key: string) => void;
}

/**
 * The standings table, shared by the signed-in screen and the public team page
 * so the two cannot drift apart.
 *
 * Players go one per line, and sorted by name: a pair's ids are held sorted so
 * it has one identity, but that is UUID order, which would read as random. Full
 * names are long enough that joining them with "&" truncates the second person
 * away on a phone.
 */
export function PairRankingRows({ rankings, nameOf, empty, onPressPair }: PairRankingRowsProps): ReactElement {
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
          <Pressable
            key={pair.key}
            onPress={onPressPair === undefined ? undefined : () => onPressPair(pair.key)}
            disabled={onPressPair === undefined}
            accessibilityRole={onPressPair === undefined ? undefined : "button"}
            accessibilityLabel={`${people.map((person) => person.name).join(" and ")}, ${pair.won} won, ${
              pair.lost
            } lost`}
            className="flex-row items-center justify-between gap-3 border-b border-neutral-100 py-3 active:opacity-70 dark:border-neutral-800"
          >
            <View className="flex-1 gap-1">
              <PlayerLines people={people} emphasis />
              <Text className="pl-9 text-sm text-neutral-500 dark:text-neutral-400">
                {`${pair.won}W · ${pair.lost}L · ${pair.played} played`}
              </Text>
            </View>
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {`${Math.round(pair.winRate * 100)}%`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
