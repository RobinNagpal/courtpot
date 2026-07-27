import type {
  BalanceT,
  GuestBookingT,
  GuestT,
  MemberBookingT,
  MemberT,
  TransferT,
} from "@courtpot/schemas";
import { splitCents } from "./split";

export interface LedgerInput {
  members: readonly MemberT[];
  guests: readonly GuestT[];
  memberBookings: readonly MemberBookingT[];
  guestBookings: readonly GuestBookingT[];
  transfers: readonly TransferT[];
}

/** Booking total (sum of payers) split equally between its players. */
export function memberBookingSplit(booking: MemberBookingT): Record<string, number> {
  const total = booking.payers.reduce((sum, payer) => sum + payer.amount, 0);
  return splitCents(total, booking.memberIds);
}

/**
 * Derive every person's running balance. Positive = owes money.
 * The sum of all balances is always exactly zero.
 */
export function computeBalances(input: LedgerInput): BalanceT[] {
  const owed = new Map<string, number>();
  const charge = (personId: string, cents: number): void => {
    owed.set(personId, (owed.get(personId) ?? 0) + cents);
  };

  for (const booking of input.memberBookings) {
    for (const [memberId, share] of Object.entries(memberBookingSplit(booking))) {
      charge(memberId, share);
    }
    for (const payer of booking.payers) {
      charge(payer.memberId, -payer.amount);
    }
  }

  const activeMemberIds = input.members.filter((m) => m.active).map((m) => m.id);
  for (const booking of input.guestBookings) {
    charge(booking.guestId, booking.amount);
    if (booking.paidBy === "ALL") {
      for (const [memberId, credit] of Object.entries(splitCents(booking.amount, activeMemberIds))) {
        charge(memberId, -credit);
      }
    } else {
      charge(booking.paidBy, -booking.amount);
    }
  }

  for (const transfer of input.transfers) {
    charge(transfer.fromId, -transfer.amount);
    charge(transfer.toId, transfer.amount);
  }

  return [
    ...input.members.map(
      (m): BalanceT => ({ personId: m.id, kind: "member", name: m.name, owedCents: owed.get(m.id) ?? 0 }),
    ),
    ...input.guests.map(
      (g): BalanceT => ({ personId: g.id, kind: "guest", name: g.name, owedCents: owed.get(g.id) ?? 0 }),
    ),
  ];
}

/** Reconciliation check: must be 0 for any dataset. */
export function reconcileTotal(balances: readonly BalanceT[]): number {
  return balances.reduce((sum, balance) => sum + balance.owedCents, 0);
}
