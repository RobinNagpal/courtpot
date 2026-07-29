import { randomUUID } from "node:crypto";
import { Role } from "@courtpot/schemas";
import { createDb } from "../src/db";
import { generatePin } from "../src/pin";

const DEFAULT_TEAM = "London Badminton 40+ Smashers";

/** The first regular is the Admin; the rest play. */
const regulars: { name: string; username: string; role: Role }[] = [
  { name: "Robin N", username: "robinn", role: Role.Admin },
  { name: "Robin S", username: "robins", role: Role.TeamMember },
  { name: "Puneet", username: "puneet", role: Role.TeamMember },
  { name: "Akshay", username: "akshay", role: Role.TeamMember },
  { name: "Gurpinder", username: "gurpinder", role: Role.TeamMember },
];

/** Creates the default team and the regulars (skipping existing), printing PINs. */
async function main(): Promise<void> {
  const db = createDb();

  const team =
    (await db.team.findUnique({ where: { name: DEFAULT_TEAM } })) ??
    (await db.team.create({ data: { id: randomUUID(), name: DEFAULT_TEAM } }));
  console.log(`Team "${team.name}"`);

  for (const { name, username, role } of regulars) {
    const existing = await db.member.findUnique({ where: { username } });
    if (existing === null) {
      const pin = generatePin();
      const created = await db.member.create({
        data: { id: randomUUID(), name, username, pin, role },
      });
      console.log(`  ${name} (@${username}) created — ${role}, PIN ${pin}`);
      await db.teamMember.create({ data: { teamId: team.id, memberId: created.id, role } });
      continue;
    }
    console.log(`  ${name} (@${username}) already exists — skipped`);
    await db.teamMember.upsert({
      where: { teamId_memberId: { teamId: team.id, memberId: existing.id } },
      create: { teamId: team.id, memberId: existing.id, role },
      update: {},
    });
  }

  await db.$disconnect();
}

void main();
