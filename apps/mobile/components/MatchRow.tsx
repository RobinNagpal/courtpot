import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Side, matchSide, matchWinner } from "@courtpot/schemas";
import type { MatchSideT, MatchT } from "@courtpot/schemas";
import { formatDateTime } from "../lib/date";
import { sideLabel, sidePairKey } from "../lib/matches";
import type { NameOf } from "../lib/matches";
import { PlayerLines } from "./PlayerLines";

interface MatchRowProps {
  match: MatchT;
  nameOf: NameOf;
  /** Tapping a pair. Not called for a singles side, which is one person. */
  onPressPair?: (key: string) => void;
  /** Tapping the one player of a singles side. */
  onPressPerson?: (personId: string) => void;
  onPressMatch?: () => void;
}

/**
 * One match as a block per side: its players one per line, its score, and a
 * trophy on the winner. The trophy is the whole result — a W/L column beside it
 * would say the same thing twice.
 *
 * Each side is its own tap target: a pair opens the pair's page, a lone player
 * opens theirs. Editing and deleting live on the match's own page, so no row
 * menu competes with those taps.
 */
export function MatchRow({ match, nameOf, onPressPair, onPressPerson, onPressMatch }: MatchRowProps): ReactElement {
  const winner = matchWinner(match);
  // The public team page shows matches with nowhere to go, so every tap target
  // here is optional and simply inert when it has no destination.
  const tappable = onPressPair !== undefined || onPressPerson !== undefined;

  const side = (which: Side): ReactElement => {
    const half: MatchSideT = matchSide(match, which);
    const key = sidePairKey(half);
    const won = winner === which;
    const people = half.playerIds
      .map((personId) => ({ id: personId, name: nameOf(personId) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <Pressable
        disabled={!tappable}
        onPress={() => {
          if (key !== null) {
            onPressPair?.(key);
            return;
          }
          const [only] = half.playerIds;
          if (only !== undefined) {
            onPressPerson?.(only);
          }
        }}
        accessibilityRole={tappable ? "button" : undefined}
        accessibilityLabel={`${sideLabel(half, nameOf)}, ${half.points} points, ${won ? "won" : "lost"}`}
        className={`flex-row items-center gap-2 rounded-lg px-2 py-2 ${
          tappable ? "active:bg-neutral-100 dark:active:bg-neutral-800" : ""
        }`}
      >
        <View className="w-5 items-center">
          {won ? <Ionicons name="trophy" size={15} color="#d97706" /> : null}
        </View>
        <View className="flex-1">
          <PlayerLines people={people} emphasis={won} />
        </View>
        <Text
          className={`w-9 text-right text-lg tabular-nums ${
            won ? "font-bold text-neutral-900 dark:text-neutral-50" : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {half.points}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="gap-1 border-b border-neutral-100 py-2 dark:border-neutral-800">
      {side(Side.A)}
      {side(Side.B)}
      <Pressable
        disabled={onPressMatch === undefined}
        onPress={onPressMatch}
        accessibilityRole={onPressMatch === undefined ? undefined : "button"}
        accessibilityLabel={`Open match played ${formatDateTime(match.playedAt)}`}
        className={`flex-row items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
          onPressMatch === undefined ? "" : "active:bg-neutral-100 dark:active:bg-neutral-800"
        }`}
      >
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">{formatDateTime(match.playedAt)}</Text>
        {onPressMatch === undefined ? null : <Ionicons name="chevron-forward" size={15} color="#94a3b8" />}
      </Pressable>
    </View>
  );
}
