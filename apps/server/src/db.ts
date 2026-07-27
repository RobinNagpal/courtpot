import { PrismaClient } from "@prisma/client";

/**
 * PINs are omitted globally: no query returns them unless a call site
 * explicitly opts back in (only the login check and operator CLI do).
 */
export type Db = PrismaClient<{ omit: { member: { pin: true } } }>;

export function createDb(): Db {
  return new PrismaClient({ omit: { member: { pin: true } } });
}
