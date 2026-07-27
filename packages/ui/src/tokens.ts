import type { BalanceStatus } from "@courtpot/domain";

/** Shared red/green/neutral balance styling, light and dark. */
export const balanceChipClass: Record<BalanceStatus, string> = {
  owes: "bg-red-50 dark:bg-red-950",
  credit: "bg-green-50 dark:bg-green-950",
  settled: "bg-neutral-100 dark:bg-neutral-800",
};

export const balanceTextClass: Record<BalanceStatus, string> = {
  owes: "text-red-600 dark:text-red-400",
  credit: "text-green-700 dark:text-green-400",
  settled: "text-neutral-500 dark:text-neutral-400",
};

export const screenClass = "flex-1 bg-white dark:bg-neutral-950";
export const cardClass = "rounded-card border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
