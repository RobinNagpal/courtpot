import { matchPlayerIds } from "@courtpot/schemas";
import type { MatchT } from "@courtpot/schemas";
import type { LedgerInput } from "./balances";

/**
 * How many booking/transfer rows reference this person. Used to block
 * deletes that would orphan existing rows.
 */
export function countPersonReferences(personId: string, input: LedgerInput): number {
  let count = 0;
  for (const booking of input.memberBookings) {
    if (booking.memberIds.includes(personId) || booking.payers.some((p) => p.memberId === personId)) {
      count += 1;
    }
  }
  for (const booking of input.guestBookings) {
    const isGuest = booking.guests.some((charge) => charge.guestId === personId);
    const isPayer = booking.paidBy !== "ALL" && booking.paidBy.includes(personId);
    if (isGuest || isPayer) {
      count += 1;
    }
  }
  for (const transfer of input.transfers) {
    if (transfer.fromId === personId || transfer.toId === personId) {
      count += 1;
    }
  }
  return count;
}

/**
 * How many matches this person played in. Counted separately from the ledger:
 * matches move no money, so they are no part of LedgerInput — but deleting a
 * player would still leave their id dangling in the results.
 */
export function countMatchReferences(personId: string, matches: readonly MatchT[]): number {
  return matches.filter((match) => matchPlayerIds(match).includes(personId)).length;
}
