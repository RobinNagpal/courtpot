import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useGuestBookings, useMemberBookings } from "@courtpot/api";
import { memberBookingSplit } from "@courtpot/domain";
import type { GuestBookingT, MemberBookingT } from "@courtpot/schemas";
import { Button, EmptyState, ErrorState, ListItem, LoadingState, formatCents } from "@courtpot/ui";
import { Screen } from "../../components/Screen";
import { ChipGroup } from "../../components/ChipGroup";
import { usePersonNames, usePersonOptions } from "../../lib/people";

type BookingRow =
  | { kind: "member"; booking: MemberBookingT }
  | { kind: "guest"; booking: GuestBookingT };

function rowMatchesPerson(row: BookingRow, personId: string): boolean {
  if (row.kind === "member") {
    return (
      row.booking.memberIds.includes(personId) || row.booking.payers.some((payer) => payer.memberId === personId)
    );
  }
  return row.booking.guestId === personId || row.booking.paidBy === personId;
}

export default function BookingsScreen(): ReactElement {
  const router = useRouter();
  const memberBookings = useMemberBookings();
  const guestBookings = useGuestBookings();
  const names = usePersonNames();
  const people = usePersonOptions();
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const rows = useMemo((): BookingRow[] => {
    const all: BookingRow[] = [
      ...(memberBookings.data ?? []).map((booking): BookingRow => ({ kind: "member", booking })),
      ...(guestBookings.data ?? []).map((booking): BookingRow => ({ kind: "guest", booking })),
    ];
    const filtered = personFilter === null ? all : all.filter((row) => rowMatchesPerson(row, personFilter));
    return filtered.sort(
      (a, b) => b.booking.date.localeCompare(a.booking.date) || a.booking.id.localeCompare(b.booking.id),
    );
  }, [memberBookings.data, guestBookings.data, personFilter]);

  if (memberBookings.isPending || guestBookings.isPending) {
    return <LoadingState />;
  }
  if (memberBookings.isError || guestBookings.isError) {
    return <ErrorState message="Could not load bookings." />;
  }

  return (
    <Screen>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label="+ Member booking" onPress={() => router.push("/booking/member/new")} />
        </View>
        <View className="flex-1">
          <Button label="+ Guest booking" variant="ghost" onPress={() => router.push("/booking/guest/new")} />
        </View>
      </View>

      <ChipGroup
        label="Filter by person"
        options={people.map((p) => ({ id: p.id, label: p.name }))}
        selectedIds={personFilter === null ? [] : [personFilter]}
        onToggle={(id) => setPersonFilter((prev) => (prev === id ? null : id))}
      />

      {rows.length === 0 ? (
        <EmptyState message="No bookings yet. Add one with the buttons above." />
      ) : (
        <View>
          {rows.map((row) =>
            row.kind === "member" ? (
              <ListItem
                key={row.booking.id}
                title={row.booking.title === "" ? "Member booking" : row.booking.title}
                subtitle={`${row.booking.date} · ${row.booking.memberIds.length} players · ${formatCents(
                  Object.values(memberBookingSplit(row.booking)).reduce((sum, share) => sum + share, 0),
                )} total`}
                onPress={() => router.push(`/booking/${row.booking.id}`)}
              />
            ) : (
              <ListItem
                key={row.booking.id}
                title={row.booking.title === "" ? `Guest: ${names.get(row.booking.guestId) ?? "?"}` : row.booking.title}
                subtitle={`${row.booking.date} · ${names.get(row.booking.guestId) ?? "?"} owes ${formatCents(
                  row.booking.amount,
                )} · paid by ${row.booking.paidBy === "ALL" ? "all members" : (names.get(row.booking.paidBy) ?? "?")}`}
                onPress={() => router.push(`/booking/${row.booking.id}`)}
              />
            ),
          )}
        </View>
      )}
    </Screen>
  );
}
