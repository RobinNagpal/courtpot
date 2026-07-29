import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { teamsApi } from "../lib/storage";
import { Role } from "@courtpot/schemas";
import { Button, EmptyState, Input, ListItem, SectionTitle, confirmAsync } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { FormError } from "../components/FormError";
import { RowMenu } from "../components/RowMenu";
import { useAuth } from "../lib/auth";
import { newId } from "../lib/id";
import { useTeam } from "../lib/team";

/**
 * Teams the member belongs to: switch, mark one as the login landing page, and
 * edit it if they run it. Only a platform Admin can add a team.
 */
export default function TeamsScreen(): ReactElement {
  const router = useRouter();
  const { teams, activeTeamId, defaultTeamId, setActiveTeam, markDefault, refresh } = useTeam();
  const { member } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlatformAdmin = member?.role === Role.Admin;

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    try {
      await action();
      setError(null);
      setEditingId(null);
      setShowAdd(false);
      refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    }
  };

  return (
    <Screen nav>
      <SectionTitle label="Your teams" />
      {teams.length === 0 ? (
        <EmptyState message="You are not on any team yet. Ask an admin to add you." />
      ) : (
        <View>
          {teams.map((team) => {
            const isDefault = team.id === defaultTeamId;
            const canEdit = isPlatformAdmin || team.role === Role.TeamMemberAdmin;
            return (
              <View key={team.id}>
                <ListItem
                  title={`${team.name}${team.id === activeTeamId ? " · current" : ""}`}
                  subtitle={`${team.role}${isDefault ? " · opens at login" : ""}`}
                  onPress={() => {
                    setActiveTeam(team.id);
                    router.replace("/");
                  }}
                  right={
                    <RowMenu
                      accessibilityLabel={`Actions for ${team.name}`}
                      actions={[
                        ...(team.id === activeTeamId
                          ? []
                          : [
                              {
                                label: "Switch to this team",
                                onPress: () => {
                                  setActiveTeam(team.id);
                                  router.replace("/");
                                },
                              },
                            ]),
                        ...(isDefault
                          ? []
                          : [
                              {
                                label: "Make default",
                                onPress: () => {
                                  void run(() => markDefault(team.id));
                                },
                              },
                            ]),
                        ...(canEdit
                          ? [
                              {
                                label: "Edit",
                                onPress: () => setEditingId((prev) => (prev === team.id ? null : team.id)),
                              },
                            ]
                          : []),
                      ]}
                    />
                  }
                />
                {editingId === team.id ? (
                  <TeamEditor
                    name={team.name}
                    onSave={(name, pin) =>
                      run(() => {
                        const api = teamsApi;
                        if (api === null) {
                          throw new Error("Teams can only be edited in server mode.");
                        }
                        return api.edit(team.id, pin === "" ? { name } : { name, pin });
                      })
                    }
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <FormError message={error} />

      {isPlatformAdmin ? (
        <>
          <SectionTitle label="Add a team" />
          {showAdd ? (
            <TeamEditor
              name=""
              saveLabel="Create team"
              onSave={async (name, pin) => {
                const api = teamsApi;
                if (api === null) {
                  setError("Teams can only be created in server mode.");
                  return;
                }
                if (!(await confirmAsync("Create team?", `Add "${name}". You can add members to it afterwards.`))) {
                  return;
                }
                await run(() => api.create({ id: newId(), name, ...(pin === "" ? {} : { pin }) }));
              }}
            />
          ) : (
            <Button label="+ New team" onPress={() => setShowAdd(true)} />
          )}
        </>
      ) : (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          Only a platform admin can add new teams.
        </Text>
      )}
    </Screen>
  );
}

interface TeamEditorProps {
  name: string;
  saveLabel?: string;
  onSave: (name: string, pin: string) => Promise<void> | void;
}

function TeamEditor({ name, saveLabel = "Save", onSave }: TeamEditorProps): ReactElement {
  const [draftName, setDraftName] = useState(name);
  const [pin, setPin] = useState("");
  return (
    <View className="gap-2 pb-3 pl-3">
      <Input label="Team name" value={draftName} onChangeText={setDraftName} />
      <Input
        label="Team PIN (leave blank to keep)"
        value={pin}
        onChangeText={setPin}
        placeholder="4 digits"
        keyboardType="number-pad"
      />
      <Button
        label={saveLabel}
        variant="ghost"
        onPress={() => {
          void onSave(draftName.trim(), pin.trim());
        }}
      />
    </View>
  );
}
