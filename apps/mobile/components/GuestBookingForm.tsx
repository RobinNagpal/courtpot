import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useGuests, useMembers } from "@courtpot/api";
import { GuestBooking } from "@courtpot/schemas";
import type { GuestBookingT, PaidByT } from "@courtpot/schemas";
import { Button, Input, formatCents, centsToDollarsText, parseDollarsToCents } from "@courtpot/ui";
import { firstIssueMessage } from "../lib/forms";
import { newId } from "../lib/id";
import { todayIsoDate } from "../lib/date";
import { ChipGroup } from "./ChipGroup";
import { FormError } from "./FormError";

interface GuestBookingFormProps {
  initial?: GuestBookingT;
  submitLabel: string;
  onSubmit: (booking: GuestBookingT) => void;
}

export function GuestBookingForm({ initial, submitLabel, onSubmit }: GuestBookingFormProps): ReactElement {
  const members = useMembers();
  const guests = useGuests();
  const [date, setDate] = useState(initial?.date ?? todayIsoDate());
  const [title, setTitle] = useState(initial?.title ?? "");
  const [guestId, setGuestId] = useState<string | null>(initial?.guestId ?? null);
  const [paidBy, setPaidBy] = useState<PaidByT | null>(initial?.paidBy ?? null);
  const [amountText, setAmountText] = useState(initial === undefined ? "" : centsToDollarsText(initial.amount));
  const [error, setError] = useState<string | null>(null);

  const guestOptions = (guests.data ?? []).map((g) => ({ id: g.id, label: g.name }));
  const activeMembers = (members.data ?? []).filter((m) => m.active);
  const paidByOptions = [{ id: "ALL", label: "All (shared)" }, ...activeMembers.map((m) => ({ id: m.id, label: m.name }))];

  const guestName = guestOptions.find((option) => option.id === guestId)?.label;
  const amountCents = parseDollarsToCents(amountText);

  const handleSubmit = (): void => {
    if (guestId === null) {
      setError("Pick a guest.");
      return;
    }
    if (paidBy === null) {
      setError("Pick who paid.");
      return;
    }
    if (paidBy === "ALL" && activeMembers.length === 0) {
      setError("An ALL-funded booking needs at least one active member.");
      return;
    }
    if (amountCents === null || amountCents <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    const result = GuestBooking.safeParse({
      id: initial?.id ?? newId(),
      date,
      title,
      guestId,
      amount: amountCents,
      paidBy,
    });
    if (!result.success) {
      setError(firstIssueMessage(result.error));
      return;
    }
    setError(null);
    onSubmit(result.data);
  };

  return (
    <View className="gap-4">
      <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Drop-in with Sam" />
      <ChipGroup
        label="Guest"
        options={guestOptions}
        selectedIds={guestId === null ? [] : [guestId]}
        onToggle={(id) => setGuestId((prev) => (prev === id ? null : id))}
      />
      <Input label="Amount ($)" value={amountText} onChangeText={setAmountText} placeholder="0.00" keyboardType="decimal-pad" />
      <ChipGroup
        label="Paid by"
        options={paidByOptions}
        selectedIds={paidBy === null ? [] : [paidBy]}
        onToggle={(id) => setPaidBy((prev) => (prev === id ? null : id))}
      />
      {guestName !== undefined && amountCents !== null && amountCents > 0 ? (
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          {`${guestName} owes ${formatCents(amountCents)} until they pay it back${
            paidBy === "ALL" ? " to the shared members' budget" : ""
          }.`}
        </Text>
      ) : null}
      <FormError message={error} />
      <Button label={submitLabel} onPress={handleSubmit} />
    </View>
  );
}
