import { z } from "zod";
import { Pin } from "./auth";
import { Balance, GuestBooking, IsoDate, MemberBooking, PositiveCents } from "./costSplitting";
import { Match } from "./matches";
import { Role, RoleSchema } from "./roles";

/**
 * URL-friendly team handle: lowercase letters, digits and single hyphens, never
 * leading or trailing. Input is lowercased, so "Sher-E-Smash" is accepted and
 * stored as "sher-e-smash" — a URL that differs only by case is a trap.
 */
export const Slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug needs at least 2 characters")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Letters, digits and single hyphens only");

/** Public shape of a team. The PIN is never part of it. */
export const Team = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Team name is required"),
  /** Optional short handle for the public page URL, e.g. /t/sher-e-smash. */
  slug: Slug.nullable().default(null),
});

/** Admin-only shape: the same team plus its PIN. */
export const TeamWithPin = Team.extend({ pin: Pin });

/** Creating a team. Omitting the PIN has the server generate one. */
export const TeamCreate = Team.extend({ pin: Pin.optional() });

/** Admin edit. Omitting the PIN or slug leaves the existing value alone. */
export const TeamEdit = z.object({
  name: z.string().trim().min(1, "Team name is required"),
  pin: Pin.optional(),
  slug: Slug.optional(),
});

/** Marking a team as your landing page. */
export const SetDefaultTeamInput = z.object({ teamId: z.string().uuid() });

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

/**
 * A person on the public team page: id and name only. Roles, usernames and
 * anything else stay out — whoever holds the team PIN is not necessarily a
 * member, so this is the minimum needed to read the ledger.
 */
export const PublicPerson = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

/** A transfer as shown publicly. Same shape as Transfer minus the team. */
export const PublicTransfer = z.object({
  id: z.string().uuid(),
  date: IsoDate,
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  amount: PositiveCents,
  note: z.string().optional(),
});

/**
 * What the team PIN unlocks: read-only balances, people, transfers and matches
 * for one team. Balances are computed server-side so the payload never has to
 * carry member roles just to feed the engine; pair rankings are not, because
 * they derive from the matches already here.
 */
export const TeamPage = z.object({
  team: Team,
  members: z.array(PublicPerson),
  guests: z.array(PublicPerson),
  balances: z.array(Balance),
  // Bookings and matches carry no secrets — only ids already present in
  // members/guests.
  memberBookings: z.array(MemberBooking),
  guestBookings: z.array(GuestBooking),
  transfers: z.array(PublicTransfer),
  matches: z.array(Match),
});

export type MemberTeamT = z.infer<typeof MemberTeam>;
export type TeamT = z.infer<typeof Team>;
export type TeamWithPinT = z.infer<typeof TeamWithPin>;
export type TeamCreateT = z.infer<typeof TeamCreate>;
export type TeamEditT = z.infer<typeof TeamEdit>;
export type SlugT = z.infer<typeof Slug>;
export type TeamUnlockInputT = z.infer<typeof TeamUnlockInput>;
export type SetDefaultTeamInputT = z.infer<typeof SetDefaultTeamInput>;
export type TeamMembershipT = z.infer<typeof TeamMembership>;
export type PublicPersonT = z.infer<typeof PublicPerson>;
export type PublicTransferT = z.infer<typeof PublicTransfer>;
export type TeamPageT = z.infer<typeof TeamPage>;
