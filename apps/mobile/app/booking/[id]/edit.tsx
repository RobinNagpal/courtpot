import type { ReactElement } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGuestBookingMutations, useGuestBookings, useMemberBookingMutations, useMemberBookings } from "@courtpot/api";
import { Button, ErrorState, LoadingState, confirmAsync } from "@courtpot/ui";
import { Screen } from "../../../components/Screen";
import { MemberBookingForm } from "../../../components/MemberBookingForm";
import { GuestBookingForm } from "../../../components/GuestBookingForm";

export default function EditBookingScreen(): ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberBookings = useMemberBookings();
  const guestBookings = useGuestBookings();
  const memberBookingMutations = useMemberBookingMutations();
  const guestBookingMutations = useGuestBookingMutations();

  if (memberBookings.isPending || guestBookings.isPending) {
    return <LoadingState />;
  }
  if (memberBookings.isError || guestBookings.isError) {
    return <ErrorState message="Could not load the booking." />;
  }

  const memberBooking = memberBookings.data.find((booking) => booking.id === id);
  const guestBooking = guestBookings.data.find((booking) => booking.id === id);

  const deleteButton = (onConfirm: () => void): ReactElement => (
    <Button
      label="Delete booking"
      variant="danger"
      onPress={() => {
        void confirmAsync("Delete booking?", "This removes it from everyone's balance.").then((confirmed) => {
          if (confirmed) {
            onConfirm();
            router.back();
          }
        });
      }}
    />
  );

  if (memberBooking !== undefined) {
    return (
      <Screen>
        <MemberBookingForm
          initial={memberBooking}
          submitLabel="Save changes"
          onSubmit={(booking) => {
            memberBookingMutations.update.mutate(booking);
            router.back();
          }}
        />
        {deleteButton(() => memberBookingMutations.remove.mutate(memberBooking.id))}
      </Screen>
    );
  }
  if (guestBooking !== undefined) {
    return (
      <Screen>
        <GuestBookingForm
          initial={guestBooking}
          submitLabel="Save changes"
          onSubmit={(booking) => {
            guestBookingMutations.update.mutate(booking);
            router.back();
          }}
        />
        {deleteButton(() => guestBookingMutations.remove.mutate(guestBooking.id))}
      </Screen>
    );
  }
  return <ErrorState message="Booking not found." />;
}
