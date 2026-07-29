import { z } from "zod";
import { Pin } from "./auth";
import { Role, RoleSchema } from "./roles";

/** Public shape of a team. The PIN is never part of it. */
export const Team = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Team name is required"),
});

/** Admin-only shape: the same team plus its PIN. */
export const TeamWithPin = Team.extend({ pin: Pin });

/** Creating a team. Omitting the PIN has the server generate one. */
export const TeamCreate = Team.extend({ pin: Pin.optional() });

/** Admin edit. Omitting the PIN leaves the existing one alone. */
export const TeamEdit = z.object({
  name: z.string().trim().min(1, "Team name is required"),
  pin: Pin.optional(),
});

/** What anyone submits to open a team page. */
export const TeamUnlockInput = z.object({ pin: Pin });

/**
 * Local (offline) mode has no teams, so its rows all carry this fixed id. It is
 * never a real team in the database.
 */
export const SOLO_TEAM_ID = "00000000-0000-4000-8000-000000000501";

/** One of the caller's teams, with the role they hold in it. */
export const MemberTeam = Team.extend({ role: RoleSchema });

/** A member's role within one team. A member may belong to several teams. */
export const TeamMembership = z.object({
  teamId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: RoleSchema.default(Role.TeamMemberViewer),
});

/** One row of a team's roster, as shown on the unlocked team page. */
export const TeamRosterEntry = z.object({
  memberId: z.string().uuid(),
  name: z.string(),
  role: RoleSchema,
});

export const TeamPage = z.object({
  team: Team,
  roster: z.array(TeamRosterEntry),
});

export type MemberTeamT = z.infer<typeof MemberTeam>;
export type TeamT = z.infer<typeof Team>;
export type TeamWithPinT = z.infer<typeof TeamWithPin>;
export type TeamCreateT = z.infer<typeof TeamCreate>;
export type TeamEditT = z.infer<typeof TeamEdit>;
export type TeamUnlockInputT = z.infer<typeof TeamUnlockInput>;
export type TeamMembershipT = z.infer<typeof TeamMembership>;
export type TeamRosterEntryT = z.infer<typeof TeamRosterEntry>;
export type TeamPageT = z.infer<typeof TeamPage>;
