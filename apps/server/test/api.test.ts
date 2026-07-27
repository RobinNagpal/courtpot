import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
    await db.member.deleteMany();
    await db.member.create({ data: { id: aliceId, name: "Alice", username: "alice", pin: "1234" } });
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
});
