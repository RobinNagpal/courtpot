import { z } from "zod";
import { Uuid } from "./ids";

export enum AuditAction {
  Create = "Create",
  Update = "Update",
  Delete = "Delete",
}

/** The kinds of row an audit entry can describe. */
export enum AuditEntity {
  Member = "Member",
  Guest = "Guest",
  MemberBooking = "MemberBooking",
  GuestBooking = "GuestBooking",
  Transfer = "Transfer",
  Match = "Match",
  Team = "Team",
  TeamMembership = "TeamMembership",
}

export const AuditActionSchema = z.nativeEnum(AuditAction);
export const AuditEntitySchema = z.nativeEnum(AuditEntity);

/**
 * Arbitrary JSON, modelled properly rather than escaping to `unknown` — the
 * audit `details` column holds a snapshot of whichever row changed.
 */
export type JsonValueT =
  | string
  | number
  | boolean
  | null
  | JsonValueT[]
  | { [key: string]: JsonValueT };

export const JsonValue: z.ZodType<JsonValueT> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValue),
    z.record(z.string(), JsonValue),
  ]),
);

export const AuditLogEntry = z.object({
  id: Uuid,
  at: z.coerce.date(),
  /** Null once the acting member has been deleted; actorName is kept regardless. */
  actorId: Uuid.nullable(),
  actorName: z.string(),
  action: AuditActionSchema,
  entity: AuditEntitySchema,
  entityId: z.string(),
  /** Snapshot of the row: the new state for Create/Update, the old one for Delete. */
  details: z.record(z.string(), JsonValue),
});

export type AuditLogEntryT = z.infer<typeof AuditLogEntry>;
