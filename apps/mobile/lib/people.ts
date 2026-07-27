import { useMemo } from "react";
import { useGuests, useMembers } from "@courtpot/api";
import type { PersonKind } from "@courtpot/schemas";

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
