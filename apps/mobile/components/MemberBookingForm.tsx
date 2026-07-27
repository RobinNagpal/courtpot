import { useState } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useMembers } from "@courtpot/api";
import { MemberBooking } from "@courtpot/schemas";
import type { MemberBookingT, PayerT } from "@courtpot/schemas";
import { Button, Input, centsToDollarsText, formatCents, parseDollarsToCents } from "@courtpot/ui";
import { firstIssueMessage } from "../lib/forms";
import { newId } from "../lib/id";
import { todayIsoDate } from "../lib/date";
import { ChipGroup } from "./ChipGroup";
import { FormError } from "./FormError";

interface PayerDraft {
  memberId: string | null;
  amountText: string;
}

interface MemberBookingFormProps {
  initial?: MemberBookingT;
  submitLabel: string;
  onSubmit: (booking: MemberBookingT) => void;
}

const MAX_PAYERS = 2;

export function MemberBookingForm({ initial, submitLabel, onSubmit }: MemberBookingFormProps): ReactElement {
  const members = useMembers();
  const [date, setDate] = useState(initial?.date ?? todayIsoDate());
  const [title, setTitle] = useState(initial?.title ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [payers, setPayers] = useState<PayerDraft[]>(
    initial === undefined
      ? [{ memberId: null, amountText: "" }]
      : initial.payers.map((payer) => ({ memberId: payer.memberId, amountText: centsToDollarsText(payer.amount) })),
  );
  const [error, setError] = useState<string | null>(null);

  const memberOptions = (members.data ?? [])
    .filter((m) => m.active || memberIds.includes(m.id))
    .map((m) => ({ id: m.id, label: m.name }));

  const togglePlayer = (id: string): void => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]));
  };
  const setPayer = (index: number, patch: Partial<PayerDraft>): void => {
    setPayers((prev) => prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  };

  const totalCents = payers.reduce((sum, draft) => sum + (parseDollarsToCents(draft.amountText) ?? 0), 0);
  const shareCents = memberIds.length > 0 ? Math.floor(totalCents / memberIds.length) : 0;

  const handleSubmit = (): void => {
    const resolvedPayers: PayerT[] = [];
    for (const draft of payers) {
      if (draft.memberId === null && draft.amountText.trim() === "") {
        continue;
      }
      const amount = parseDollarsToCents(draft.amountText);
      if (draft.memberId === null || amount === null || amount <= 0) {
        setError("Each payer needs a member and a positive amount.");
        return;
      }
      resolvedPayers.push({ memberId: draft.memberId, amount });
    }
    const result = MemberBooking.safeParse({
      id: initial?.id ?? newId(),
      date,
      title,
      memberIds,
      payers: resolvedPayers,
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
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Sunday courts" />
      <ChipGroup label="Who played (split equally)" options={memberOptions} selectedIds={memberIds} onToggle={togglePlayer} />

      {payers.map((draft, index) => (
        <View key={index} className="gap-2">
          <ChipGroup
            label={index === 0 ? "Paid by" : "Second payer"}
            options={memberOptions}
            selectedIds={draft.memberId === null ? [] : [draft.memberId]}
            onToggle={(id) => setPayer(index, { memberId: draft.memberId === id ? null : id })}
          />
          <Input
            label={`Amount paid ($)${index === 0 ? "" : " — second payer"}`}
            value={draft.amountText}
            onChangeText={(text) => setPayer(index, { amountText: text })}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
      ))}
      {payers.length < MAX_PAYERS ? (
        <Button label="Add second payer" variant="ghost" onPress={() => setPayers((prev) => [...prev, { memberId: null, amountText: "" }])} />
      ) : (
        <Button label="Remove second payer" variant="ghost" onPress={() => setPayers((prev) => prev.slice(0, 1))} />
      )}

      <Text className="text-sm text-neutral-600 dark:text-neutral-400">
        {memberIds.length > 0
          ? `Total ${formatCents(totalCents)}, split ${memberIds.length} ways = ${formatCents(shareCents)} each`
          : `Total ${formatCents(totalCents)} — pick who played to see the split`}
      </Text>

      <FormError message={error} />
      <Button label={submitLabel} onPress={handleSubmit} />
    </View>
  );
}
