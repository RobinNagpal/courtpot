import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useBalances, useGuestBookings, useGuests, useLedgerInput, useMatches, useTransfers } from "@courtpot/api";
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
import { matchesGuestBooking } from "../../../lib/bookings";
import { countReferences, referencesLabel, usePersonNames } from "../../../lib/people";
import { useActiveTeamId } from "../../../lib/team";

/** Read-only detail for one guest. */
export default function GuestViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const teamId = useActiveTeamId();
  const guests = useGuests();
  const bookings = useGuestBookings();
  const transfers = useTransfers();
  const names = usePersonNames();
  const { input } = useLedgerInput(teamId);
  const matches = useMatches();
  const { balances } = useBalances(teamId);

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

  const teamMatches = (matches.data ?? []).filter((match) => match.teamId === teamId);
  const balance = balances.find((row) => row.personId === guest.id);
  // Null until both are in — a half-loaded count would understate it.
  const references =
    input === null || matches.data === undefined ? null : countReferences(guest.id, input, teamMatches);
  const mine = (bookings.data ?? [])
    .filter((booking) => booking.teamId === teamId && matchesGuestBooking(booking, guest.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const theirTransfers = (transfers.data ?? [])
    .filter((t) => t.teamId === teamId && (t.fromId === guest.id || t.toId === guest.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  return (
    <Screen>
      <Stack.Screen
        options={{ title: "Guest", headerRight: () => <EditButton href={`/guest/${guest.id}/edit`} /> }}
      />
      <EntityHeading name={guest.name} subtitle="Guest" withAvatar />
      <View>
        <Detail label="Note" value={guest.note ?? "—"} />
        <Detail
          label="Balance"
          value={balance === undefined ? "—" : <BalanceChip owedCents={balance.owedCents} />}
        />
        <Detail
          label="Appears in"
          value={references === null ? "—" : referencesLabel(references)}
        />
      </View>

      <SectionTitle label="Guest bookings" />
      {mine.length === 0 ? (
        <EmptyState message="Not on any guest booking yet." />
      ) : (
        <View>
          {mine.map((booking) => {
            const charged = booking.guests.find((charge) => charge.guestId === guest.id)?.amount;
            return (
              <ListItem
                key={booking.id}
                title={booking.title === "" ? "Guest booking" : booking.title}
                subtitle={`${booking.date} · charged ${charged === undefined ? "—" : formatCents(charged)}`}
                onPress={() => router.push(`/booking/${booking.id}`)}
              />
            );
          })}
        </View>
      )}
      <SectionTitle label="Transfers" />
      <PersonTransfers
        personId={guest.id}
        transfers={theirTransfers}
        names={names}
        onOpen={(transferId) => router.push(`/transfer/${transferId}`)}
      />
    </Screen>
  );
}
