import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useGuestBookingMutations, useGuestBookings } from "@courtpot/api";
import { Button, EmptyState, ErrorState, ListItem, LoadingState } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { RowMenu } from "../components/RowMenu";
import { ChipGroup } from "../components/ChipGroup";
import { guestBookingSubtitle, guestLabel, matchesGuestBooking } from "../lib/bookings";
import { usePersonNames, usePersonOptions } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function GuestBookingsScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const bookings = useGuestBookings();
  const { remove } = useGuestBookingMutations();
  const names = usePersonNames();
  const people = usePersonOptions();
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const rows = useMemo(() => {
    const mine = (bookings.data ?? []).filter((booking) => booking.teamId === teamId);
    const filtered = personFilter === null ? mine : mine.filter((b) => matchesGuestBooking(b, personFilter));
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }, [bookings.data, teamId, personFilter]);

  if (bookings.isPending) {
    return <LoadingState />;
  }
  if (bookings.isError) {
    return <ErrorState message="Could not load guest bookings." />;
  }

  return (
    <Screen>
      <Button label="+ Guest booking" onPress={() => router.push("/booking/guest/new")} />

      <ChipGroup
        label="Filter by person"
        options={people.map((p) => ({ id: p.id, label: p.name }))}
        selectedIds={personFilter === null ? [] : [personFilter]}
        onToggle={(id) => setPersonFilter((prev) => (prev === id ? null : id))}
      />

      {rows.length === 0 ? (
        <EmptyState message="No guest bookings yet. Add one with the button above." />
      ) : (
        <View>
          {rows.map((booking) => (
            <ListItem
              key={booking.id}
              title={booking.title === "" ? `Guest: ${guestLabel(booking, names)}` : booking.title}
              subtitle={guestBookingSubtitle(booking, names)}
              onPress={() => router.push(`/booking/${booking.id}`)}
              right={
                <RowMenu
                  accessibilityLabel="Guest booking actions"
                  actions={[
                    { label: "Edit", onPress: () => router.push(`/booking/${booking.id}`) },
                    {
                      label: "Delete",
                      destructive: true,
                      confirm: {
                        title: "Delete guest booking?",
                        message: guestBookingSubtitle(booking, names),
                      },
                      onPress: () => remove.mutate(booking.id),
                    },
                  ]}
                />
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
