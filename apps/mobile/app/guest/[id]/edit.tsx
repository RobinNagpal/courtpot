import { useState } from "react";
import type { ReactElement } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGuestMutations, useGuests } from "@courtpot/api";
import { Guest } from "@courtpot/schemas";
import { Button, ErrorState, Input, LoadingState } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { FormError } from "../../../components/FormError";
import { firstIssueMessage } from "../../../lib/forms";

export default function GuestEditScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const guests = useGuests();
  const { update } = useGuestMutations();
  const [name, setName] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (guests.isPending) {
    return <LoadingState />;
  }
  if (guests.isError) {
    return <ErrorState message="Could not load the guest." />;
  }
  const guest = guests.data.find((row) => row.id === id);
  if (guest === undefined) {
    return <ErrorState message="Guest not found." />;
  }

  const draftName = name ?? guest.name;
  const draftNote = note ?? guest.note ?? "";

  const save = (): void => {
    const taken = guests.data.some(
      (other) => other.id !== guest.id && other.name.trim().toLowerCase() === draftName.trim().toLowerCase(),
    );
    if (taken) {
      setError("A guest with that name already exists.");
      return;
    }
    const result = Guest.safeParse({
      ...guest,
      name: draftName,
      note: draftNote.trim() === "" ? undefined : draftNote.trim(),
    });
    if (!result.success) {
      setError(firstIssueMessage(result.error));
      return;
    }
    update.mutate(result.data);
    router.back();
  };

  return (
    <Screen>
      <Input label="Name" value={draftName} onChangeText={setName} />
      <Input label="Note" value={draftNote} onChangeText={setNote} placeholder="Optional" />
      <FormError message={error} />
      <Button label="Save changes" onPress={save} />
    </Screen>
  );
}
