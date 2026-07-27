import { Hono } from "hono";
import { cors } from "hono/cors";
import { Prisma } from "@prisma/client";
import { Guest, GuestBooking, MemberBooking, MemberCreate, Transfer } from "@courtpot/schemas";
import { authRouter, requireAuth, sessionRouter } from "./auth";
import { collectionRouter } from "./collections";
import type { Db } from "./db";
import { ConflictError, NotFoundError } from "./errors";
import { createStores } from "./stores";

export function createApp(db: Db): Hono {
  const stores = createStores(db);
  const app = new Hono();

  app.use("*", cors());
  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/api/auth", authRouter(db));

  app.use("/api/*", requireAuth(db));
  app.route("/api/auth/session", sessionRouter(db));
  app.route("/api/members", collectionRouter(MemberCreate, stores.members));
  app.route("/api/guests", collectionRouter(Guest, stores.guests));
  app.route("/api/memberBookings", collectionRouter(MemberBooking, stores.memberBookings));
  app.route("/api/guestBookings", collectionRouter(GuestBooking, stores.guestBookings));
  app.route("/api/transfers", collectionRouter(Transfer, stores.transfers));

  app.onError((error, c) => {
    if (error instanceof ConflictError) {
      return c.json({ error: error.message }, 409);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return c.json({ error: "That name or username is already taken" }, 409);
      }
      if (error.code === "P2025") {
        return c.json({ error: "Row not found" }, 404);
      }
    }
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
