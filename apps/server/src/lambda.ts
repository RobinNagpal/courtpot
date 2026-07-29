import { handle } from "hono/aws-lambda";
import { createApp } from "./app";
import { ensureFirstUser } from "./bootstrap";
import { createDb } from "./db";

/**
 * AWS Lambda entry point (deployed behind a Function URL, see deployment/).
 * Mirrors index.ts, but bootstraps lazily: a failed first-user check (e.g.
 * DATABASE_URL not set yet) must fail the request, not poison the container.
 */
const db = createDb();
const app = handle(createApp(db));

let bootstrap: Promise<void> | null = null;

export const handler: typeof app = async (event, context) => {
  bootstrap ??= ensureFirstUser(db);
  try {
    await bootstrap;
  } catch (error) {
    bootstrap = null;
    throw error;
  }
  return app(event, context);
};
