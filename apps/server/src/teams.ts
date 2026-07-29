import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Action, can, canSetPin } from "@courtpot/domain";
import { Pin, Role, RoleSchema, Team, TeamMembership, Username } from "@courtpot/schemas";
import type { RoleT } from "@courtpot/schemas";
import type { AuthEnv } from "./auth";
import type { Db } from "./db";
import { generatePin } from "./pin";

/** Adding someone to a team: an existing member by id, or a brand new one. */
const AddTeamMember = z.object({
  role: RoleSchema.default(Role.TeamMember),
  memberId: z.string().uuid().optional(),
  name: z.string().trim().min(1).optional(),
  username: Username.optional(),
  pin: Pin.optional(),
});

/** Composite primary key lookup for the team_members join table. */
const membershipKey = (
  teamId: string,
  memberId: string,
): { teamId_memberId: { teamId: string; memberId: string } } => ({
  teamId_memberId: { teamId, memberId },
});

/** The caller's role inside one team, or null if they are not in it. */
async function roleInTeam(db: Db, teamId: string, memberId: string): Promise<RoleT | null> {
  const membership = await db.teamMember.findUnique({ where: membershipKey(teamId, memberId) });
  return membership === null ? null : RoleSchema.parse(membership.role);
}

export function teamsRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/", async (c) => c.json(Team.array().parse(await db.team.findMany({ orderBy: { name: "asc" } }))));

  router.post("/", zValidator("json", Team), async (c) => {
    if (!can(c.get("role"), Action.ManageTeams)) {
      return c.json({ error: "Only an Admin can create teams" }, 403);
    }
    return c.json(Team.parse(await db.team.create({ data: c.req.valid("json") })), 201);
  });

  router.get("/:teamId/members", async (c) => {
    const rows = await db.teamMember.findMany({ where: { teamId: c.req.param("teamId") } });
    return c.json(TeamMembership.array().parse(rows));
  });

  /**
   * Allocate a member to a team. An Admin may do this for any team; a
   * TeamMemberAdmin only for a team they belong to. Creating a new member here
   * may set an initial PIN — attaching an existing member never may.
   */
  router.post("/:teamId/members", zValidator("json", AddTeamMember), async (c) => {
    const teamId = c.req.param("teamId");
    const body = c.req.valid("json");
    const actingRole = c.get("role");

    const team = await db.team.findUnique({ where: { id: teamId } });
    if (team === null) {
      return c.json({ error: "Team not found" }, 404);
    }

    const isAdmin = can(actingRole, Action.ManageTeams);
    const teamRole = await roleInTeam(db, teamId, c.get("memberId"));
    const mayAdd = isAdmin || (teamRole !== null && can(teamRole, Action.AddTeamMembers));
    if (!mayAdd) {
      return c.json({ error: "You cannot add members to this team" }, 403);
    }
    // Only an Admin hands out roles above their own capability.
    if (!isAdmin && body.role === Role.Admin) {
      return c.json({ error: "Only an Admin can grant the Admin role" }, 403);
    }

    const callerRole = isAdmin ? actingRole : (teamRole ?? Role.TeamMemberViewer);
    const memberId = await resolveMember(db, body, callerRole);
    if (typeof memberId !== "string") {
      return c.json({ error: memberId.error }, memberId.status);
    }

    const membership = await db.teamMember.upsert({
      where: membershipKey(teamId, memberId),
      create: { teamId, memberId, role: body.role },
      update: { role: body.role },
    });
    return c.json(TeamMembership.parse(membership), 201);
  });

  router.delete("/:teamId/members/:memberId", async (c) => {
    const teamId = c.req.param("teamId");
    const isAdmin = can(c.get("role"), Action.ManageTeams);
    const teamRole = await roleInTeam(db, teamId, c.get("memberId"));
    if (!isAdmin && (teamRole === null || !can(teamRole, Action.AddTeamMembers))) {
      return c.json({ error: "You cannot change this team" }, 403);
    }
    await db.teamMember.delete({ where: membershipKey(teamId, c.req.param("memberId")) });
    return c.body(null, 204);
  });

  return router;
}

interface RouteError {
  error: string;
  status: 400 | 403 | 409;
}

/**
 * Returns the id of the member to attach: either the existing one named by
 * `memberId`/`username`, or a newly created one. A PIN supplied for an existing
 * member is rejected rather than silently ignored.
 */
async function resolveMember(
  db: Db,
  body: z.infer<typeof AddTeamMember>,
  callerRole: RoleT,
): Promise<string | RouteError> {
  const existing =
    body.memberId !== undefined
      ? await db.member.findUnique({ where: { id: body.memberId } })
      : body.username !== undefined
        ? await db.member.findUnique({ where: { username: body.username } })
        : null;

  if (existing !== null) {
    if (body.pin !== undefined && !canSetPin(callerRole, false)) {
      return { error: "That username already exists — you cannot set its PIN", status: 403 };
    }
    if (body.pin !== undefined) {
      await db.member.update({ where: { id: existing.id }, data: { pin: body.pin } });
    }
    return existing.id;
  }

  if (body.memberId !== undefined) {
    return { error: "Member not found", status: 409 };
  }
  if (body.name === undefined || body.username === undefined) {
    return { error: "A new member needs both a name and a username", status: 400 };
  }
  if (body.pin !== undefined && !canSetPin(callerRole, true)) {
    return { error: "You cannot set a PIN", status: 403 };
  }

  // A member created through a team keeps the default platform role; their
  // powers come from the team membership row.
  const created = await db.member.create({
    data: {
      id: randomUUID(),
      name: body.name,
      username: body.username,
      pin: body.pin ?? generatePin(),
    },
  });
  return created.id;
}
