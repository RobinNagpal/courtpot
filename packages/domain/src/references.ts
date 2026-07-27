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
    if (booking.guestId === personId || booking.paidBy === personId) {
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
