import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Action, can, canSetPin, computeBalances } from "@courtpot/domain";
import {
  AuditAction,
  AuditEntity,
  Guest,
  GuestBooking,
  Member,
  MemberBooking,
  Pin,
  Role,
  RoleSchema,
  Team,
  TeamCreate,
  TeamEdit,
  TeamMembership,
  TeamPage,
  TeamUnlockInput,
  TeamWithPin,
  Transfer,
  Username,
} from "@courtpot/schemas";
import type { RoleT } from "@courtpot/schemas";
import { recordAudit } from "./audit";
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

/**
 * Public: no member login, just the team's PIN. Mounted before requireAuth so
 * anyone with the PIN can open a team page.
 */
export function publicTeamsRouter(db: Db): Hono {
  const router = new Hono();

  router.post("/:handle/unlock", zValidator("json", TeamUnlockInput), async (c) => {
    // The handle is a slug or, for teams without one, the raw id.
    const handle = c.req.param("handle");
    const team = await db.team.findFirst({
      where: { OR: [{ slug: handle.toLowerCase() }, { id: handle }] },
      omit: { pin: false },
    });
    // Same response whether the team is missing or the PIN is wrong, so the
    // endpoint cannot be used to enumerate team ids.
    if (team === null || team.pin !== c.req.valid("json").pin) {
      return c.json({ error: "Wrong team PIN" }, 401);
    }
    return c.json(TeamPage.parse(await loadTeamPage(db, team)));
  });

  return router;
}

/**
 * The read-only view behind a team PIN: this team's people, its transfers and
 * the balances derived from its whole ledger. Bookings feed the balances but are
 * not listed, and balances are computed here so the payload never carries member
 * roles or usernames just to run the engine.
 */
async function loadTeamPage(
  db: Db,
  team: { id: string; name: string; slug: string | null },
): Promise<unknown> {
  const [memberships, guests, memberBookings, guestBookings, transfers] = await Promise.all([
    db.teamMember.findMany({ where: { teamId: team.id }, include: { member: true } }),
    db.guest.findMany({ where: { teamId: team.id }, orderBy: { name: "asc" } }),
    db.memberBooking.findMany({ where: { teamId: team.id }, orderBy: { date: "desc" } }),
    db.guestBooking.findMany({ where: { teamId: team.id }, orderBy: { date: "desc" } }),
    db.transfer.findMany({ where: { teamId: team.id }, orderBy: { date: "desc" } }),
  ]);

  const members = memberships.map((row) => row.member).sort((a, b) => a.name.localeCompare(b.name));
  const parsedMemberBookings = MemberBooking.array().parse(memberBookings);
  const parsedGuestBookings = GuestBooking.array().parse(guestBookings);
  const balances = computeBalances({
    members: Member.array().parse(members),
    guests: Guest.array().parse(guests.map((g) => ({ ...g, note: g.note ?? undefined }))),
    memberBookings: parsedMemberBookings,
    guestBookings: parsedGuestBookings,
    transfers: Transfer.array().parse(transfers.map((t) => ({ ...t, note: t.note ?? undefined }))),
  });

  return {
    team: { id: team.id, name: team.name, slug: team.slug },
    members: members.map((m) => ({ id: m.id, name: m.name })),
    guests: guests.map((g) => ({ id: g.id, name: g.name })),
    balances,
    memberBookings: parsedMemberBookings,
    guestBookings: parsedGuestBookings,
    transfers: transfers.map((t) => ({
      id: t.id,
      date: t.date,
      fromId: t.fromId,
      toId: t.toId,
      amount: t.amount,
      note: t.note ?? undefined,
    })),
  };
}

export function teamsRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/", async (c) => c.json(Team.array().parse(await db.team.findMany({ orderBy: { name: "asc" } }))));

  /** Admin-only: the same list including each team's PIN, so it can be handed out. */
  router.get("/with-pins", async (c) => {
    if (!can(c.get("role"), Action.ManageTeams)) {
      return c.json({ error: "Only an Admin can see team PINs" }, 403);
    }
    const teams = await db.team.findMany({ orderBy: { name: "asc" }, omit: { pin: false } });
    return c.json(TeamWithPin.array().parse(teams));
  });

  /**
   * Rename a team and optionally set a new PIN. A platform Admin may edit any
   * team; a TeamMemberAdmin only one they belong to.
   */
  router.put("/:teamId", zValidator("json", TeamEdit), async (c) => {
    const teamId = c.req.param("teamId");
    const isAdmin = can(c.get("role"), Action.ManageTeams);
    if (!isAdmin) {
      const teamRole = await roleInTeam(db, teamId, c.get("memberId"));
      if (teamRole === null || !can(teamRole, Action.AddTeamMembers)) {
        return c.json({ error: "Only an admin of this team can edit it" }, 403);
      }
    }
    const { name, pin, slug } = c.req.valid("json");
    const team = Team.parse(
      await db.team.update({
        where: { id: teamId },
        // Only overwrite the PIN or slug when one was supplied.
        data: { name, ...(pin === undefined ? {} : { pin }), ...(slug === undefined ? {} : { slug }) },
      }),
    );
    await recordAudit(db, {
      actorId: c.get("memberId"),
      actorName: c.get("actorName"),
      action: AuditAction.Update,
      entity: AuditEntity.Team,
      entityId: team.id,
      // pinChanged rather than the PIN itself — recordAudit would strip it anyway.
      row: { ...team, pinChanged: pin !== undefined },
    });
    return c.json(team);
  });

  router.post("/", zValidator("json", TeamCreate), async (c) => {
    if (!can(c.get("role"), Action.ManageTeams)) {
      return c.json({ error: "Only an Admin can create teams" }, 403);
    }
    const body = c.req.valid("json");
    const team = Team.parse(
      await db.team.create({
        data: {
          id: body.id,
          name: body.name,
          slug: body.slug,
          pin: body.pin ?? generatePin(),
        },
      }),
    );
    await recordAudit(db, {
      actorId: c.get("memberId"),
      actorName: c.get("actorName"),
      action: AuditAction.Create,
      entity: AuditEntity.Team,
      entityId: team.id,
      row: team,
    });
    return c.json(team, 201);
  });

  /**
   * The same read-only page, reached with a session instead of the team PIN. A
   * member of the team (or a platform Admin) never has to type the PIN.
   */
  router.get("/:handle/page", async (c) => {
    const handle = c.req.param("handle");
    const team = await db.team.findFirst({
      where: { OR: [{ slug: handle.toLowerCase() }, { id: handle }] },
    });
    if (team === null) {
      return c.json({ error: "Team not found" }, 404);
    }
    const membership = await db.teamMember.findUnique({
      where: membershipKey(team.id, c.get("memberId")),
    });
    if (membership === null && !can(c.get("role"), Action.ManageTeams)) {
      return c.json({ error: "You are not on that team" }, 403);
    }
    return c.json(TeamPage.parse(await loadTeamPage(db, team)));
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
    await recordAudit(db, {
      actorId: c.get("memberId"),
      actorName: c.get("actorName"),
      action: AuditAction.Update,
      entity: AuditEntity.TeamMembership,
      entityId: `${teamId}:${memberId}`,
      row: membership,
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
    const memberId = c.req.param("memberId");
    await db.teamMember.delete({ where: membershipKey(teamId, memberId) });
    await recordAudit(db, {
      actorId: c.get("memberId"),
      actorName: c.get("actorName"),
      action: AuditAction.Delete,
      entity: AuditEntity.TeamMembership,
      entityId: `${teamId}:${memberId}`,
      row: { teamId, memberId },
    });
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
