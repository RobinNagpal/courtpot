import { z } from "zod";

/**
 * Roles are a TypeScript enum and a plain string column in Postgres — there is
 * deliberately no database enum type, so adding a role never needs a migration.
 * `RoleSchema` is what validates the string at every boundary.
 */
export enum Role {
  /** Platform-wide: manages members, teams, team allocation and all PINs. */
  Admin = "Admin",
  /** Adds members to their own team and sets initial PINs for new ones. */
  TeamMemberAdmin = "TeamMemberAdmin",
  /** Records bookings, transfers and guests. */
  TeamMember = "TeamMember",
  /** Read-only. */
  TeamMemberViewer = "TeamMemberViewer",
}

export const RoleSchema = z.nativeEnum(Role);

export type RoleT = z.infer<typeof RoleSchema>;
