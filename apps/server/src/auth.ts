import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import { can, effectiveRole } from "@courtpot/domain";
import type { Action } from "@courtpot/domain";
import { LoginInput, Member, MemberTeam, RoleSchema } from "@courtpot/schemas";
import type { RoleT } from "@courtpot/schemas";
import type { Db } from "./db";

export interface AuthEnv {
  Variables: { memberId: string; actorName: string; role: RoleT };
}

export function authRouter(db: Db): Hono {
  const router = new Hono();

  router.post("/login", zValidator("json", LoginInput), async (c) => {
    const { username, pin } = c.req.valid("json");
    // The one deliberate opt-out from the global pin omit: comparing at login.
    const member = await db.member.findUnique({ where: { username }, omit: { pin: false } });
    if (member === null || member.pin !== pin) {
      return c.json({ error: "Invalid username or PIN" }, 401);
    }
    const token = randomBytes(24).toString("base64url");
    await db.authSession.create({ data: { token, memberId: member.id } });
    // Member is a non-strict Zod object, so parsing strips the pin field.
    return c.json({ token, member: Member.parse(member) });
  });

  return router;
}

export function requireAuth(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") === true ? header.slice("Bearer ".length) : null;
    const session =
      token === null
        ? null
        : await db.authSession.findUnique({
            where: { token },
            include: { member: { include: { teams: true } } },
          });
    if (session === null) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("memberId", session.memberId);
    c.set("actorName", session.member.name);
    c.set(
      "role",
      effectiveRole(
        RoleSchema.parse(session.member.role),
        session.member.teams.map((membership) => RoleSchema.parse(membership.role)),
      ),
    );
    await next();
  };
}

/** Gate a route on the caller's effective role. */
export function requireCan(action: Action): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    if (!can(c.get("role"), action)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

export function sessionRouter(db: Db): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/me", async (c) => {
    const member = await db.member.findUnique({ where: { id: c.get("memberId") } });
    if (member === null) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json(Member.parse(member));
  });

  /** The caller's teams, with their role in each. Drives post-login routing. */
  router.get("/teams", async (c) => {
    const rows = await db.teamMember.findMany({
      where: { memberId: c.get("memberId") },
      include: { team: true },
    });
    return c.json(
      MemberTeam.array().parse(
        rows
          .map((row) => ({ id: row.team.id, name: row.team.name, role: RoleSchema.parse(row.role) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    );
  });

  router.post("/logout", async (c) => {
    const header = c.req.header("Authorization") ?? "";
    await db.authSession.deleteMany({ where: { token: header.slice("Bearer ".length) } });
    return c.body(null, 204);
  });

  return router;
}
