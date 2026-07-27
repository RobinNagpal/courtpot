import type { BalanceT } from "@courtpot/schemas";

export interface Settlement {
  fromId: string;
  toId: string;
  amountCents: number;
}

interface OpenAmount {
  id: string;
  remaining: number;
}

function byRemainingDesc(a: OpenAmount, b: OpenAmount): number {
  return b.remaining - a.remaining || a.id.localeCompare(b.id);
}

/**
 * Greedy minimal settle-up: repeatedly pay the largest creditor from the
 * largest debtor until everyone is at zero.
 */
export function suggestSettlements(balances: readonly BalanceT[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.owedCents > 0)
    .map((b): OpenAmount => ({ id: b.personId, remaining: b.owedCents }))
    .sort(byRemainingDesc);
  const creditors = balances
    .filter((b) => b.owedCents < 0)
    .map((b): OpenAmount => ({ id: b.personId, remaining: -b.owedCents }))
    .sort(byRemainingDesc);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    if (debtor === undefined || creditor === undefined) {
      break;
    }
    const amountCents = Math.min(debtor.remaining, creditor.remaining);
    settlements.push({ fromId: debtor.id, toId: creditor.id, amountCents });
    debtor.remaining -= amountCents;
    creditor.remaining -= amountCents;
    if (debtor.remaining === 0) {
      debtorIndex += 1;
    }
    if (creditor.remaining === 0) {
      creditorIndex += 1;
    }
  }
  return settlements;
}
