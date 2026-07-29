import { randomUUID } from "node:crypto";
import { Role } from "@courtpot/schemas";
import type { RoleT } from "@courtpot/schemas";
import type { Db } from "./db";
import { generatePin } from "./pin";

const TEST_USER = { name: "Test User", username: "test" };

/** Every member belongs to at least one team; this is the one they land in. */
export const DEFAULT_TEAM_NAME = "Sher-e-Smash";

/** The default team, created with a generated PIN the first time it is needed. */
export async function ensureDefaultTeam(db: Db): Promise<{ id: string; name: string }> {
  const existing = await db.team.findUnique({ where: { name: DEFAULT_TEAM_NAME } });
  if (existing !== null) {
    return existing;
  }
  const pin = generatePin();
  const team = await db.team.create({ data: { id: randomUUID(), name: DEFAULT_TEAM_NAME, pin } });
  console.log(`Created default team "${team.name}" with PIN ${pin}`);
  return team;
}

/**
 * Put a member in the default team if they are in no team at all, so the "every
 * member is on at least one team" rule holds however they were created.
 */
export async function ensureTeamMembership(db: Db, memberId: string, role: RoleT): Promise<void> {
  if ((await db.teamMember.count({ where: { memberId } })) > 0) {
    return;
  }
  const team = await ensureDefaultTeam(db);
  await db.teamMember.create({ data: { teamId: team.id, memberId, role } });
}

/**
 * First-run bootstrap: ensure the default team exists, back-fill any member who
 * predates teams, and create the test user if there are no members at all.
 */
export async function ensureFirstUser(db: Db): Promise<void> {
  await ensureDefaultTeam(db);

  const members = await db.member.findMany({ select: { id: true } });
  if (members.length > 0) {
    for (const member of members) {
      await ensureTeamMembership(db, member.id, Role.TeamMember);
    }
    return;
  }

  const pin = generatePin();
  const member = await db.member.create({ data: { id: randomUUID(), ...TEST_USER, pin } });
  await ensureTeamMembership(db, member.id, Role.TeamMember);
  console.log(`No members yet — created test user "${TEST_USER.username}" with PIN ${pin}`);
}
