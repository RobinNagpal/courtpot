import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role } from "@courtpot/schemas";
import type { Hono } from "hono";
import { createApp } from "../src/app";
import { createDb } from "../src/db";
import type { Db } from "../src/db";

const testUrl = process.env.TEST_DATABASE_URL ?? "";
const hasDb = testUrl !== "";

describe.skipIf(!hasDb)("cost-splitting API", () => {
  let db: Db;
  let app: Hono;
  let token: string;
  const aliceId = randomUUID();
  const guestId = randomUUID();
  // The ledger is team-scoped, so every row below belongs to this team.
  const ledgerTeamId = randomUUID();

  const authed = (method = "GET"): RequestInit => ({
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl;
    execSync("npx prisma db push --skip-generate", {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: testUrl },
    });
    db = createDb();
    app = createApp(db);
    await db.authSession.deleteMany();
    await db.transfer.deleteMany();
    await db.guestBooking.deleteMany();
    await db.memberBooking.deleteMany();
    await db.guest.deleteMany();
    await db.teamMember.deleteMany();
    await db.team.deleteMany();
    await db.member.deleteMany();
    await db.team.create({ data: { id: ledgerTeamId, name: "Ledger Team", pin: "1111" } });
    // Alice is the Admin — creating members and teams needs it.
    await db.member.create({
      data: { id: aliceId, name: "Alice", username: "alice", pin: "1234", role: Role.Admin },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("rejects a wrong PIN", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "alice", pin: "0000" }),
    });
    expect(res.status).toBe(401);
  });

  it("logs in with the right PIN and never returns it", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "alice", pin: "1234" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; member: Record<string, string> };
    expect(body.token.length).toBeGreaterThan(10);
    expect(body.member).not.toHaveProperty("pin");
    token = body.token;
  });

  it("rejects requests without a token", async () => {
    const res = await app.request("/api/members");
    expect(res.status).toBe(401);
  });

  it("creates a member with a generated PIN that is not in the response", async () => {
    const res = await app.request("/api/members", {
      ...authed("POST"),
      body: JSON.stringify({ id: randomUUID(), name: "Bob", username: "bob", active: true }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as Record<string, string>;
    expect(created).not.toHaveProperty("pin");
    const list = await (await app.request("/api/members", authed())).text();
    expect(list).not.toContain('"pin"');
    const stored = await db.member.findUnique({ where: { username: "bob" }, omit: { pin: false } });
    expect(stored?.pin).toMatch(/^\d{4}$/);
  });

  it("rejects a duplicate username with 409", async () => {
    const res = await app.request("/api/members", {
      ...authed("POST"),
      body: JSON.stringify({ id: randomUUID(), name: "Bob 2", username: "bob", active: true }),
    });
    expect(res.status).toBe(409);
  });

  it("round-trips guests, bookings and transfers", async () => {
    const guestRes = await app.request("/api/guests", {
      ...authed("POST"),
      body: JSON.stringify({ id: guestId, teamId: ledgerTeamId, name: "Sam" }),
    });
    expect(guestRes.status).toBe(201);

    const bookingRes = await app.request("/api/memberBookings", {
      ...authed("POST"),
      body: JSON.stringify({
        id: randomUUID(),
        teamId: ledgerTeamId,
        date: "2026-07-27",
        title: "Test courts",
        memberIds: [aliceId],
        payers: [{ memberId: aliceId, amount: 4800 }],
      }),
    });
    expect(bookingRes.status).toBe(201);

    const batchRes = await app.request("/api/transfers/batch", {
      ...authed("POST"),
      body: JSON.stringify([
        { id: randomUUID(), teamId: ledgerTeamId, date: "2026-07-27", fromId: guestId, toId: aliceId, amount: 500 },
      ]),
    });
    expect(batchRes.status).toBe(201);

    const transfers = (await (await app.request("/api/transfers", authed())).json()) as { amount: number }[];
    expect(transfers).toHaveLength(1);
    expect(transfers[0]?.amount).toBe(500);
  });

  it("blocks deleting a referenced guest", async () => {
    const res = await app.request(`/api/guests/${guestId}`, authed("DELETE"));
    expect(res.status).toBe(409);
  });

  it("keeps each team's ledger separate", async () => {
    const otherTeam = randomUUID();
    await db.team.create({ data: { id: otherTeam, name: "Other Ledger Team", pin: "2222" } });
    const mine = randomUUID();
    const theirs = randomUUID();
    for (const [id, teamId] of [
      [mine, ledgerTeamId],
      [theirs, otherTeam],
    ]) {
      const res = await app.request("/api/transfers", {
        ...authed("POST"),
        body: JSON.stringify({ id, teamId, date: "2026-07-28", fromId: guestId, toId: aliceId, amount: 100 }),
      });
      expect(res.status).toBe(201);
    }
    const all = (await (await app.request("/api/transfers", authed())).json()) as { id: string; teamId: string }[];
    expect(all.filter((t) => t.teamId === ledgerTeamId).map((t) => t.id)).toContain(mine);
    expect(all.filter((t) => t.teamId === ledgerTeamId).map((t) => t.id)).not.toContain(theirs);
    expect(all.filter((t) => t.teamId === otherTeam).map((t) => t.id)).toEqual([theirs]);
  });

  describe("audit log", () => {
    it("records a create, an update and a delete with the actor's name", async () => {
      const id = randomUUID();
      await app.request("/api/guests", {
        ...authed("POST"),
        body: JSON.stringify({ id, teamId: ledgerTeamId, name: "Audited Guest" }),
      });
      await app.request(`/api/guests/${id}`, {
        ...authed("PUT"),
        body: JSON.stringify({ id, teamId: ledgerTeamId, name: "Audited Guest", note: "renamed" }),
      });
      await app.request(`/api/guests/${id}`, authed("DELETE"));

      const res = await app.request("/api/auditLogs", authed());
      expect(res.status).toBe(200);
      const log = (await res.json()) as {
        action: string;
        entity: string;
        entityId: string;
        actorName: string;
        details: Record<string, string>;
      }[];
      const mine = log.filter((entry) => entry.entityId === id);
      expect(mine.map((e) => e.action)).toEqual(["Delete", "Update", "Create"]);
      expect(mine.every((e) => e.entity === "Guest")).toBe(true);
      expect(mine.every((e) => e.actorName === "Alice")).toBe(true);
      // The delete entry keeps a snapshot, not just the id.
      expect(mine[0]?.details.name).toBe("Audited Guest");
      expect(mine[1]?.details.note).toBe("renamed");
    });

    it("never records a PIN, even for member writes", async () => {
      const id = randomUUID();
      await app.request("/api/members", {
        ...authed("POST"),
        body: JSON.stringify({ id, name: "Pin Probe", username: "pinprobe", active: true }),
      });
      const res = await app.request("/api/auditLogs", authed());
      const body = await res.text();
      expect(body).toContain("Pin Probe");
      expect(body).not.toContain("pin\"");
      const stored = await db.auditLog.findFirst({ where: { entityId: id } });
      expect(stored?.details).not.toHaveProperty("pin");
    });

    it("hides the audit log from a plain TeamMember", async () => {
      const id = randomUUID();
      await db.member.create({
        data: { id, name: "Plain Pat", username: "pat", pin: "3333", role: Role.TeamMember },
      });
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "pat", pin: "3333" }),
      });
      const { token: patToken } = (await res.json()) as { token: string };
      const denied = await app.request("/api/auditLogs", {
        headers: { authorization: `Bearer ${patToken}` },
      });
      expect(denied.status).toBe(403);
    });
  });

  describe("teams and roles", () => {
    const teamId = randomUUID();
    let viewerToken: string;

    const login = async (username: string, pin: string): Promise<string> => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const body = (await res.json()) as { token: string };
      return body.token;
    };

    it("lets an Admin create a team with a PIN, and never returns the PIN", async () => {
      const res = await app.request("/api/teams", {
        ...authed("POST"),
        body: JSON.stringify({ id: teamId, name: "Test Squad", pin: "1947" }),
      });
      expect(res.status).toBe(201);
      expect(await res.text()).not.toContain("1947");
      const list = await (await app.request("/api/teams", authed())).text();
      expect(list).not.toContain("pin");
    });

    it("opens the team page with the right PIN and no member login", async () => {
      const unauthenticated = (pin: string): RequestInit => ({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const wrong = await app.request(`/api/teams/${teamId}/unlock`, unauthenticated("0000"));
      expect(wrong.status).toBe(401);

      const ok = await app.request(`/api/teams/${teamId}/unlock`, unauthenticated("1947"));
      expect(ok.status).toBe(200);
      const raw = await ok.text();
      // Whoever holds the PIN is not necessarily a member: no secrets, no roles.
      expect(raw).not.toContain("1947");
      expect(raw).not.toContain('"pin"');
      expect(raw).not.toContain('"username"');
      expect(raw).not.toContain('"role"');
      const page = JSON.parse(raw) as {
        team: { name: string };
        members: { name: string }[];
        guests: { name: string }[];
        balances: { name: string }[];
        transfers: { id: string }[];
      };
      expect(page.team.name).toBe("Test Squad");
      for (const list of [page.members, page.guests, page.balances, page.transfers]) {
        expect(Array.isArray(list)).toBe(true);
      }
    });

    it("opens a team page by slug as well as by id", async () => {
      const withSlug = await app.request(`/api/teams/${teamId}`, {
        ...authed("PUT"),
        body: JSON.stringify({ name: "Test Squad", slug: "Test-Squad" }),
      });
      expect(withSlug.status).toBe(200);
      // The slug is lowercased on the way in.
      expect(((await withSlug.json()) as { slug: string }).slug).toBe("test-squad");

      const bySlug = await app.request("/api/teams/test-squad/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "1947" }),
      });
      expect(bySlug.status).toBe(200);
    });

    it("rejects a slug with illegal characters", async () => {
      const res = await app.request(`/api/teams/${teamId}`, {
        ...authed("PUT"),
        body: JSON.stringify({ name: "Test Squad", slug: "not a slug!" }),
      });
      expect(res.status).toBe(400);
    });

    it("gives the same 401 for an unknown team as for a wrong PIN", async () => {
      const res = await app.request(`/api/teams/${randomUUID()}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "1947" }),
      });
      expect(res.status).toBe(401);
    });

    it("lets an Admin list team PINs and edit name and PIN", async () => {
      const withPins = await app.request("/api/teams/with-pins", authed());
      expect(withPins.status).toBe(200);
      const teams = (await withPins.json()) as { id: string; pin: string }[];
      expect(teams.find((t) => t.id === teamId)?.pin).toBe("1947");

      const edit = await app.request(`/api/teams/${teamId}`, {
        ...authed("PUT"),
        body: JSON.stringify({ name: "Test Squad Reloaded", pin: "2626" }),
      });
      expect(edit.status).toBe(200);

      const old = await app.request(`/api/teams/${teamId}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "1947" }),
      });
      expect(old.status).toBe(401);
      const fresh = await app.request(`/api/teams/${teamId}/unlock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "2626" }),
      });
      expect(fresh.status).toBe(200);

      // Put the name back so later assertions are unaffected.
      await app.request(`/api/teams/${teamId}`, {
        ...authed("PUT"),
        body: JSON.stringify({ name: "Test Squad" }),
      });
    });

    it("puts a newly created member in the default Sher-e-Smash team", async () => {
      const id = randomUUID();
      const res = await app.request("/api/members", {
        ...authed("POST"),
        body: JSON.stringify({ id, name: "Teamless Tim", username: "tim", active: true }),
      });
      expect(res.status).toBe(201);
      const memberships = await db.teamMember.findMany({
        where: { memberId: id },
        include: { team: true },
      });
      expect(memberships.length).toBeGreaterThanOrEqual(1);
      expect(memberships.map((m) => m.team.name)).toContain("Sher-e-Smash");
    });

    it("adds a brand new member to the team with a chosen PIN", async () => {
      const res = await app.request(`/api/teams/${teamId}/members`, {
        ...authed("POST"),
        body: JSON.stringify({
          name: "Vic Viewer",
          username: "vic",
          pin: "4321",
          role: Role.TeamMemberViewer,
        }),
      });
      expect(res.status).toBe(201);
      const stored = await db.member.findUnique({ where: { username: "vic" }, omit: { pin: false } });
      expect(stored?.pin).toBe("4321");
      viewerToken = await login("vic", "4321");
      expect(viewerToken.length).toBeGreaterThan(10);
    });

    it("defaults a member's platform role to TeamMember, not their team role", async () => {
      const stored = await db.member.findUnique({ where: { username: "vic" } });
      expect(stored?.role).toBe(Role.TeamMember);
      const membership = await db.teamMember.findMany({ where: { teamId } });
      expect(membership.map((m) => m.role)).toContain(Role.TeamMemberViewer);
    });

    it("lets a viewer read the ledger but not write it", async () => {
      const viewer = (method: string): RequestInit => ({
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
      });
      expect((await app.request("/api/transfers", viewer("GET"))).status).toBe(200);
      const write = await app.request("/api/guests", {
        ...viewer("POST"),
        body: JSON.stringify({ id: randomUUID(), teamId: ledgerTeamId, name: "Nope" }),
      });
      expect(write.status).toBe(403);
    });

    it("stops a non-Admin creating a team", async () => {
      const res = await app.request("/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ id: randomUUID(), name: "Breakaway club", pin: "9090" }),
      });
      expect(res.status).toBe(403);
    });

    it("stops a TeamMemberAdmin resetting an existing member's PIN", async () => {
      // Promote vic to TeamMemberAdmin inside the team.
      await db.teamMember.update({
        where: { teamId_memberId: { teamId, memberId: (await db.member.findUniqueOrThrow({ where: { username: "vic" } })).id } },
        data: { role: Role.TeamMemberAdmin },
      });
      const res = await app.request(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ username: "alice", pin: "9999", role: Role.TeamMember }),
      });
      expect(res.status).toBe(403);
      const alice = await db.member.findUnique({ where: { username: "alice" }, omit: { pin: false } });
      expect(alice?.pin).toBe("1234");
    });

    it("lets a TeamMemberAdmin add a new member with an initial PIN", async () => {
      const res = await app.request(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ name: "New Neil", username: "neil", pin: "4444", role: Role.TeamMember }),
      });
      expect(res.status).toBe(201);
      const stored = await db.member.findUnique({ where: { username: "neil" }, omit: { pin: false } });
      expect(stored?.pin).toBe("4444");
    });

    it("stops a TeamMemberAdmin granting the Admin role", async () => {
      const res = await app.request(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ name: "Sneaky", username: "sneaky", role: Role.Admin }),
      });
      expect(res.status).toBe(403);
    });

    it("marks a team as the default and rejects teams you are not on", async () => {
      const mine = await app.request("/api/auth/session/default-team", {
        ...authed("PUT"),
        body: JSON.stringify({ teamId: ledgerTeamId }),
      });
      // Alice is not a member of ledgerTeamId, so this must be refused.
      expect(mine.status).toBe(403);

      await db.teamMember.create({
        data: { teamId: ledgerTeamId, memberId: aliceId, role: Role.Admin },
      });
      const ok = await app.request("/api/auth/session/default-team", {
        ...authed("PUT"),
        body: JSON.stringify({ teamId: ledgerTeamId }),
      });
      expect(ok.status).toBe(200);
      const raw = await ok.text();
      expect(raw).not.toContain("pin");
      const body = JSON.parse(raw) as { defaultTeamId: string };
      expect(body.defaultTeamId).toBe(ledgerTeamId);
    });

    it("lets a TeamMemberAdmin edit their own team but not another", async () => {
      // vic is TeamMemberAdmin of teamId by this point.
      const own = await app.request(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ name: "Renamed By Team Admin" }),
      });
      expect(own.status).toBe(200);

      const other = await app.request(`/api/teams/${ledgerTeamId}`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ name: "Not Mine" }),
      });
      expect(other.status).toBe(403);

      // Put the name back for later assertions.
      await app.request(`/api/teams/${teamId}`, {
        ...authed("PUT"),
        body: JSON.stringify({ name: "Test Squad" }),
      });
    });

    it("supports different roles in different teams for one member", async () => {
      const otherTeamId = randomUUID();
      await app.request("/api/teams", {
        ...authed("POST"),
        body: JSON.stringify({ id: otherTeamId, name: "Sunday singles", pin: "5150" }),
      });
      const neil = await db.member.findUniqueOrThrow({ where: { username: "neil" } });
      const res = await app.request(`/api/teams/${otherTeamId}/members`, {
        ...authed("POST"),
        body: JSON.stringify({ memberId: neil.id, role: Role.TeamMemberAdmin }),
      });
      expect(res.status).toBe(201);
      const roles = await db.teamMember.findMany({ where: { memberId: neil.id } });
      expect(roles.map((r) => r.role).sort()).toEqual([Role.TeamMember, Role.TeamMemberAdmin].sort());
    });
  });
});
