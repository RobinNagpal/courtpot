import { describe, expect, it } from "vitest";
import { Role } from "@courtpot/schemas";
import type { BalanceT, GuestBookingT, GuestT, MemberBookingT, MemberT, TransferT } from "@courtpot/schemas";
import {
  balanceStatus,
  computeBalances,
  memberBookingSplit,
  reconcileTotal,
  splitCents,
  suggestSettlements,
} from "../src";
import type { LedgerInput } from "../src";

const TEAM = "00000000-0000-4000-8000-000000000001";

const member = (id: string, name: string, active = true): MemberT => ({
  id,
  name,
  active,
  role: Role.TeamMember,
});
const guest = (id: string, name: string): GuestT => ({ id, teamId: TEAM, name });

const emptyLedger: LedgerInput = {
  members: [],
  guests: [],
  memberBookings: [],
  guestBookings: [],
  transfers: [],
};

const robinN = member("m-1-robin-n", "Robin N");
const robinS = member("m-2-robin-s", "Robin S");
const puneet = member("m-3-puneet", "Puneet");
const akshay = member("m-4-akshay", "Akshay");
const gurpinder = member("m-5-gurpinder", "Gurpinder");
const regulars = [robinN, robinS, puneet, akshay, gurpinder];

const owedByName = (balances: readonly BalanceT[]): Record<string, number> =>
  Object.fromEntries(balances.map((b) => [b.name, b.owedCents]));

describe("scenario 1: equal split", () => {
  const booking: MemberBookingT = {
    id: "b-1",
    teamId: TEAM,
    date: "2026-07-01",
    title: "Sunday courts",
    memberIds: [robinN.id, robinS.id, puneet.id, akshay.id],
    payers: [
      { memberId: robinN.id, amount: 4800 },
      { memberId: puneet.id, amount: 2400 },
    ],
  };
  const ledger: LedgerInput = { ...emptyLedger, members: regulars, memberBookings: [booking] };

  it("splits $72 four ways at $18 each", () => {
    expect(memberBookingSplit(booking)).toEqual({
      [robinN.id]: 1800,
      [robinS.id]: 1800,
      [puneet.id]: 1800,
      [akshay.id]: 1800,
    });
  });

  it("credits payers and charges players", () => {
    const balances = computeBalances(ledger);
    expect(owedByName(balances)).toEqual({
      "Robin N": -3000,
      "Robin S": 1800,
      Puneet: -600,
      Akshay: 1800,
      Gurpinder: 0,
    });
    expect(reconcileTotal(balances)).toBe(0);
  });
});

describe("scenario 2: member-fronted guest", () => {
  const sam = guest("g-1-sam", "Sam");
  const guestBooking: GuestBookingT = {
    id: "gb-1",
    teamId: TEAM,
    date: "2026-07-02",
    title: "",
    guestId: sam.id,
    amount: 1500,
    paidBy: robinN.id,
  };
  const base: LedgerInput = {
    ...emptyLedger,
    members: regulars,
    guests: [sam],
    guestBookings: [guestBooking],
  };

  it("charges the guest and credits the fronting member", () => {
    const balances = computeBalances(base);
    expect(owedByName(balances)).toMatchObject({ Sam: 1500, "Robin N": -1500 });
    expect(reconcileTotal(balances)).toBe(0);
  });

  it("a repayment transfer settles the guest", () => {
    const repayment: TransferT = {
      id: "t-1",
      teamId: TEAM,
      date: "2026-07-03",
      fromId: sam.id,
      toId: robinN.id,
      amount: 1500,
    };
    const balances = computeBalances({ ...base, transfers: [repayment] });
    expect(owedByName(balances)).toMatchObject({ Sam: 0, "Robin N": 0 });
    expect(reconcileTotal(balances)).toBe(0);
  });
});

describe('scenario 3: "ALL"-funded guest', () => {
  it("shares the credit across all five active members", () => {
    const alex = guest("g-2-alex", "Alex");
    const balances = computeBalances({
      ...emptyLedger,
      members: regulars,
      guests: [alex],
      guestBookings: [
        { id: "gb-2", teamId: TEAM, date: "2026-07-04", title: "", guestId: alex.id, amount: 1000, paidBy: "ALL" },
      ],
    });
    expect(owedByName(balances)).toEqual({
      "Robin N": -200,
      "Robin S": -200,
      Puneet: -200,
      Akshay: -200,
      Gurpinder: -200,
      Alex: 1000,
    });
    expect(reconcileTotal(balances)).toBe(0);
  });
});

describe("scenario 4: extensible members", () => {
  const dave = member("m-6-dave", "Dave");
  const alex = guest("g-2-alex", "Alex");
  const ledger: LedgerInput = {
    ...emptyLedger,
    members: [...regulars, dave],
    guests: [alex],
    memberBookings: [
      {
        id: "b-2",
        teamId: TEAM,
        date: "2026-07-05",
        title: "",
        memberIds: [robinN.id, dave.id],
        payers: [{ memberId: robinN.id, amount: 2000 }],
      },
    ],
    guestBookings: [
      { id: "gb-3", teamId: TEAM, date: "2026-07-05", title: "", guestId: alex.id, amount: 1200, paidBy: "ALL" },
    ],
  };

  it("splits a duo booking $10 each and an ALL booking six ways", () => {
    const balances = computeBalances(ledger);
    expect(owedByName(balances)).toEqual({
      "Robin N": 1000 - 2000 - 200,
      "Robin S": -200,
      Puneet: -200,
      Akshay: -200,
      Gurpinder: -200,
      Dave: 1000 - 200,
      Alex: 1200,
    });
    expect(reconcileTotal(balances)).toBe(0);
  });
});

describe("scenario 5: reconciliation invariant on random data", () => {
  it("sums to zero for seeded random ledgers", () => {
    let seed = 42;
    const nextInt = (max: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    for (let run = 0; run < 25; run += 1) {
      const members = Array.from({ length: 2 + nextInt(6) }, (_, i) =>
        member(`m-${i}`, `Member ${i}`, nextInt(4) > 0),
      );
      if (!members.some((m) => m.active)) {
        members[0] = member("m-0", "Member 0", true);
      }
      const guests = Array.from({ length: 1 + nextInt(4) }, (_, i) => guest(`g-${i}`, `Guest ${i}`));
      const people = [...members, ...guests];
      const pickMember = (): MemberT => members[nextInt(members.length)] ?? members[0]!;
      const pickPerson = (): MemberT | GuestT => people[nextInt(people.length)] ?? members[0]!;

      const memberBookings: MemberBookingT[] = Array.from({ length: nextInt(8) }, (_, i) => ({
        id: `b-${i}`,
        teamId: TEAM,
        date: "2026-01-01",
        title: "",
        memberIds: [...new Set(Array.from({ length: 1 + nextInt(members.length) }, () => pickMember().id))],
        payers: [{ memberId: pickMember().id, amount: 1 + nextInt(10000) }],
      }));
      const guestBookings: GuestBookingT[] = Array.from({ length: nextInt(8) }, (_, i) => ({
        id: `gb-${i}`,
        teamId: TEAM,
        date: "2026-01-01",
        title: "",
        guestId: guests[nextInt(guests.length)]?.id ?? guests[0]!.id,
        amount: 1 + nextInt(5000),
        paidBy: nextInt(3) === 0 ? "ALL" : pickMember().id,
      }));
      const transfers: TransferT[] = Array.from({ length: nextInt(8) }, (_, i) => {
        const from = pickPerson();
        const to = people.find((p) => p.id !== from.id) ?? from;
        return { id: `t-${i}`, teamId: TEAM, date: "2026-01-02", fromId: from.id, toId: to.id, amount: 1 + nextInt(4000) };
      }).filter((t) => t.fromId !== t.toId);

      const balances = computeBalances({ members, guests, memberBookings, guestBookings, transfers });
      expect(reconcileTotal(balances)).toBe(0);
    }
  });
});

describe("scenario 6: settle-up minimality", () => {
  it("matches largest debtor to largest creditor", () => {
    const balances: BalanceT[] = [
      { personId: akshay.id, kind: "member", name: "Akshay", owedCents: 1400 },
      { personId: puneet.id, kind: "member", name: "Puneet", owedCents: -1000 },
      { personId: robinN.id, kind: "member", name: "Robin N", owedCents: -400 },
    ];
    expect(suggestSettlements(balances)).toEqual([
      { fromId: akshay.id, toId: puneet.id, amountCents: 1000 },
      { fromId: akshay.id, toId: robinN.id, amountCents: 400 },
    ]);
  });

  it("returns nothing when everyone is settled", () => {
    expect(
      suggestSettlements([{ personId: robinN.id, kind: "member", name: "Robin N", owedCents: 0 }]),
    ).toEqual([]);
  });
});

describe("scenario 7: colour thresholds", () => {
  it("maps owed sign to status", () => {
    expect(balanceStatus(1)).toBe("owes");
    expect(balanceStatus(-1)).toBe("credit");
    expect(balanceStatus(0)).toBe("settled");
  });
});

describe("scenario 8: rounding", () => {
  it("splits $10 three ways as 334/333/333", () => {
    const shares = splitCents(1000, ["m-a", "m-b", "m-c"]);
    expect(shares).toEqual({ "m-a": 334, "m-b": 333, "m-c": 333 });
    expect(Object.values(shares).reduce((sum, s) => sum + s, 0)).toBe(1000);
  });

  it("is deterministic regardless of input order", () => {
    expect(splitCents(1000, ["m-c", "m-a", "m-b"])).toEqual(splitCents(1000, ["m-a", "m-b", "m-c"]));
  });
});
