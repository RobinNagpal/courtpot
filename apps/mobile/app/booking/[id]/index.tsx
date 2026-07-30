import type { ReactElement } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGuestBookings, useMemberBookings } from "@courtpot/api";
import { memberBookingSplit } from "@courtpot/domain";
import { guestBookingTotal } from "@courtpot/schemas";
import type { GuestBookingT, MemberBookingT } from "@courtpot/schemas";
import { AvatarRow, ErrorState, ListItem, LoadingState, SectionTitle, formatCents } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { Detail } from "../../../components/Detail";
import { EntityHeading } from "../../../components/EntityHeading";
import { EditButton } from "../../../components/EditButton";
import { payerLabel } from "../../../lib/bookings";
import { usePersonNames } from "../../../lib/people";

/** Read-only detail for either kind of booking. The pencil leads to the form. */
export default function BookingViewScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberBookings = useMemberBookings();
  const guestBookings = useGuestBookings();
  const names = usePersonNames();

  if (memberBookings.isPending || guestBookings.isPending) {
    return <LoadingState />;
  }
  if (memberBookings.isError || guestBookings.isError) {
    return <ErrorState message="Could not load the booking." />;
  }

  const memberBooking = memberBookings.data.find((booking) => booking.id === id);
  const guestBooking = guestBookings.data.find((booking) => booking.id === id);
  const nameOf = (personId: string): string => names.get(personId) ?? "?";

  if (memberBooking !== undefined) {
    return <MemberBookingView booking={memberBooking} nameOf={nameOf} />;
  }
  if (guestBooking !== undefined) {
    return <GuestBookingView booking={guestBooking} names={names} nameOf={nameOf} />;
  }
  return <ErrorState message="Booking not found." />;
}

function MemberBookingView({
  booking,
  nameOf,
}: {
  booking: MemberBookingT;
  nameOf: (id: string) => string;
}): ReactElement {
  const router = useRouter();
  const toMember = (memberId: string): void => router.push(`/member/${memberId}`);
  const split = memberBookingSplit(booking);
  const total = Object.values(split).reduce((sum, share) => sum + share, 0);
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Member booking",
          headerRight: () => <EditButton href={`/booking/${booking.id}/edit`} />,
        }}
      />
      <EntityHeading name={booking.title === "" ? "Member booking" : booking.title} />
      <View>
        <Detail label="Date" value={booking.date} />
        <Detail label="Total" value={formatCents(total)} />
        <Detail
          label={`Players (${booking.memberIds.length})`}
          value={
            <AvatarRow
              people={booking.memberIds.map((memberId) => ({ id: memberId, name: nameOf(memberId) }))}
              onPress={toMember}
            />
          }
        />
      </View>

      <SectionTitle label="Paid by" />
      <View>
        {booking.payers.map((payer) => (
          <ListItem
            key={payer.memberId}
            title={nameOf(payer.memberId)}
            subtitle={`fronted ${formatCents(payer.amount)}`}
            onPress={() => toMember(payer.memberId)}
          />
        ))}
      </View>

      <SectionTitle label="Each player owes" />
      <View>
        {Object.entries(split).map(([memberId, share]) => (
          <ListItem
            key={memberId}
            title={nameOf(memberId)}
            subtitle={formatCents(share)}
            onPress={() => toMember(memberId)}
          />
        ))}
      </View>
    </Screen>
  );
}

function GuestBookingView({
  booking,
  names,
  nameOf,
}: {
  booking: GuestBookingT;
  names: Map<string, string>;
  nameOf: (id: string) => string;
}): ReactElement {
  const router = useRouter();
  const toGuest = (guestId: string): void => router.push(`/guest/${guestId}`);
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Guest booking",
          headerRight: () => <EditButton href={`/booking/${booking.id}/edit`} />,
        }}
      />
      <EntityHeading name={booking.title === "" ? "Guest booking" : booking.title} />
      <View>
        <Detail label="Date" value={booking.date} />
        <Detail label="Total" value={formatCents(guestBookingTotal(booking))} />
        <Detail label="Paid by" value={payerLabel(booking, names)} />
        <Detail
          label={`Guests (${booking.guests.length})`}
          value={
            <AvatarRow
              people={booking.guests.map((c) => ({ id: c.guestId, name: nameOf(c.guestId) }))}
              onPress={toGuest}
            />
          }
        />
      </View>

      <SectionTitle label="Charged" />
      <View>
        {booking.guests.map((charge) => (
          <ListItem
            key={charge.guestId}
            title={nameOf(charge.guestId)}
            subtitle={formatCents(charge.amount)}
            onPress={() => toGuest(charge.guestId)}
          />
        ))}
      </View>
    </Screen>
  );
}
