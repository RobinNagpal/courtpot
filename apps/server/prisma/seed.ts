import { randomUUID } from "node:crypto";
import { Role } from "@courtpot/schemas";
import { DEFAULT_TEAM_NAME } from "../src/bootstrap";
import { createDb } from "../src/db";
import { generatePin } from "../src/pin";

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

  // The team PIN is generated, never committed. It is printed once here; use
  // `pnpm team:add -- --name "<team>" --pin <pin>` to set a chosen one later.
  const existingTeam = await db.team.findUnique({ where: { name: DEFAULT_TEAM_NAME } });
  const teamPin = generatePin();
  const team =
    existingTeam ??
    (await db.team.create({ data: { id: randomUUID(), name: DEFAULT_TEAM_NAME, pin: teamPin } }));
  console.log(
    existingTeam === null
      ? `Team "${team.name}" created — page PIN ${teamPin}`
      : `Team "${team.name}" already exists — PIN unchanged`,
  );

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
