import type { PersonKind } from "@courtpot/schemas";

/** Where tapping a person takes you. */
export function personHref(id: string, kind: PersonKind): string {
  return kind === "member" ? `/member/${id}` : `/guest/${id}`;
}
