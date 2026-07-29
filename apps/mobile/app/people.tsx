import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useGuestMutations, useLedgerInput, useMemberMutations } from "@courtpot/api";
import { countPersonReferences } from "@courtpot/domain";
import type { LedgerInput } from "@courtpot/domain";
import type { GuestT, MemberT } from "@courtpot/schemas";
import { Guest, Member, MemberCreate } from "@courtpot/schemas";
import { Button, ErrorState, Input, ListItem, LoadingState, SectionTitle, confirmAsync } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { FormError } from "../components/FormError";
import { useAuth } from "../lib/auth";
import { isRemote } from "../lib/config";
import { firstIssueMessage } from "../lib/forms";
import { newId } from "../lib/id";
import { useActiveTeamId } from "../lib/team";

interface NamedRow {
  id: string;
  name: string;
}

function nameTaken(name: string, rows: readonly NamedRow[], selfId?: string): boolean {
  const needle = name.trim().toLowerCase();
  return rows.some((row) => row.id !== selfId && row.name.trim().toLowerCase() === needle);
}

interface AddPersonRowProps {
  label: string;
  withUsername: boolean;
  onAdd: (name: string, username: string) => string | null;
}

function AddPersonRow({ label, withUsername, onAdd }: AddPersonRowProps): ReactElement {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <View className="gap-2">
      <Input label={label} value={name} onChangeText={setName} placeholder="Name" />
      {withUsername ? (
        <Input label="Username (for login)" value={username} onChangeText={setUsername} placeholder="e.g. robinn" />
      ) : null}
      <Button
        label="Add"
        onPress={() => {
          const problem = onAdd(name, username);
          setError(problem);
          if (problem === null) {
            setName("");
            setUsername("");
          }
        }}
      />
      <FormError message={error} />
    </View>
  );
}

interface PersonEditorProps {
  name: string;
  references: number;
  extraAction?: { label: string; onPress: () => void };
  onRename: (name: string) => string | null;
  onDelete: () => void;
}

function PersonEditor({ name, references, extraAction, onRename, onDelete }: PersonEditorProps): ReactElement {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    if (references > 0) {
      await confirmAsync(
        "Cannot delete",
        `${name} appears in ${references} booking/transfer row${references === 1 ? "" : "s"}. Delete those first.`,
      );
      return;
    }
    if (await confirmAsync("Delete?", `Remove ${name} permanently.`)) {
      onDelete();
    }
  };

  return (
    <View className="gap-2 pb-3 pl-3">
      <Input label="Rename" value={draft} onChangeText={setDraft} />
      <FormError message={error} />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label="Save" variant="ghost" onPress={() => setError(onRename(draft))} />
        </View>
        {extraAction === undefined ? null : (
          <View className="flex-1">
            <Button label={extraAction.label} variant="ghost" onPress={extraAction.onPress} />
          </View>
        )}
        <View className="flex-1">
          <Button
            label="Delete"
            variant="danger"
            onPress={() => {
              void handleDelete();
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function PeopleScreen(): ReactElement {
  const teamId = useActiveTeamId();
  const { input, isPending, isError } = useLedgerInput(teamId);
  const { member: signedInMember, logout } = useAuth();
  const memberMutations = useMemberMutations();
  const guestMutations = useGuestMutations();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isPending) {
    return <LoadingState />;
  }
  if (isError || input === null) {
    return <ErrorState message="Could not load people." />;
  }
  const ledger: LedgerInput = input;
  const activeCount = ledger.members.filter((m) => m.active).length;

  const mutationProblem =
    memberMutations.create.error?.message ??
    memberMutations.update.error?.message ??
    memberMutations.remove.error?.message ??
    guestMutations.create.error?.message ??
    guestMutations.remove.error?.message ??
    null;

  const addMember = (name: string, username: string): string | null => {
    if (nameTaken(name, ledger.members)) {
      return "A member with that name already exists.";
    }
    const candidate = { id: newId(), name, active: true };
    const result = isRemote
      ? MemberCreate.safeParse({ ...candidate, username })
      : Member.safeParse(candidate);
    if (!result.success) {
      return firstIssueMessage(result.error);
    }
    if (ledger.members.some((m) => m.username !== undefined && m.username === result.data.username)) {
      return "That username is already taken.";
    }
    memberMutations.create.mutate(result.data);
    return null;
  };

  const addGuest = (name: string): string | null => {
    if (nameTaken(name, ledger.guests)) {
      return "A guest with that name already exists.";
    }
    const result = Guest.safeParse({ id: newId(), teamId, name });
    if (!result.success) {
      return firstIssueMessage(result.error);
    }
    guestMutations.create.mutate(result.data);
    return null;
  };

  const renameMember = (member: MemberT, name: string): string | null => {
    if (nameTaken(name, ledger.members, member.id)) {
      return "A member with that name already exists.";
    }
    const result = Member.safeParse({ ...member, name });
    if (!result.success) {
      return firstIssueMessage(result.error);
    }
    memberMutations.update.mutate(result.data);
    return null;
  };

  const renameGuest = (guest: GuestT, name: string): string | null => {
    if (nameTaken(name, ledger.guests, guest.id)) {
      return "A guest with that name already exists.";
    }
    const result = Guest.safeParse({ ...guest, name });
    if (!result.success) {
      return firstIssueMessage(result.error);
    }
    guestMutations.update.mutate(result.data);
    return null;
  };

  const toggleActive = async (member: MemberT): Promise<void> => {
    if (member.active && activeCount === 1) {
      await confirmAsync("Cannot deactivate", "At least one member must stay active.");
      return;
    }
    if (
      member.active &&
      ledger.guestBookings.some((b) => b.paidBy === "ALL") &&
      (await confirmAsync(
        "Heads up",
        'Deactivating changes how existing "ALL"-funded guest bookings are shared. Continue?',
      )) === false
    ) {
      return;
    }
    memberMutations.update.mutate({ ...member, active: !member.active });
  };

  const memberSubtitle = (member: MemberT): string => {
    const status = member.active ? "Active" : "Inactive";
    return member.username === undefined ? status : `${status} · @${member.username}`;
  };

  return (
    <Screen>
      <SectionTitle label="Members" />
      <AddPersonRow label="New member" withUsername={isRemote} onAdd={addMember} />
      <FormError message={mutationProblem} />
      <View>
        {ledger.members.map((member) => (
          <View key={member.id}>
            <ListItem
              title={member.name}
              subtitle={memberSubtitle(member)}
              onPress={() => setExpandedId((prev) => (prev === member.id ? null : member.id))}
            />
            {expandedId === member.id ? (
              <PersonEditor
                name={member.name}
                references={countPersonReferences(member.id, ledger)}
                extraAction={{
                  label: member.active ? "Deactivate" : "Activate",
                  onPress: () => {
                    void toggleActive(member);
                  },
                }}
                onRename={(name) => renameMember(member, name)}
                onDelete={() => memberMutations.remove.mutate(member.id)}
              />
            ) : null}
          </View>
        ))}
      </View>

      <SectionTitle label="Guests" />
      <AddPersonRow label="New guest" withUsername={false} onAdd={addGuest} />
      {ledger.guests.length === 0 ? (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">No guests yet.</Text>
      ) : (
        <View>
          {ledger.guests.map((guest) => (
            <View key={guest.id}>
              <ListItem
                title={guest.name}
                subtitle="Guest"
                onPress={() => setExpandedId((prev) => (prev === guest.id ? null : guest.id))}
              />
              {expandedId === guest.id ? (
                <PersonEditor
                  name={guest.name}
                  references={countPersonReferences(guest.id, ledger)}
                  onRename={(name) => renameGuest(guest, name)}
                  onDelete={() => guestMutations.remove.mutate(guest.id)}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}

      {isRemote ? (
        <View className="mt-4 gap-2">
          <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            {signedInMember === null ? "" : `Signed in as ${signedInMember.name}`}
          </Text>
          <Button label="Log out" variant="ghost" onPress={() => void logout()} />
        </View>
      ) : null}
    </Screen>
  );
}
