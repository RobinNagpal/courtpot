import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useGuests, useMembers } from "@courtpot/api";
import { GuestBooking } from "@courtpot/schemas";
import type { GuestBookingT, PaidByT } from "@courtpot/schemas";
import { Button, Input, formatCents, centsToDollarsText, parseDollarsToCents } from "@courtpot/ui";
import { firstIssueMessage } from "../lib/forms";
import { newId } from "../lib/id";
import { useActiveTeamId } from "../lib/team";
import { todayIsoDate } from "../lib/date";
import { ChipGroup } from "./ChipGroup";
import { FormError } from "./FormError";

/** "All" is a shortcut for every active member, not a separate funding mode. */
const ALL = "ALL";

interface GuestBookingFormProps {
  initial?: GuestBookingT;
  submitLabel: string;
  onSubmit: (booking: GuestBookingT) => void;
}

export function GuestBookingForm({ initial, submitLabel, onSubmit }: GuestBookingFormProps): ReactElement {
  const teamId = useActiveTeamId();
  const members = useMembers();
  const guests = useGuests();
  const [date, setDate] = useState(initial?.date ?? todayIsoDate());
  const [title, setTitle] = useState(initial?.title ?? "");
  // Amount per guest, as typed. Keyed by guest id; a key present means selected.
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.guests ?? []).map((g) => [g.guestId, centsToDollarsText(g.amount)])),
  );
  const [payerIds, setPayerIds] = useState<string[]>(() =>
    initial === undefined || initial.paidBy === ALL ? [] : [...initial.paidBy],
  );
  const [allPayers, setAllPayers] = useState(initial?.paidBy === ALL);
  const [error, setError] = useState<string | null>(null);

  const guestOptions = (guests.data ?? []).map((g) => ({ id: g.id, label: g.name }));
  const activeMembers = (members.data ?? []).filter((m) => m.active);
  const selectedGuestIds = Object.keys(amounts);

  const toggleGuest = (id: string): void => {
    setAmounts((prev) => {
      if (!(id in prev)) {
        return { ...prev, [id]: "" };
      }
      return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id));
    });
  };

  const togglePayer = (id: string): void => {
    if (id === ALL) {
      setAllPayers((prev) => !prev);
      setPayerIds([]);
      return;
    }
    setAllPayers(false);
    setPayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const charges = selectedGuestIds.map((guestId) => ({
    guestId,
    amount: parseDollarsToCents(amounts[guestId] ?? ""),
  }));
  const total = charges.reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const handleSubmit = (): void => {
    if (charges.length === 0) {
      setError("Pick at least one guest.");
      return;
    }
    if (charges.some((c) => c.amount === null || c.amount <= 0)) {
      setError("Enter a positive amount for every guest.");
      return;
    }
    if (!allPayers && payerIds.length === 0) {
      setError("Pick who paid.");
      return;
    }
    if (allPayers && activeMembers.length === 0) {
      setError("An All-funded booking needs at least one active member.");
      return;
    }
    const paidBy: PaidByT = allPayers ? ALL : payerIds;
    const result = GuestBooking.safeParse({
      id: initial?.id ?? newId(),
      teamId: initial?.teamId ?? teamId,
      date,
      title,
      guests: charges,
      paidBy,
    });
    if (!result.success) {
      setError(firstIssueMessage(result.error));
      return;
    }
    setError(null);
    onSubmit(result.data);
  };

  const payerCount = allPayers ? activeMembers.length : payerIds.length;

  return (
    <View className="gap-4">
      <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Drop-in with Sam" />
      <ChipGroup
        label="Guests"
        options={guestOptions}
        selectedIds={selectedGuestIds}
        onToggle={toggleGuest}
      />
      {selectedGuestIds.map((guestId) => (
        <Input
          key={guestId}
          label={`${guestOptions.find((o) => o.id === guestId)?.label ?? "Guest"} — amount ($)`}
          value={amounts[guestId] ?? ""}
          onChangeText={(text) => setAmounts((prev) => ({ ...prev, [guestId]: text }))}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      ))}
      <ChipGroup
        label="Paid by"
        options={[{ id: ALL, label: "All active members" }, ...activeMembers.map((m) => ({ id: m.id, label: m.name }))]}
        selectedIds={allPayers ? [ALL] : payerIds}
        onToggle={togglePayer}
      />
      {total > 0 && payerCount > 0 ? (
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {`${formatCents(total)} charged across ${charges.length} guest${charges.length === 1 ? "" : "s"}, split between ${payerCount} payer${payerCount === 1 ? "" : "s"}.`}
        </Text>
      ) : null}
      <FormError message={error} />
      <Button label={submitLabel} onPress={handleSubmit} />
    </View>
  );
}
