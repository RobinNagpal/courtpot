import { useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemberMutations, useMembers } from "@courtpot/api";
import { Member } from "@courtpot/schemas";
import { Button, ErrorState, Input, LoadingState, confirmAsync } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { FormError } from "../../../components/FormError";
import { firstIssueMessage } from "../../../lib/forms";

export default function MemberEditScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const members = useMembers();
  const { update } = useMemberMutations();
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (members.isPending) {
    return <LoadingState />;
  }
  if (members.isError) {
    return <ErrorState message="Could not load the member." />;
  }
  const member = members.data.find((row) => row.id === id);
  if (member === undefined) {
    return <ErrorState message="Member not found." />;
  }

  const draft = name ?? member.name;
  const activeCount = members.data.filter((m) => m.active).length;

  const save = (): void => {
    const taken = members.data.some(
      (other) => other.id !== member.id && other.name.trim().toLowerCase() === draft.trim().toLowerCase(),
    );
    if (taken) {
      setError("A member with that name already exists.");
      return;
    }
    const result = Member.safeParse({ ...member, name: draft });
    if (!result.success) {
      setError(firstIssueMessage(result.error));
      return;
    }
    update.mutate(result.data);
    router.back();
  };

  const toggleActive = async (): Promise<void> => {
    if (member.active && activeCount === 1) {
      await confirmAsync("Cannot deactivate", "At least one member must stay active.");
      return;
    }
    update.mutate({ ...member, active: !member.active });
    router.back();
  };

  return (
    <Screen>
      <Input label="Name" value={draft} onChangeText={setName} />
      <FormError message={error} />
      <Button label="Save changes" onPress={save} />
      <View className="pt-2">
        <Button
          label={member.active ? "Deactivate member" : "Activate member"}
          variant="ghost"
          onPress={() => {
            void toggleActive();
          }}
        />
      </View>
    </Screen>
  );
}
