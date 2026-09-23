import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Role } from "@courtpot/schemas";
import { ErrorState } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EntityHeading } from "../../../components/EntityHeading";
import { EditButton } from "../../../components/EditButton";
import { useAuth } from "../../../lib/auth";
import { useTeam } from "../../../lib/team";

/** Read-only detail for one of the member's teams. */
export default function TeamViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, allTeams, activeTeamId, defaultTeamId } = useTeam();
  const { member } = useAuth();

  // An Admin reaches teams they are not on through allTeams, so the role that
  // names them a member is separate from the team itself.
  const membership = teams.find((row) => row.id === id) ?? null;
  const team = membership ?? allTeams.find((row) => row.id === id) ?? null;
  if (team === null) {
    return <ErrorState message="Team not found, or you are not on it." />;
  }

  // A platform Admin may edit any team; a team admin only their own.
  const canEdit = member?.role === Role.Admin || membership?.role === Role.TeamMemberAdmin;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Team",
          headerRight: canEdit ? () => <EditButton href={`/team/${team.id}/edit`} /> : undefined,
        }}
      />
      <EntityHeading
        name={team.name}
        subtitle={membership === null ? "You are not on this team" : `You are ${membership.role}`}
      />
      <View>
        <Detail label="Page address" value={team.slug === null ? "—" : `/t/${team.slug}`} />
        <Detail label="Currently viewing" value={team.id === activeTeamId ? "Yes" : "No"} />
        <Detail label="Opens at login" value={team.id === defaultTeamId ? "Yes" : "No"} />
      </View>
    </Screen>
  );
}
