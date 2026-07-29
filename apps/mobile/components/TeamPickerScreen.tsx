import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import { EmptyState, SectionTitle } from "@courtpot/ui";
import { useTeam } from "../lib/team";
import { Screen } from "./Screen";

interface TeamPickerScreenProps {
  /** Called after a team is chosen. Omitted when this is the post-login gate. */
  onPicked?: () => void;
}

/** The post-login gate when a member belongs to more than one team. */
export function TeamPickerScreen({ onPicked }: TeamPickerScreenProps = {}): ReactElement {
  const { teams, activeTeamId, setActiveTeam } = useTeam();

  if (teams.length === 0) {
    return (
      <Screen>
        <EmptyState message="You are not on any team yet. Ask an admin to add you." />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle label="Choose a team" />
      <View className="gap-2">
        {teams.map((team) => (
          <Pressable
            key={team.id}
            onPress={() => {
              setActiveTeam(team.id);
              onPicked?.();
            }}
            className={`rounded-xl border p-4 ${
              team.id === activeTeamId ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
            }`}
          >
            <Text className="text-base font-semibold text-slate-900">{team.name}</Text>
            <Text className="text-sm text-slate-500">{team.role}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
