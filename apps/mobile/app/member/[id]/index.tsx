import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useBalances, useLedgerInput, useMemberBookings, useMembers, useTransfers } from "@courtpot/api";
import { countPersonReferences, memberBookingSplit } from "@courtpot/domain";
import {
  BalanceChip,
  EmptyState,
  ErrorState,
  ListItem,
  LoadingState,
  SectionTitle,
  formatCents,
} from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EntityHeading } from "../../../components/EntityHeading";
import { PersonTransfers } from "../../../components/PersonTransfers";
import { EditButton } from "../../../components/EditButton";
import { matchesMemberBooking } from "../../../lib/bookings";
import { usePersonNames } from "../../../lib/people";
import { useActiveTeamId } from "../../../lib/team";

/** Read-only detail for one member. */
export default function MemberViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const teamId = useActiveTeamId();
  const members = useMembers();
  const bookings = useMemberBookings();
  const transfers = useTransfers();
  const names = usePersonNames();
  const { input } = useLedgerInput(teamId);
  const { balances } = useBalances(teamId);

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

  const balance = balances.find((row) => row.personId === member.id);
  const references = input === null ? null : countPersonReferences(member.id, input);
  const mine = (bookings.data ?? [])
    .filter((booking) => booking.teamId === teamId && matchesMemberBooking(booking, member.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const theirTransfers = (transfers.data ?? [])
    .filter((t) => t.teamId === teamId && (t.fromId === member.id || t.toId === member.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  return (
    <Screen>
      <Stack.Screen
        options={{ title: "Member", headerRight: () => <EditButton href={`/member/${member.id}/edit`} /> }}
      />
      <EntityHeading
        name={member.name}
        subtitle={member.active ? "Active member" : "Inactive member"}
        withAvatar
      />
      <View>
        <Detail label="Username" value={member.username ?? "—"} />
        <Detail label="Status" value={member.active ? "Active" : "Inactive"} />
        <Detail label="Platform role" value={member.role} />
        <Detail
          label="Balance"
          value={balance === undefined ? "—" : <BalanceChip owedCents={balance.owedCents} />}
        />
        <Detail
          label="Appears in"
          value={references === null ? "—" : `${references} booking/transfer row${references === 1 ? "" : "s"}`}
        />
      </View>

      <SectionTitle label="Member bookings" />
      {mine.length === 0 ? (
        <EmptyState message="Not on any member booking yet." />
      ) : (
        <View>
          {mine.map((booking) => {
            const share = memberBookingSplit(booking)[member.id];
            return (
              <ListItem
                key={booking.id}
                title={booking.title === "" ? "Member booking" : booking.title}
                subtitle={`${booking.date} · their share ${share === undefined ? "—" : formatCents(share)}`}
                onPress={() => router.push(`/booking/${booking.id}`)}
              />
            );
          })}
        </View>
      )}
      <SectionTitle label="Transfers" />
      <PersonTransfers
        personId={member.id}
        transfers={theirTransfers}
        names={names}
        onOpen={(transferId) => router.push(`/transfer/${transferId}`)}
      />
    </Screen>
  );
}
