import type { ReactElement } from "react";
import { useRouter } from "expo-router";
import { useGuestBookingMutations } from "@courtpot/api";
import { Screen } from "../../../components/Screen";
import { GuestBookingForm } from "../../../components/GuestBookingForm";

export default function NewGuestBookingScreen(): ReactElement {
  const router = useRouter();
  const { create } = useGuestBookingMutations();
  return (
    <Screen>
      <GuestBookingForm
        submitLabel="Add booking"
        onSubmit={(booking) => {
          create.mutate(booking);
          router.back();
        }}
      />
    </Screen>
  );
}
