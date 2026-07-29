import { useState } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import { Transfer } from "@courtpot/schemas";
import type { TransferT } from "@courtpot/schemas";
import { Button, Input, parseDollarsToCents } from "@courtpot/ui";
import { firstIssueMessage } from "../lib/forms";
import { newId } from "../lib/id";
import { useActiveTeamId } from "../lib/team";
import { todayIsoDate } from "../lib/date";
import { usePersonOptions } from "../lib/people";
import { ChipGroup } from "./ChipGroup";
import { FormError } from "./FormError";

interface TransferFormProps {
  submitLabel: string;
  onSubmit: (transfer: TransferT) => void;
}

export function TransferForm({ submitLabel, onSubmit }: TransferFormProps): ReactElement {
  const teamId = useActiveTeamId();
  const people = usePersonOptions();
  const [date, setDate] = useState(todayIsoDate());
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = people.map((person) => ({
    id: person.id,
    label: person.kind === "guest" ? `${person.name} (guest)` : person.name,
  }));

  const handleSubmit = (): void => {
    const amount = parseDollarsToCents(amountText);
    if (fromId === null || toId === null) {
      setError("Pick both people.");
      return;
    }
    if (amount === null || amount <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    const result = Transfer.safeParse({
      id: newId(),
      teamId,
      date,
      fromId,
      toId,
      amount,
      note: note.trim() === "" ? undefined : note.trim(),
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
      <ChipGroup
        label="From"
        options={options}
        selectedIds={fromId === null ? [] : [fromId]}
        onToggle={(id) => setFromId((prev) => (prev === id ? null : id))}
      />
      <ChipGroup
        label="To"
        options={options}
        selectedIds={toId === null ? [] : [toId]}
        onToggle={(id) => setToId((prev) => (prev === id ? null : id))}
      />
      <Input label="Amount ($)" value={amountText} onChangeText={setAmountText} placeholder="0.00" keyboardType="decimal-pad" />
      <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
      <FormError message={error} />
      <Button label={submitLabel} onPress={handleSubmit} />
    </View>
  );
}
