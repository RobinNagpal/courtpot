import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMatches } from "@courtpot/api";
import { Side, matchSide, matchWinner } from "@courtpot/schemas";
import { ErrorState, ListItem, LoadingState } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EntityHeading } from "../../../components/EntityHeading";
import { EditButton } from "../../../components/EditButton";
import { formatDateTime } from "../../../lib/date";
import { scoreLabel, sidePairKey } from "../../../lib/matches";
import { usePersonHref, usePersonNames } from "../../../lib/people";

/** Read-only detail for one match. The pencil leads to the form. */
export default function MatchViewScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matches = useMatches();
  const names = usePersonNames();
  const hrefFor = usePersonHref();

  if (matches.isPending) {
    return <LoadingState />;
  }
  if (matches.isError) {
    return <ErrorState message="Could not load the match." />;
  }

  const match = matches.data.find((row) => row.id === id);
  if (match === undefined) {
    return <ErrorState message="Match not found." />;
  }

  const nameOf = (personId: string): string => names.get(personId) ?? "?";
  const winner = matchWinner(match);
  const doubles = match.sideA.playerIds.length > 1;
  // Unknown people are not tappable, rather than routed to the wrong page.
  const toPerson = (personId: string): void => {
    const href = hrefFor(personId);
    if (href !== null) {
      router.push(href);
    }
  };

  /**
   * A side: the trophy says which won, so the players below it need no W/L
   * against them, and each gets its own line rather than being joined with "&".
   */
  const side = (which: Side): ReactElement => {
    const half = matchSide(match, which);
    const won = winner === which;
    const key = sidePairKey(half);
    const people = half.playerIds
      .map((personId) => ({ id: personId, name: nameOf(personId) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <View>
        <Pressable
          disabled={key === null}
          onPress={key === null ? undefined : () => router.push(`/pair/${key}`)}
          accessibilityRole={key === null ? undefined : "button"}
          accessibilityLabel={key === null ? undefined : "Open this pair"}
          className={`flex-row items-center gap-2 rounded-lg px-1 pt-4 ${
            key === null ? "" : "active:bg-neutral-100 dark:active:bg-neutral-800"
          }`}
        >
          <View className="w-5 items-center">
            {won ? <Ionicons name="trophy" size={16} color="#d97706" /> : null}
          </View>
          <Text className="flex-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {won ? (doubles ? "Winners" : "Winner") : "Beaten"}
          </Text>
          <Text
            className={`text-lg tabular-nums ${
              won ? "font-bold text-neutral-900 dark:text-neutral-50" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {half.points}
          </Text>
          {key === null ? null : <Ionicons name="chevron-forward" size={15} color="#94a3b8" />}
        </Pressable>
        {people.map((person) => (
          <ListItem key={person.id} title={person.name} onPress={() => toPerson(person.id)} />
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <Stack.Screen
        options={{ title: "Match", headerRight: () => <EditButton href={`/match/${match.id}/edit`} /> }}
      />
      <EntityHeading name={scoreLabel(match)} subtitle={formatDateTime(match.playedAt)} />
      <View>
        <Detail label="Played" value={formatDateTime(match.playedAt)} />
        <Detail label="Format" value={doubles ? "Doubles" : "Singles"} />
      </View>

      {side(Side.A)}
      {side(Side.B)}
    </Screen>
  );
}
