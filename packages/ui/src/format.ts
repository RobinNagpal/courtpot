/** The single money-formatting edge: integer cents in, display string out. */
export function formatCents(cents: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** "12", "12.5", "$1,250.75" → cents. Null when not a valid amount. */
export function parseDollarsToCents(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  return Math.round(Number(cleaned) * 100);
}

/** Cents → plain editable text like "12.50". */
export function centsToDollarsText(cents: number): string {
  return (cents / 100).toFixed(2);
}
