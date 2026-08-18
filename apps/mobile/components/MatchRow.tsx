import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Side, matchSide, matchWinner } from "@courtpot/schemas";
import type { MatchSideT, MatchT } from "@courtpot/schemas";
import { AvatarRow } from "@courtpot/ui";
import { formatDateTime } from "../lib/date";
import { sideLabel, sidePairKey } from "../lib/matches";
import type { NameOf } from "../lib/matches";

interface MatchRowProps {
  match: MatchT;
  nameOf: NameOf;
  /** Tapping a pair. Not called for a singles side, which is one person. */
  onPressPair: (key: string) => void;
  /** Tapping the one player of a singles side. */
  onPressPerson: (personId: string) => void;
  onPressMatch: () => void;
  right?: ReactElement;
}

/**
 * One match as two lines — a side each, with its score — rather than a single
 * "A & B vs C & D" string. Each side is its own tap target: a pair opens the
 * pair's page, a lone player opens theirs.
 */
export function MatchRow({
  match,
  nameOf,
  onPressPair,
  onPressPerson,
  onPressMatch,
  right,
}: MatchRowProps): ReactElement {
  const winner = matchWinner(match);

  const line = (side: Side): ReactElement => {
    const half: MatchSideT = matchSide(match, side);
    const key = sidePairKey(half);
    const label = sideLabel(half, nameOf);
    const won = winner === side;
    const people = half.playerIds
      .map((personId) => ({ id: personId, name: nameOf(personId) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <Pressable
        onPress={() => {
          if (key !== null) {
            onPressPair(key);
            return;
          }
          const [only] = half.playerIds;
          if (only !== undefined) {
            onPressPerson(only);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${half.points} points, ${won ? "won" : "lost"}`}
        className="flex-row items-center justify-between gap-3 rounded-lg px-2 py-1.5 active:bg-neutral-100 dark:active:bg-neutral-800"
      >
        <View className="flex-1 flex-row items-center gap-2">
          {/* The trophy sits only on the winner, so the eye finds it without
              reading either score. */}
          {won ? <Ionicons name="trophy" size={14} color="#d97706" /> : <View className="w-3.5" />}
          <AvatarRow people={people} />
          <Text
            numberOfLines={1}
            className={`flex-1 text-base ${
              won
                ? "font-semibold text-neutral-900 dark:text-neutral-50"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            {label}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            className={`w-5 text-center text-xs font-bold ${
              won
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {won ? "W" : "L"}
          </Text>
          <Text
            className={`w-8 text-right text-base tabular-nums ${
              won ? "font-bold text-neutral-900 dark:text-neutral-50" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {half.points}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="gap-1 border-b border-neutral-100 py-3 dark:border-neutral-800">
      <View className="flex-row items-start gap-2">
        <View className="flex-1 gap-0.5">
          {line(Side.A)}
          {line(Side.B)}
        </View>
        {right}
      </View>
      <Pressable onPress={onPressMatch} accessibilityRole="button" accessibilityLabel="Open match">
        <Text className="px-2 text-sm text-neutral-500 dark:text-neutral-400">{formatDateTime(match.playedAt)}</Text>
      </Pressable>
    </View>
  );
}
