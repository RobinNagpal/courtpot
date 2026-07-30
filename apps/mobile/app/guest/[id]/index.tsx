import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useBalances, useGuestBookings, useGuests, useLedgerInput } from "@courtpot/api";
import { countPersonReferences } from "@courtpot/domain";
import {
  Avatar,
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
import { EditButton } from "../../../components/EditButton";
import { matchesGuestBooking } from "../../../lib/bookings";
import { useActiveTeamId } from "../../../lib/team";

/** Read-only detail for one guest. */
export default function GuestViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const teamId = useActiveTeamId();
  const guests = useGuests();
  const bookings = useGuestBookings();
  const { input } = useLedgerInput(teamId);
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

  const balance = balances.find((row) => row.personId === guest.id);
  const references = input === null ? null : countPersonReferences(guest.id, input);
  const mine = (bookings.data ?? [])
    .filter((booking) => booking.teamId === teamId && matchesGuestBooking(booking, guest.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  return (
    <Screen>
      <Stack.Screen
        options={{ title: guest.name, headerRight: () => <EditButton href={`/guest/${guest.id}/edit`} /> }}
      />
      <View className="items-center py-2">
        <Avatar name={guest.name} />
      </View>
      <View>
        <Detail label="Name" value={guest.name} />
        <Detail label="Note" value={guest.note ?? "—"} />
        <Detail
          label="Balance"
          value={balance === undefined ? "—" : <BalanceChip owedCents={balance.owedCents} />}
        />
        <Detail
          label="Appears in"
          value={references === null ? "—" : `${references} booking/transfer row${references === 1 ? "" : "s"}`}
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
    </Screen>
  );
}
