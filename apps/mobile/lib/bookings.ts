import { guestBookingTotal } from "@courtpot/schemas";
import type { GuestBookingT, MemberBookingT } from "@courtpot/schemas";
import { formatCents } from "@courtpot/ui";

/** "Sam" for one, "Sam +2" for several. */
function summarise(names: readonly string[]): string {
  const [first, ...rest] = names;
  const firstName = first ?? "?";
  return rest.length === 0 ? firstName : `${firstName} +${rest.length}`;
}

export function guestLabel(booking: GuestBookingT, names: Map<string, string>): string {
  return summarise(booking.guests.map((charge) => names.get(charge.guestId) ?? "?"));
}

export function payerLabel(booking: GuestBookingT, names: Map<string, string>): string {
  if (booking.paidBy === "ALL") {
    return "all members";
  }
  return summarise(booking.paidBy.map((id) => names.get(id) ?? "?"));
}

export function guestBookingSubtitle(booking: GuestBookingT, names: Map<string, string>): string {
  const total = formatCents(guestBookingTotal(booking));
  return `${booking.date} · ${guestLabel(booking, names)} owes ${total} · paid by ${payerLabel(booking, names)}`;
}

export function matchesGuestBooking(booking: GuestBookingT, personId: string): boolean {
  return (
    booking.guests.some((charge) => charge.guestId === personId) ||
    (booking.paidBy !== "ALL" && booking.paidBy.includes(personId))
  );
}

export function matchesMemberBooking(booking: MemberBookingT, personId: string): boolean {
  return booking.memberIds.includes(personId) || booking.payers.some((payer) => payer.memberId === personId);
}
