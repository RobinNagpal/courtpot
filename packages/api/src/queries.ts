import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { computeBalances } from "@courtpot/domain";
import type { LedgerInput } from "@courtpot/domain";
import type {
  BalanceT,
  GuestBookingT,
  GuestT,
  MemberBookingT,
  MemberT,
  TransferT,
} from "@courtpot/schemas";
import { useLedgerClient } from "./context";
import { queryKeys } from "./keys";

export function useMembers(): UseQueryResult<MemberT[], Error> {
  const client = useLedgerClient();
  return useQuery({ queryKey: queryKeys.members, queryFn: () => client.members.list() });
}

export function useGuests(): UseQueryResult<GuestT[], Error> {
  const client = useLedgerClient();
  return useQuery({ queryKey: queryKeys.guests, queryFn: () => client.guests.list() });
}

export function useMemberBookings(): UseQueryResult<MemberBookingT[], Error> {
  const client = useLedgerClient();
  return useQuery({ queryKey: queryKeys.memberBookings, queryFn: () => client.memberBookings.list() });
}

export function useGuestBookings(): UseQueryResult<GuestBookingT[], Error> {
  const client = useLedgerClient();
  return useQuery({ queryKey: queryKeys.guestBookings, queryFn: () => client.guestBookings.list() });
}

export function useTransfers(): UseQueryResult<TransferT[], Error> {
  const client = useLedgerClient();
  return useQuery({ queryKey: queryKeys.transfers, queryFn: () => client.transfers.list() });
}

export interface LedgerInputResult {
  input: LedgerInput | null;
  isPending: boolean;
  isError: boolean;
}

/**
 * All five cached collections combined, or null while any is still loading.
 *
 * `teamId` scopes the ledger: guests, bookings and transfers all belong to one
 * team, so passing it filters the cached rows down to that team. Members are not
 * filtered — a booking can reference any member, and balances must still name
 * them. Omit it to combine every team.
 */
export function useLedgerInput(teamId?: string): LedgerInputResult {
  const members = useMembers();
  const guests = useGuests();
  const memberBookings = useMemberBookings();
  const guestBookings = useGuestBookings();
  const transfers = useTransfers();

  const results = [members, guests, memberBookings, guestBookings, transfers];
  const isPending = results.some((r) => r.isPending);
  const isError = results.some((r) => r.isError);

  const input = useMemo((): LedgerInput | null => {
    if (!members.data || !guests.data || !memberBookings.data || !guestBookings.data || !transfers.data) {
      return null;
    }
    const inTeam = <T extends { teamId: string }>(rows: readonly T[]): T[] =>
      teamId === undefined ? [...rows] : rows.filter((row) => row.teamId === teamId);
    return {
      members: members.data,
      guests: inTeam(guests.data),
      memberBookings: inTeam(memberBookings.data),
      guestBookings: inTeam(guestBookings.data),
      transfers: inTeam(transfers.data),
    };
  }, [teamId, members.data, guests.data, memberBookings.data, guestBookings.data, transfers.data]);

  return { input, isPending, isError };
}

export interface BalancesResult extends LedgerInputResult {
  balances: BalanceT[];
}

/** Balances derived from the query caches — no network round-trip. */
export function useBalances(teamId?: string): BalancesResult {
  const { input, isPending, isError } = useLedgerInput(teamId);
  const balances = useMemo(() => (input === null ? [] : computeBalances(input)), [input]);
  return { balances, input, isPending, isError };
}
