import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMemberBookingMutations, useMemberBookings } from "@courtpot/api";
import { memberBookingSplit } from "@courtpot/domain";
import { AvatarRow, Button, EmptyState, ErrorState, ListItem, LoadingState, formatCents } from "@courtpot/ui";
import { Screen } from "../components/Screen";
import { RowMenu } from "../components/RowMenu";
import { ChipGroup } from "../components/ChipGroup";
import { matchesMemberBooking } from "../lib/bookings";
import { usePersonNames, usePersonOptions } from "../lib/people";
import { useActiveTeamId } from "../lib/team";

export default function MemberBookingsScreen(): ReactElement {
  const router = useRouter();
  const teamId = useActiveTeamId();
  const bookings = useMemberBookings();
  const { remove } = useMemberBookingMutations();
  const people = usePersonOptions();
  const names = usePersonNames();
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const rows = useMemo(() => {
    const mine = (bookings.data ?? []).filter((booking) => booking.teamId === teamId);
    const filtered = personFilter === null ? mine : mine.filter((b) => matchesMemberBooking(b, personFilter));
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }, [bookings.data, teamId, personFilter]);

  if (bookings.isPending) {
    return <LoadingState />;
  }
  if (bookings.isError) {
    return <ErrorState message="Could not load member bookings." />;
  }

  return (
    <Screen nav>
      <Button label="+ Member booking" onPress={() => router.push("/booking/member/new")} />

      <ChipGroup
        label="Filter by person"
        options={people.map((p) => ({ id: p.id, label: p.name }))}
        selectedIds={personFilter === null ? [] : [personFilter]}
        onToggle={(id) => setPersonFilter((prev) => (prev === id ? null : id))}
      />

      {rows.length === 0 ? (
        <EmptyState message="No member bookings yet. Add one with the button above." />
      ) : (
        <View>
          {rows.map((booking) => {
            const total = Object.values(memberBookingSplit(booking)).reduce((sum, share) => sum + share, 0);
            return (
              <ListItem
                key={booking.id}
                title={booking.title === "" ? "Member booking" : booking.title}
                subtitle={`${booking.date} · ${booking.memberIds.length} players · ${formatCents(total)} total · ${
                  names.get(booking.payers[0]?.memberId ?? "") ?? "?"
                } fronted`}
                onPress={() => router.push(`/booking/${booking.id}`)}
                footer={<AvatarRow names={booking.memberIds.map((id) => names.get(id) ?? "?")} />}
                right={
                  <RowMenu
                    accessibilityLabel="Booking actions"
                    actions={[
                      { label: "Edit", onPress: () => router.push(`/booking/${booking.id}`) },
                      {
                        label: "Delete",
                        destructive: true,
                        confirm: {
                          title: "Delete booking?",
                          message: `${booking.date} · ${formatCents(total)}. This removes it from everyone's balance.`,
                        },
                        onPress: () => remove.mutate(booking.id),
                      },
                    ]}
                  />
                }
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
