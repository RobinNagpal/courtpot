import { useState } from "react";
import type { ReactElement } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Role } from "@courtpot/schemas";
import { Button, ErrorState, Input } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { FormError } from "../../../components/FormError";
import { useAuth } from "../../../lib/auth";
import { teamsApi } from "../../../lib/storage";
import { useTeam } from "../../../lib/team";

export default function TeamEditScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, refresh } = useTeam();
  const { member } = useAuth();
  const team = teams.find((row) => row.id === id);

  const [name, setName] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (team === undefined) {
    return <ErrorState message="Team not found, or you are not on it." />;
  }
  if (!(member?.role === Role.Admin || team.role === Role.TeamMemberAdmin)) {
    return <ErrorState message="Only an admin of this team can edit it." />;
  }

  const draftName = name ?? team.name;
  const draftSlug = slug ?? team.slug ?? "";

  const save = async (): Promise<void> => {
    const api = teamsApi;
    if (api === null) {
      setError("Teams can only be edited in server mode.");
      return;
    }
    try {
      await api.edit(team.id, {
        name: draftName.trim(),
        ...(pin.trim() === "" ? {} : { pin: pin.trim() }),
        ...(draftSlug.trim() === "" ? {} : { slug: draftSlug.trim() }),
      });
      refresh();
      router.back();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save the team.");
    }
  };

  return (
    <Screen>
      <Input label="Team name" value={draftName} onChangeText={setName} />
      <Input
        label="Page address (letters, digits, hyphens)"
        value={draftSlug}
        onChangeText={setSlug}
        placeholder="e.g. sher-e-smash"
        autoCapitalize="none"
      />
      <Input
        label="Team PIN (leave blank to keep)"
        value={pin}
        onChangeText={setPin}
        placeholder="4 digits"
        keyboardType="number-pad"
      />
      <FormError message={error} />
      <Button
        label="Save changes"
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
