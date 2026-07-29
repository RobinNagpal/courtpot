import { PrismaClient } from "@prisma/client";

/**
 * PINs are omitted globally: no query returns a member's or a team's PIN unless
 * a call site explicitly opts back in (the login check, the team unlock check,
 * the admin team listing and the operator CLI).
 */
export type Db = PrismaClient<{ omit: { member: { pin: true }; team: { pin: true } } }>;

export function createDb(): Db {
  return new PrismaClient({ omit: { member: { pin: true }, team: { pin: true } } });
}
