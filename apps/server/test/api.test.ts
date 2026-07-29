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
      body: JSON.stringify({ id: guestId, name: "Sam" }),
    });
    expect(guestRes.status).toBe(201);

    const bookingRes = await app.request("/api/memberBookings", {
      ...authed("POST"),
      body: JSON.stringify({
        id: randomUUID(),
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
        { id: randomUUID(), date: "2026-07-27", fromId: guestId, toId: aliceId, amount: 500 },
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

    it("lets an Admin create a team", async () => {
      const res = await app.request("/api/teams", {
        ...authed("POST"),
        body: JSON.stringify({ id: teamId, name: "London Badminton 40+ Smashers" }),
      });
      expect(res.status).toBe(201);
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
        body: JSON.stringify({ id: randomUUID(), name: "Nope" }),
      });
      expect(write.status).toBe(403);
    });

    it("stops a non-Admin creating a team", async () => {
      const res = await app.request("/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ id: randomUUID(), name: "Breakaway club" }),
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
        body: JSON.stringify({ name: "New Neil", username: "neil", pin: "5555", role: Role.TeamMember }),
      });
      expect(res.status).toBe(201);
      const stored = await db.member.findUnique({ where: { username: "neil" }, omit: { pin: false } });
      expect(stored?.pin).toBe("5555");
    });

    it("stops a TeamMemberAdmin granting the Admin role", async () => {
      const res = await app.request(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({ name: "Sneaky", username: "sneaky", role: Role.Admin }),
      });
      expect(res.status).toBe(403);
    });

    it("supports different roles in different teams for one member", async () => {
      const otherTeamId = randomUUID();
      await app.request("/api/teams", {
        ...authed("POST"),
        body: JSON.stringify({ id: otherTeamId, name: "Sunday singles" }),
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
