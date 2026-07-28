import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { ensureFirstUser } from "./bootstrap";
import { createDb } from "./db";
import { env } from "./env";

const db = createDb();
await ensureFirstUser(db);

serve({ fetch: createApp(db).fetch, port: env.PORT }, (info) => {
  console.log(`CourtPot API listening on http://localhost:${info.port}`);
});
