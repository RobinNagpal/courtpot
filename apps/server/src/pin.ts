import { randomInt } from "node:crypto";

/** Predefined 4-digit login PIN, generated when a member is created. */
export function generatePin(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}
