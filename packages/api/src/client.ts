import { z } from "zod";
import {
  Guest,
  GuestBooking,
  Member,
  MemberBooking,
  Transfer,
} from "@courtpot/schemas";
import type {
  GuestBookingT,
  GuestT,
  MemberBookingT,
  MemberT,
  TransferT,
} from "@courtpot/schemas";

export interface Entity {
  id: string;
}

export interface CollectionClient<T extends Entity> {
  list(): Promise<T[]>;
  create(row: T): Promise<T>;
  createMany(rows: T[]): Promise<T[]>;
  update(row: T): Promise<T>;
  remove(id: string): Promise<void>;
}

/** The five raw collections the wider app's backend must provide. */
export interface LedgerClient {
  members: CollectionClient<MemberT>;
  guests: CollectionClient<GuestT>;
  memberBookings: CollectionClient<MemberBookingT>;
  guestBookings: CollectionClient<GuestBookingT>;
  transfers: CollectionClient<TransferT>;
}

/** Minimal async string store (AsyncStorage, MMKV, localStorage…). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

function createCollection<T extends Entity, TInput>(
  store: KeyValueStore,
  storageKey: string,
  schema: z.ZodType<T, z.ZodTypeDef, TInput>,
): CollectionClient<T> {
  const listSchema = z.array(schema);

  // Serialise read-modify-write cycles so concurrent mutations never lose rows.
  let queue: Promise<void> = Promise.resolve();
  const enqueue = <R>(operation: () => Promise<R>): Promise<R> => {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const read = async (): Promise<T[]> => {
    const raw = await store.getItem(storageKey);
    return raw === null ? [] : listSchema.parse(JSON.parse(raw));
  };
  const write = (rows: readonly T[]): Promise<void> => store.setItem(storageKey, JSON.stringify(rows));

  return {
    list: () => enqueue(read),
    create: (row) =>
      enqueue(async () => {
        await write([...(await read()), row]);
        return row;
      }),
    createMany: (rows) =>
      enqueue(async () => {
        await write([...(await read()), ...rows]);
        return rows;
      }),
    update: (row) =>
      enqueue(async () => {
        const rows = await read();
        if (!rows.some((existing) => existing.id === row.id)) {
          throw new Error(`Row ${row.id} not found in ${storageKey}`);
        }
        await write(rows.map((existing) => (existing.id === row.id ? row : existing)));
        return row;
      }),
    remove: (id) =>
      enqueue(async () => {
        await write((await read()).filter((existing) => existing.id !== id));
      }),
  };
}

/**
 * A LedgerClient persisted in a local key-value store. Fully offline; swap
 * for a REST/Supabase client with the same interface later.
 */
export function createLocalLedgerClient(store: KeyValueStore): LedgerClient {
  const key = (name: string): string => `courtpot.costSplitting.${name}`;
  return {
    members: createCollection(store, key("members"), Member),
    guests: createCollection(store, key("guests"), Guest),
    memberBookings: createCollection(store, key("memberBookings"), MemberBooking),
    guestBookings: createCollection(store, key("guestBookings"), GuestBooking),
    transfers: createCollection(store, key("transfers"), Transfer),
  };
}
