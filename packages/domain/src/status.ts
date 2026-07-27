export type BalanceStatus = "owes" | "credit" | "settled";

export function balanceStatus(owedCents: number): BalanceStatus {
  if (owedCents > 0) {
    return "owes";
  }
  if (owedCents < 0) {
    return "credit";
  }
  return "settled";
}
