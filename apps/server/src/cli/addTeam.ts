import { randomUUID } from "node:crypto";
import { Pin, Role, RoleSchema } from "@courtpot/schemas";
import type { RoleT } from "@courtpot/schemas";
import { createDb } from "../db";
import { parseArgs } from "./args";
import { generatePin } from "../pin";

/**
 * Operator tool (`pnpm team:add`): create a team with a chosen name and PIN,
 * optionally putting every existing member in it.
 *
 *   pnpm team:add -- --name "Sher-e-Smash" --pin 1234 --all-members
 *   pnpm team:add -- --name "Sunday singles"
 *
 * --pin is optional (one is generated). --all-members adds every member as
 * TeamMember; override with --role. Re-running on an existing team updates its
 * PIN only when --pin is given, so it is safe to re-run to add new members.
 */
function usage(message: string): never {
  console.error(`${message}

Usage: pnpm team:add -- --name "Team name" [--pin 1234] [--all-members] [--role ${Object.values(Role).join("|")}]`);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const name = args.get("name")?.trim();
  if (name === undefined || name === "") {
    usage("--name is required");
  }

  const rawPin = args.get("pin");
  const pin = rawPin === undefined ? undefined : Pin.safeParse(rawPin).data;
  if (rawPin !== undefined && pin === undefined) {
    usage("--pin must be 4 digits");
  }

  const rawRole = args.get("role");
  const role: RoleT | undefined = rawRole === undefined ? Role.TeamMember : RoleSchema.safeParse(rawRole).data;
  if (role === undefined) {
    usage(`Unknown role "${rawRole ?? ""}"`);
  }

  const db = createDb();
  const existing = await db.team.findUnique({ where: { name } });

  const team =
    existing === null
      ? await db.team.create({ data: { id: randomUUID(), name, pin: pin ?? generatePin() } })
      : pin === undefined
        ? existing
        : await db.team.update({ where: { id: existing.id }, data: { pin } });

  const shown = await db.team.findUniqueOrThrow({ where: { id: team.id }, omit: { pin: false } });
  console.log(
    `${existing === null ? "Created" : "Updated"} team "${team.name}" — page PIN ${shown.pin}`,
  );

  if (args.has("all-members")) {
    const members = await db.member.findMany({ orderBy: { name: "asc" } });
    let added = 0;
    for (const member of members) {
      const already = await db.teamMember.findUnique({
        where: { teamId_memberId: { teamId: team.id, memberId: member.id } },
      });
      if (already !== null) {
        continue;
      }
      // An Admin keeps Admin inside the team too; everyone else takes --role.
      const teamRole = RoleSchema.parse(member.role) === Role.Admin ? Role.Admin : role;
      await db.teamMember.create({ data: { teamId: team.id, memberId: member.id, role: teamRole } });
      console.log(`  + ${member.name} (@${member.username}) as ${teamRole}`);
      added += 1;
    }
    console.log(`${added} member(s) added, ${members.length - added} already in the team`);
  }

  await db.$disconnect();
}

void main();
