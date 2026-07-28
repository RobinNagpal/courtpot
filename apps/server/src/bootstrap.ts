import { randomUUID } from "node:crypto";
import type { Db } from "./db";
import { generatePin } from "./pin";

const TEST_USER = { name: "Test User", username: "test" };

/**
 * First-run bootstrap: if the database has no members yet, create a
 * predefined test user and print its PIN to the console. On every later
 * start the members table is non-empty, so this is a no-op.
 */
export async function ensureFirstUser(db: Db): Promise<void> {
  const memberCount = await db.member.count();
  if (memberCount > 0) {
    return;
  }
  const pin = generatePin();
  await db.member.create({ data: { id: randomUUID(), ...TEST_USER, pin } });
  console.log(`No members yet — created test user "${TEST_USER.username}" with PIN ${pin}`);
}
