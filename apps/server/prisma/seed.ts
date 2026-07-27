import { randomUUID } from "node:crypto";
import { createDb } from "../src/db";
import { generatePin } from "../src/pin";

const regulars: { name: string; username: string }[] = [
  { name: "Robin N", username: "robinn" },
  { name: "Robin S", username: "robins" },
  { name: "Puneet", username: "puneet" },
  { name: "Akshay", username: "akshay" },
  { name: "Gurpinder", username: "gurpinder" },
];

/** Creates the regular members (skipping existing) and prints their PINs. */
async function main(): Promise<void> {
  const db = createDb();
  for (const { name, username } of regulars) {
    const existing = await db.member.findUnique({ where: { username } });
    if (existing !== null) {
      console.log(`${name} (@${username}) already exists — skipped`);
      continue;
    }
    const pin = generatePin();
    await db.member.create({ data: { id: randomUUID(), name, username, pin } });
    console.log(`${name} (@${username}) created — PIN ${pin}`);
  }
  await db.$disconnect();
}

void main();
