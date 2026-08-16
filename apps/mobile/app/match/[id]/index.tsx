import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMatches } from "@courtpot/api";
import { Side, matchSide, matchWinner } from "@courtpot/schemas";
import { ErrorState, ListItem, LoadingState, SectionTitle } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EntityHeading } from "../../../components/EntityHeading";
import { EditButton } from "../../../components/EditButton";
import { formatDateTime } from "../../../lib/date";
import { matchTitle, scoreLabel, sideLabel } from "../../../lib/matches";
import { usePersonNames, usePersonOptions } from "../../../lib/people";
import { personHref } from "../../../lib/personLink";

/** Read-only detail for one match. The pencil leads to the form. */
export default function MatchViewScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matches = useMatches();
  const people = usePersonOptions();
  const names = usePersonNames();

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
  const toPerson = (personId: string): void => {
    router.push(personHref(personId, people.find((person) => person.id === personId)?.kind ?? "member"));
  };

  const players = (side: Side): ReactElement => (
    <View>
      {matchSide(match, side).playerIds.map((personId) => (
        <ListItem key={personId} title={nameOf(personId)} onPress={() => toPerson(personId)} />
      ))}
    </View>
  );

  return (
    <Screen>
      <Stack.Screen
        options={{ title: "Match", headerRight: () => <EditButton href={`/match/${match.id}/edit`} /> }}
      />
      <EntityHeading name={matchTitle(match, nameOf)} subtitle={scoreLabel(match)} />
      <View>
        <Detail label="Played" value={formatDateTime(match.playedAt)} />
        <Detail label="Format" value={match.sideA.playerIds.length === 1 ? "Singles" : "Doubles"} />
        <Detail label="Won by" value={sideLabel(matchSide(match, winner), nameOf)} />
      </View>

      <SectionTitle label={`${sideLabel(match.sideA, nameOf)} — ${match.sideA.points}`} />
      {players(Side.A)}
      <SectionTitle label={`${sideLabel(match.sideB, nameOf)} — ${match.sideB.points}`} />
      {players(Side.B)}
    </Screen>
  );
}
