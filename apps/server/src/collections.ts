import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export interface CollectionStore<T extends { id: string }> {
  list(): Promise<T[]>;
  create(row: T): Promise<T>;
  createMany(rows: T[]): Promise<T[]>;
  update(row: T): Promise<T>;
  remove(id: string): Promise<void>;
}

/** Uniform REST surface for one collection, mirroring the client's CollectionClient. */
export function collectionRouter<T extends { id: string }, TIn>(
  schema: z.ZodType<T, z.ZodTypeDef, TIn>,
  store: CollectionStore<T>,
): Hono {
  const router = new Hono();
  router.get("/", async (c) => c.json(await store.list()));
  router.post("/", zValidator("json", schema), async (c) => c.json(await store.create(c.req.valid("json")), 201));
  router.post("/batch", zValidator("json", z.array(schema)), async (c) =>
    c.json(await store.createMany(c.req.valid("json")), 201),
  );
  router.put("/:id", zValidator("json", schema), async (c) => {
    const row = c.req.valid("json");
    if (row.id !== c.req.param("id")) {
      return c.json({ error: "Row id does not match the URL" }, 400);
    }
    return c.json(await store.update(row));
  });
  router.delete("/:id", async (c) => {
    await store.remove(c.req.param("id"));
    return c.body(null, 204);
  });
  return router;
}
