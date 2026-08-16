import {
  Guest,
  GuestBooking,
  Match,
  Member,
  MemberBooking,
  MemberCreate,
  Role,
  Transfer,
} from "@courtpot/schemas";
import type {
  GuestBookingT,
  GuestT,
  MatchT,
  MemberBookingT,
  MemberCreateT,
  TransferT,
} from "@courtpot/schemas";
import { countMatchReferences, countPersonReferences } from "@courtpot/domain";
import type { LedgerInput } from "@courtpot/domain";
import { ensureTeamMembership } from "./bootstrap";
import type { CollectionStore } from "./collections";
import type { Db } from "./db";
import { ConflictError } from "./errors";
import { generatePin } from "./pin";

export interface LedgerStores {
  members: CollectionStore<MemberCreateT>;
  guests: CollectionStore<GuestT>;
  memberBookings: CollectionStore<MemberBookingT>;
  guestBookings: CollectionStore<GuestBookingT>;
  transfers: CollectionStore<TransferT>;
  matches: CollectionStore<MatchT>;
}

async function loadLedger(db: Db): Promise<LedgerInput> {
  const [members, guests, memberBookings, guestBookings, transfers] = await Promise.all([
    db.member.findMany(),
    db.guest.findMany(),
    db.memberBooking.findMany(),
    db.guestBooking.findMany(),
    db.transfer.findMany(),
  ]);
  return {
    members: Member.array().parse(members),
    guests: Guest.array().parse(guests.map((g) => ({ ...g, note: g.note ?? undefined }))),
    memberBookings: MemberBooking.array().parse(memberBookings),
    guestBookings: GuestBooking.array().parse(guestBookings),
    transfers: Transfer.array().parse(transfers.map((t) => ({ ...t, note: t.note ?? undefined }))),
  };
}

async function assertUnreferenced(db: Db, personId: string, label: string): Promise<void> {
  const [ledger, matches] = await Promise.all([loadLedger(db), db.match.findMany()]);
  const references =
    countPersonReferences(personId, ledger) + countMatchReferences(personId, Match.array().parse(matches));
  if (references > 0) {
    throw new ConflictError(`Cannot delete this ${label}: referenced by ${references} row(s)`);
  }
}

export function createStores(db: Db): LedgerStores {
  const members: CollectionStore<MemberCreateT> = {
    list: async () => MemberCreate.array().parse(await db.member.findMany({ orderBy: { name: "asc" } })),
    create: async (row) => {
      const created = await db.member.create({ data: { ...row, pin: generatePin() } });
      // Nobody is left teamless.
      await ensureTeamMembership(db, created.id, Role.TeamMember);
      return MemberCreate.parse(created);
    },
    createMany: async (rows) => {
      const created: MemberCreateT[] = [];
      for (const row of rows) {
        const made = await db.member.create({ data: { ...row, pin: generatePin() } });
        await ensureTeamMembership(db, made.id, Role.TeamMember);
        created.push(MemberCreate.parse(made));
      }
      return created;
    },
    update: async (row) =>
      MemberCreate.parse(
        await db.member.update({
          where: { id: row.id },
          data: { name: row.name, username: row.username, active: row.active },
        }),
      ),
    remove: async (id) => {
      await assertUnreferenced(db, id, "member");
      await db.member.delete({ where: { id } });
    },
  };

  const guests: CollectionStore<GuestT> = {
    list: async () =>
      Guest.array().parse(
        (await db.guest.findMany({ orderBy: { name: "asc" } })).map((g) => ({ ...g, note: g.note ?? undefined })),
      ),
    create: async (row) => {
      const created = await db.guest.create({ data: { ...row, note: row.note ?? null } });
      return Guest.parse({ ...created, note: created.note ?? undefined });
    },
    createMany: async (rows) => {
      await db.guest.createMany({ data: rows.map((row) => ({ ...row, note: row.note ?? null })) });
      return rows;
    },
    update: async (row) => {
      const updated = await db.guest.update({
        where: { id: row.id },
        data: { name: row.name, note: row.note ?? null },
      });
      return Guest.parse({ ...updated, note: updated.note ?? undefined });
    },
    remove: async (id) => {
      await assertUnreferenced(db, id, "guest");
      await db.guest.delete({ where: { id } });
    },
  };

  const memberBookings: CollectionStore<MemberBookingT> = {
    list: async () => MemberBooking.array().parse(await db.memberBooking.findMany({ orderBy: { date: "desc" } })),
    create: async (row) => MemberBooking.parse(await db.memberBooking.create({ data: row })),
    createMany: async (rows) => {
      await db.memberBooking.createMany({ data: rows });
      return rows;
    },
    update: async (row) =>
      MemberBooking.parse(
        await db.memberBooking.update({
          where: { id: row.id },
          data: { date: row.date, title: row.title, memberIds: row.memberIds, payers: row.payers },
        }),
      ),
    remove: async (id) => {
      await db.memberBooking.delete({ where: { id } });
    },
  };

  const guestBookings: CollectionStore<GuestBookingT> = {
    list: async () => GuestBooking.array().parse(await db.guestBooking.findMany({ orderBy: { date: "desc" } })),
    create: async (row) => GuestBooking.parse(await db.guestBooking.create({ data: row })),
    createMany: async (rows) => {
      await db.guestBooking.createMany({ data: rows });
      return rows;
    },
    update: async (row) =>
      GuestBooking.parse(
        await db.guestBooking.update({
          where: { id: row.id },
          data: { date: row.date, title: row.title, guests: row.guests, paidBy: row.paidBy },
        }),
      ),
    remove: async (id) => {
      await db.guestBooking.delete({ where: { id } });
    },
  };

  const transfers: CollectionStore<TransferT> = {
    list: async () =>
      Transfer.array().parse(
        (await db.transfer.findMany({ orderBy: { date: "desc" } })).map((t) => ({ ...t, note: t.note ?? undefined })),
      ),
    create: async (row) => {
      const created = await db.transfer.create({ data: { ...row, note: row.note ?? null } });
      return Transfer.parse({ ...created, note: created.note ?? undefined });
    },
    createMany: async (rows) => {
      await db.transfer.createMany({ data: rows.map((row) => ({ ...row, note: row.note ?? null })) });
      return rows;
    },
    update: async (row) => {
      const updated = await db.transfer.update({
        where: { id: row.id },
        data: { date: row.date, fromId: row.fromId, toId: row.toId, amount: row.amount, note: row.note ?? null },
      });
      return Transfer.parse({ ...updated, note: updated.note ?? undefined });
    },
    remove: async (id) => {
      await db.transfer.delete({ where: { id } });
    },
  };

  const matches: CollectionStore<MatchT> = {
    list: async () => Match.array().parse(await db.match.findMany({ orderBy: { playedAt: "desc" } })),
    create: async (row) => Match.parse(await db.match.create({ data: row })),
    createMany: async (rows) => {
      await db.match.createMany({ data: rows });
      return rows;
    },
    update: async (row) =>
      Match.parse(
        await db.match.update({
          where: { id: row.id },
          data: { playedAt: row.playedAt, sideA: row.sideA, sideB: row.sideB },
        }),
      ),
    remove: async (id) => {
      await db.match.delete({ where: { id } });
    },
  };

  return { members, guests, memberBookings, guestBookings, transfers, matches };
}
