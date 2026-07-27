import { createDb } from "../db";

/**
 * Operator-only tool: prints every member's login PIN straight from the
 * database. PINs are deliberately never exposed through the HTTP API, so
 * this is how the organiser hands them out.
 */
async function main(): Promise<void> {
  const db = createDb();
  const members = await db.member.findMany({ orderBy: { name: "asc" }, omit: { pin: false } });
  for (const member of members) {
    console.log(`${member.name.padEnd(20)} @${member.username.padEnd(16)} PIN ${member.pin}`);
  }
  await db.$disconnect();
}

void main();
