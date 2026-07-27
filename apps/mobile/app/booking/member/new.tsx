import type { ReactElement } from "react";
import { useRouter } from "expo-router";
import { useMemberBookingMutations } from "@courtpot/api";
import { Screen } from "../../../components/Screen";
import { MemberBookingForm } from "../../../components/MemberBookingForm";

export default function NewMemberBookingScreen(): ReactElement {
  const router = useRouter();
  const { create } = useMemberBookingMutations();
  return (
    <Screen>
      <MemberBookingForm
        submitLabel="Add booking"
        onSubmit={(booking) => {
          create.mutate(booking);
          router.back();
        }}
      />
    </Screen>
  );
}
