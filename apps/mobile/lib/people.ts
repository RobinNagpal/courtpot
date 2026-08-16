import { useMemo } from "react";
import { useGuests, useMembers } from "@courtpot/api";
import { countMatchReferences, countPersonReferences } from "@courtpot/domain";
import type { LedgerInput } from "@courtpot/domain";
import type { MatchT, PersonKind } from "@courtpot/schemas";

export interface PersonOption {
  id: string;
  name: string;
  kind: PersonKind;
}

/** Members then guests, flattened for pickers that span both. */
export function usePersonOptions(): PersonOption[] {
  const members = useMembers();
  const guests = useGuests();
  return useMemo(
    () => [
      ...(members.data ?? []).map((m): PersonOption => ({ id: m.id, name: m.name, kind: "member" })),
      ...(guests.data ?? []).map((g): PersonOption => ({ id: g.id, name: g.name, kind: "guest" })),
    ],
    [members.data, guests.data],
  );
}

export function usePersonNames(): Map<string, string> {
  const options = usePersonOptions();
  return useMemo(() => new Map(options.map((option) => [option.id, option.name])), [options]);
}

/** Everything that would be left dangling if this person were deleted. */
export function countReferences(
  personId: string,
  ledger: LedgerInput,
  matches: readonly MatchT[],
): number {
  return countPersonReferences(personId, ledger) + countMatchReferences(personId, matches);
}

export function referencesLabel(references: number): string {
  return `${references} booking, transfer or match row${references === 1 ? "" : "s"}`;
}

/** Why deleting is blocked, or undefined when nothing points at them. */
export function deleteBlockedReason(name: string, references: number): string | undefined {
  return references === 0 ? undefined : `${name} appears in ${referencesLabel(references)}. Delete those first.`;
}
