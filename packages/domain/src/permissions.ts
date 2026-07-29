import { Role } from "@courtpot/schemas";
import type { RoleT } from "@courtpot/schemas";

export enum Action {
  /** Create teams and allocate members to them. */
  ManageTeams = "ManageTeams",
  /** Create members anywhere, and set or update any PIN. */
  ManageMembers = "ManageMembers",
  /** Add members to your own team. */
  AddTeamMembers = "AddTeamMembers",
  /** Create or change bookings, transfers and guests. */
  WriteLedger = "WriteLedger",
  ReadLedger = "ReadLedger",
}

const allowed: Record<RoleT, readonly Action[]> = {
  [Role.Admin]: [
    Action.ManageTeams,
    Action.ManageMembers,
    Action.AddTeamMembers,
    Action.WriteLedger,
    Action.ReadLedger,
  ],
  [Role.TeamMemberAdmin]: [Action.AddTeamMembers, Action.WriteLedger, Action.ReadLedger],
  [Role.TeamMember]: [Action.WriteLedger, Action.ReadLedger],
  [Role.TeamMemberViewer]: [Action.ReadLedger],
};

export function can(role: RoleT, action: Action): boolean {
  return allowed[role].includes(action);
}

/** Most to least privileged. */
const rank: Record<RoleT, number> = {
  [Role.Admin]: 3,
  [Role.TeamMemberAdmin]: 2,
  [Role.TeamMember]: 1,
  [Role.TeamMemberViewer]: 0,
};

/**
 * The role a member actually acts with. Ledger rows are not team-scoped, so a
 * member's team roles decide what they can do: holding the highest of them.
 * A platform Admin always wins, and a member in no team falls back to their
 * platform role.
 */
export function effectiveRole(platformRole: RoleT, teamRoles: readonly RoleT[]): RoleT {
  if (platformRole === Role.Admin || teamRoles.length === 0) {
    return platformRole;
  }
  return teamRoles.reduce((best, role) => (rank[role] > rank[best] ? role : best));
}

/**
 * An Admin sets and updates any PIN. A TeamMemberAdmin sets the initial PIN for
 * a member they are creating, but may never change an existing member's PIN —
 * so adding someone who already has an account gives them no PIN control.
 */
export function canSetPin(role: RoleT, isNewMember: boolean): boolean {
  if (role === Role.Admin) {
    return true;
  }
  return role === Role.TeamMemberAdmin && isNewMember;
}
