/**
 * Initials for an avatar chip.
 *
 * One word gives two letters ("Puneet" → "PU") so a single glyph never looks
 * like a typo; two or more words give the first letter of the first and last
 * ("Robin Nagpal" → "RN", "Mary Jane Watson" → "MW"). Non-letters are ignored,
 * so "  robin  " and "Robin" agree.
 */
export function initialsFrom(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "?";
  }
  if (words.length === 1) {
    return (words[0] ?? "").slice(0, 2).toUpperCase();
  }
  const first = words[0] ?? "";
  const last = words[words.length - 1] ?? "";
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase();
}

export interface Tint {
  bg: string;
  text: string;
}

/** Six fixed tints, picked from the name so a person keeps the same colour. */
const TINTS: readonly Tint[] = [
  { bg: "bg-rose-100 dark:bg-rose-900", text: "text-rose-700 dark:text-rose-200" },
  { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-200" },
  { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-200" },
  { bg: "bg-sky-100 dark:bg-sky-900", text: "text-sky-700 dark:text-sky-200" },
  { bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-700 dark:text-violet-200" },
  { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-700 dark:text-teal-200" },
];

const FALLBACK: Tint = { bg: "bg-neutral-200", text: "text-neutral-700" };

export function tintFor(name: string): Tint {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }
  return TINTS[hash % TINTS.length] ?? FALLBACK;
}
