import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AuditAction } from "@courtpot/schemas";
import type { AuditEntity } from "@courtpot/schemas";
import type { AuthEnv } from "./auth";
import { recordAudit } from "./audit";
import type { Db } from "./db";

export interface CollectionStore<T extends { id: string }> {
  list(): Promise<T[]>;
  create(row: T): Promise<T>;
  createMany(rows: T[]): Promise<T[]>;
  update(row: T): Promise<T>;
  remove(id: string): Promise<void>;
}

/**
 * Uniform REST surface for one collection, mirroring the client's
 * CollectionClient. Every mutation writes an audit entry, so this is the single
 * choke point for the ledger's history.
 */
export function collectionRouter<T extends { id: string }, TIn>(
  schema: z.ZodType<T, z.ZodTypeDef, TIn>,
  store: CollectionStore<T>,
  entity: AuditEntity,
  db: Db,
): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  const audit = (
    c: Context<AuthEnv>,
    action: AuditAction,
    entityId: string,
    row: object,
  ): Promise<void> =>
    recordAudit(db, {
      actorId: c.get("memberId"),
      actorName: c.get("actorName"),
      action,
      entity,
      entityId,
      row,
    });

  router.get("/", async (c) => c.json(await store.list()));

  router.post("/", zValidator("json", schema), async (c) => {
    const created = await store.create(c.req.valid("json"));
    await audit(c, AuditAction.Create, created.id, created);
    return c.json(created, 201);
  });

  router.post("/batch", zValidator("json", z.array(schema)), async (c) => {
    const created = await store.createMany(c.req.valid("json"));
    for (const row of created) {
      await audit(c, AuditAction.Create, row.id, row);
    }
    return c.json(created, 201);
  });

  router.put("/:id", zValidator("json", schema), async (c) => {
    const row = c.req.valid("json");
    if (row.id !== c.req.param("id")) {
      return c.json({ error: "Row id does not match the URL" }, 400);
    }
    const updated = await store.update(row);
    await audit(c, AuditAction.Update, updated.id, updated);
    return c.json(updated);
  });

  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    // Capture what is about to go so the entry says more than just an id. These
    // collections are small, so scanning the list beats adding find() to every
    // store.
    const before = (await store.list()).find((row) => row.id === id);
    await store.remove(id);
    await audit(c, AuditAction.Delete, id, before ?? { id });
    return c.body(null, 204);
  });

  return router;
}
