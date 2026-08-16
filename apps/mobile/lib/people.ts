import { useMemo } from "react";
import { useGuests, useMembers } from "@courtpot/api";
import { countMatchReferences, countPersonReferences } from "@courtpot/domain";
import type { LedgerInput } from "@courtpot/domain";
import type { MatchT, PersonKind } from "@courtpot/schemas";
import { personHref } from "./personLink";
import { useActiveTeamId } from "./team";

export interface PersonOption {
  id: string;
  name: string;
  kind: PersonKind;
}

/**
 * Members then guests, flattened for pickers that span both.
 *
 * Guests are scoped to the active team. `GET /guests` returns every team's, so
 * without this a picker would offer — and let you record against your own team —
 * somebody who belongs to a different one. Members are not scoped: they are
 * platform-wide and any of them can appear on a row.
 */
export function usePersonOptions(): PersonOption[] {
  const teamId = useActiveTeamId();
  const members = useMembers();
  const guests = useGuests();
  return useMemo(
    () => [
      ...(members.data ?? []).map((m): PersonOption => ({ id: m.id, name: m.name, kind: "member" })),
      ...(guests.data ?? [])
        .filter((g) => g.teamId === teamId)
        .map((g): PersonOption => ({ id: g.id, name: g.name, kind: "guest" })),
    ],
    [teamId, members.data, guests.data],
  );
}

/**
 * Where tapping a person goes, or null when we cannot say who they are. Guessing
 * "member" sends anyone unknown — a deleted person, or a guest while the guest
 * query is failing — to a page that confidently reports "Member not found."
 */
export function usePersonHref(): (personId: string) => string | null {
  const options = usePersonOptions();
  return (personId) => {
    const person = options.find((option) => option.id === personId);
    return person === undefined ? null : personHref(personId, person.kind);
  };
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
