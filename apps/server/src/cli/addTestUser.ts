import { randomBytes, randomUUID } from "node:crypto";
import { MemberCreate } from "@courtpot/schemas";
import { createDb } from "../db";
import { generatePin } from "../pin";

/**
 * Dev tool (`pnpm user:test`): create a test member with a random
 * username and PIN, and print both. Repeatable — each run adds a new one.
 */
async function main(): Promise<void> {
  const db = createDb();
  const suffix = randomBytes(3).toString("hex");
  const member = MemberCreate.parse({
    id: randomUUID(),
    name: `Test ${suffix}`,
    username: `test-${suffix}`,
    active: true,
  });
  const pin = generatePin();
  await db.member.create({ data: { ...member, pin } });
  console.log(`Created test user — username: ${member.username}  PIN: ${pin}`);
  await db.$disconnect();
}

void main();
