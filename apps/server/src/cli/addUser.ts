import { randomUUID } from "node:crypto";
import { Pin, Role, RoleSchema, Username } from "@courtpot/schemas";
import { createDb } from "../db";
import { parseArgs } from "./args";
import { generatePin } from "../pin";

/**
 * Operator tool (`pnpm user:add`): create a member with a chosen username, PIN
 * and role, optionally adding them to a team.
 *
 *   pnpm user:add -- --username robin --pin 1234 --role Admin --name "Robin N"
 *   pnpm user:add -- --username sam --role TeamMember --team "Sher-e-Smash"
 *
 * --pin is optional (one is generated). --team takes a team name.
 */
function usage(message: string): never {
  console.error(`${message}

Usage: pnpm user:add -- --username <name> [--pin 1234] [--role ${Object.values(Role).join("|")}] [--name "Full Name"] [--team "Team name"]`);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const rawUsername = args.get("username");
  if (rawUsername === undefined) {
    usage("--username is required");
  }
  const username = Username.parse(rawUsername);
  const name = args.get("name") ?? username;

  const rawRole = args.get("role");
  const role = rawRole === undefined ? Role.TeamMember : RoleSchema.safeParse(rawRole).data;
  if (role === undefined) {
    usage(`Unknown role "${rawRole ?? ""}"`);
  }

  const rawPin = args.get("pin");
  const pin = rawPin === undefined ? generatePin() : Pin.safeParse(rawPin).data;
  if (pin === undefined) {
    usage("--pin must be 4 digits");
  }

  const db = createDb();
  if ((await db.member.findUnique({ where: { username } })) !== null) {
    console.error(`A member with username "${username}" already exists`);
    await db.$disconnect();
    process.exit(1);
  }

  const teamName = args.get("team");
  const team = teamName === undefined ? null : await db.team.findUnique({ where: { name: teamName } });
  if (teamName !== undefined && team === null) {
    console.error(`No team named "${teamName}"`);
    await db.$disconnect();
    process.exit(1);
  }

  const member = await db.member.create({ data: { id: randomUUID(), name, username, pin, role } });
  console.log(`Created ${name} (@${username}) — ${role}, PIN ${pin}`);

  if (team !== null) {
    await db.teamMember.create({ data: { teamId: team.id, memberId: member.id, role } });
    console.log(`Added to team "${team.name}" as ${role}`);
  }

  await db.$disconnect();
}

void main();
