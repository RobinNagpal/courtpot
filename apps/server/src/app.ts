import { Hono } from "hono";
import { cors } from "hono/cors";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuditEntity, Guest, GuestBooking, Match, MemberBooking, MemberCreate, Transfer } from "@courtpot/schemas";
import { Action } from "@courtpot/domain";
import { listAuditLog } from "./audit";
import { authRouter, requireAuth, requireCan, sessionRouter } from "./auth";
import { collectionRouter } from "./collections";
import { publicTeamsRouter, teamsRouter } from "./teams";
import type { Db } from "./db";
import { ConflictError, NotFoundError } from "./errors";
import { createStores } from "./stores";

/** P2002 reports the columns that collided; naming them beats guessing. */
const UniqueViolation = z.object({ target: z.array(z.string()) });

function uniqueMessage(error: Prisma.PrismaClientKnownRequestError): string {
  const parsed = UniqueViolation.safeParse(error.meta);
  if (!parsed.success) {
    return "That value is already taken";
  }
  return parsed.data.target.includes("id")
    ? "A row with that id already exists"
    : `That ${parsed.data.target.join(" and ")} is already taken`;
}

export function createApp(db: Db): Hono {
  const stores = createStores(db);
  const app = new Hono();

  app.use("*", cors());
  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/api/auth", authRouter(db));
  // Public: opening a team page needs the team's PIN, not a member login.
  app.route("/api/teams", publicTeamsRouter(db));

  app.use("/api/*", requireAuth(db));
  app.route("/api/auth/session", sessionRouter(db));
  app.route("/api/teams", teamsRouter(db));

  // Reads stay open to any signed-in member — the app needs the whole ledger to
  // derive balances. Only writes are gated.
  const writeMethods = ["POST", "PUT", "DELETE"];
  const paths = (name: string): string[] => [`/api/${name}`, `/api/${name}/*`];
  const ledger = ["guests", "memberBookings", "guestBookings", "transfers", "matches"].flatMap(paths);

  app.on(writeMethods, paths("members"), requireCan(Action.ManageMembers));
  app.on(writeMethods, ledger, requireCan(Action.WriteLedger));

  // Admins and team admins only — this is the "who changed what" view.
  app.get("/api/auditLogs", requireCan(Action.ReadAuditLog), async (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? 200) || 200, 1000);
    return c.json(await listAuditLog(db, limit));
  });

  app.route("/api/members", collectionRouter(MemberCreate, stores.members, AuditEntity.Member, db));
  app.route("/api/guests", collectionRouter(Guest, stores.guests, AuditEntity.Guest, db));
  app.route(
    "/api/memberBookings",
    collectionRouter(MemberBooking, stores.memberBookings, AuditEntity.MemberBooking, db),
  );
  app.route(
    "/api/guestBookings",
    collectionRouter(GuestBooking, stores.guestBookings, AuditEntity.GuestBooking, db),
  );
  app.route("/api/transfers", collectionRouter(Transfer, stores.transfers, AuditEntity.Transfer, db));
  app.route("/api/matches", collectionRouter(Match, stores.matches, AuditEntity.Match, db));

  app.onError((error, c) => {
    if (error instanceof ConflictError) {
      return c.json({ error: error.message }, 409);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return c.json({ error: uniqueMessage(error) }, 409);
      }
      if (error.code === "P2003") {
        return c.json({ error: "That row points at something that does not exist" }, 400);
      }
      if (error.code === "P2025") {
        return c.json({ error: "Row not found" }, 404);
      }
    }
    // A CHECK constraint only fires on a row the Zod schema should already have
    // refused, so it is a bad request rather than a server fault. Prisma raises
    // these as "unknown", with no code to match on.
    if (
      error instanceof Prisma.PrismaClientUnknownRequestError &&
      error.message.includes("violates check constraint")
    ) {
      return c.json({ error: "The database rejected that row" }, 400);
    }
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
