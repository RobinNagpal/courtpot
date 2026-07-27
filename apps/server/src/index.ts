import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db";
import { env } from "./env";

const app = createApp(createDb());

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`CourtPot API listening on http://localhost:${info.port}`);
});
