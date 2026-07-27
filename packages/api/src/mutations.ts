import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type {
  GuestBookingT,
  GuestT,
  MemberBookingT,
  MemberT,
  TransferT,
} from "@courtpot/schemas";
import { useLedgerClient } from "./context";
import { queryKeys } from "./keys";
import type { CollectionQueryKey } from "./keys";
import type { CollectionClient, Entity } from "./client";

interface OptimisticContext<T> {
  previous: T[] | undefined;
}

export interface CollectionMutations<T extends Entity> {
  create: UseMutationResult<T, Error, T, OptimisticContext<T>>;
  update: UseMutationResult<T, Error, T, OptimisticContext<T>>;
  remove: UseMutationResult<void, Error, string, OptimisticContext<T>>;
}

/**
 * Create/update/remove with optimistic cache updates: apply immediately,
 * roll back on error, invalidate on settle. Balances derive from these
 * caches, so they update instantly too.
 */
function useCollectionMutations<T extends Entity>(
  queryKey: CollectionQueryKey,
  collection: CollectionClient<T>,
): CollectionMutations<T> {
  const queryClient = useQueryClient();

  const applyOptimistic = async (updater: (rows: T[]) => T[]): Promise<OptimisticContext<T>> => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<T[]>(queryKey);
    queryClient.setQueryData<T[]>(queryKey, (rows) => updater(rows ?? []));
    return { previous };
  };
  const rollback = (context: OptimisticContext<T> | undefined): void => {
    if (context !== undefined) {
      queryClient.setQueryData(queryKey, context.previous);
    }
  };
  const invalidate = (): Promise<void> => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: (row: T) => collection.create(row),
    onMutate: (row: T) => applyOptimistic((rows) => [...rows, row]),
    onError: (_error: Error, _row: T, context: OptimisticContext<T> | undefined) => rollback(context),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: (row: T) => collection.update(row),
    onMutate: (row: T) => applyOptimistic((rows) => rows.map((existing) => (existing.id === row.id ? row : existing))),
    onError: (_error: Error, _row: T, context: OptimisticContext<T> | undefined) => rollback(context),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => collection.remove(id),
    onMutate: (id: string) => applyOptimistic((rows) => rows.filter((existing) => existing.id !== id)),
    onError: (_error: Error, _id: string, context: OptimisticContext<T> | undefined) => rollback(context),
    onSettled: invalidate,
  });

  return { create, update, remove };
}

export function useMemberMutations(): CollectionMutations<MemberT> {
  return useCollectionMutations(queryKeys.members, useLedgerClient().members);
}

export function useGuestMutations(): CollectionMutations<GuestT> {
  return useCollectionMutations(queryKeys.guests, useLedgerClient().guests);
}

export function useMemberBookingMutations(): CollectionMutations<MemberBookingT> {
  return useCollectionMutations(queryKeys.memberBookings, useLedgerClient().memberBookings);
}

export function useGuestBookingMutations(): CollectionMutations<GuestBookingT> {
  return useCollectionMutations(queryKeys.guestBookings, useLedgerClient().guestBookings);
}

export function useTransferMutations(): CollectionMutations<TransferT> {
  return useCollectionMutations(queryKeys.transfers, useLedgerClient().transfers);
}

/** Settle-up: write N transfers as one logical action, invalidate once. */
export function useLogSettlements(): UseMutationResult<
  TransferT[],
  Error,
  TransferT[],
  OptimisticContext<TransferT>
> {
  const client = useLedgerClient();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.transfers;

  return useMutation({
    mutationFn: (transfers: TransferT[]) => client.transfers.createMany(transfers),
    onMutate: async (transfers: TransferT[]) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TransferT[]>(queryKey);
      queryClient.setQueryData<TransferT[]>(queryKey, (rows) => [...(rows ?? []), ...transfers]);
      return { previous };
    },
    onError: (_error: Error, _transfers: TransferT[], context: OptimisticContext<TransferT> | undefined) => {
      if (context !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
