/**
 * Split an integer amount of cents equally between ids, exactly.
 *
 * Base share is floor(total / n); the remaining cents are handed out one
 * each to the first ids in sorted order, so the result is deterministic
 * and always sums to exactly `totalCents`.
 */
export function splitCents(totalCents: number, ids: readonly string[]): Record<string, number> {
  if (ids.length === 0) {
    throw new Error("splitCents needs at least one id");
  }
  const ordered = [...ids].sort();
  const base = Math.floor(totalCents / ordered.length);
  const remainder = totalCents - base * ordered.length;
  const shares: Record<string, number> = {};
  ordered.forEach((id, index) => {
    shares[id] = base + (index < remainder ? 1 : 0);
  });
  return shares;
}
