import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { ensureFirstUser } from "./bootstrap";
import { createDb } from "./db";
import { env } from "./env";

/**
 * The only entry point: the same file runs locally and in production, where it
 * is bundled by deployment/scripts/build-server.sh and run by systemd on the
 * shared host (see deployment/README.md).
 *
 * The bootstrap is wrapped in a function rather than awaited at the top level
 * so the bundle can be emitted as CommonJS. The generated Prisma client is CJS
 * and loads its query engine with require at runtime; a top-level await would
 * force esbuild to emit ESM, where that require has no meaning.
 */
async function main(): Promise<void> {
  const db = createDb();
  await ensureFirstUser(db);

  serve({ fetch: createApp(db).fetch, port: env.PORT }, (info) => {
    console.log(`CourtPot API listening on http://localhost:${info.port}`);
  });
}

// Exiting non-zero is the right answer to an unreachable database at start-up:
// systemd restarts the unit, so the API recovers on its own once the database
// is back rather than sitting there serving errors.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
