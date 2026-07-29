import { z } from "zod";
import { Role, RoleSchema } from "./roles";

/** All money is integer minor units (cents): 4800 = $48.00. */
export const Cents = z.number().int();
export const PositiveCents = Cents.positive();

/** Local calendar day, no time component. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const Member = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  username: z.string().trim().min(1).optional(),
  active: z.boolean().default(true),
  /** Platform role. Only `Admin` grants anything here; team roles live on the membership. */
  role: RoleSchema.default(Role.TeamMember),
});

export const Guest = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  note: z.string().optional(),
});

/** One funder of a member booking. */
export const Payer = z.object({
  memberId: z.string().uuid(),
  amount: PositiveCents,
});

export const MemberBooking = z.object({
  id: z.string().uuid(),
  date: IsoDate,
  title: z.string().trim().default(""),
  memberIds: z.array(z.string().uuid()).min(1, "Pick at least one player"),
  payers: z.array(Payer).min(1, "Add at least one payer"),
});

/** A member id, or "ALL" meaning the common members' budget. */
export const PaidBy = z.union([z.string().uuid(), z.literal("ALL")]);

export const GuestBooking = z.object({
  id: z.string().uuid(),
  date: IsoDate,
  title: z.string().trim().default(""),
  guestId: z.string().uuid(),
  amount: PositiveCents,
  paidBy: PaidBy,
});

export const Transfer = z
  .object({
    id: z.string().uuid(),
    date: IsoDate,
    fromId: z.string().uuid(),
    toId: z.string().uuid(),
    amount: PositiveCents,
    note: z.string().optional(),
  })
  .refine((t) => t.fromId !== t.toId, "From and to must differ");

/** Derived, never persisted. Positive owedCents = owes money. */
export const Balance = z.object({
  personId: z.string().uuid(),
  kind: z.enum(["member", "guest"]),
  name: z.string(),
  owedCents: Cents,
});

export type MemberT = z.infer<typeof Member>;
export type GuestT = z.infer<typeof Guest>;
export type PayerT = z.infer<typeof Payer>;
export type MemberBookingT = z.infer<typeof MemberBooking>;
export type PaidByT = z.infer<typeof PaidBy>;
export type GuestBookingT = z.infer<typeof GuestBooking>;
export type TransferT = z.infer<typeof Transfer>;
export type BalanceT = z.infer<typeof Balance>;
export type PersonKind = BalanceT["kind"];
