import { MatchRange, matchPlayerIds } from "@courtpot/schemas";
import type { MatchSideT, MatchT } from "@courtpot/schemas";
import { pairKey } from "@courtpot/domain";
import { startOfTodayIso } from "./date";

export type NameOf = (personId: string) => string;

/**
 * "Ada & Bo" for a pair, "Ada" on her own — always alphabetical, so a pair reads
 * the same way wherever it appears, whichever slots it was entered into. Order
 * within a side carries no meaning, and the score belongs to the side rather
 * than to either player, so nothing is lost by settling on one spelling.
 */
export function sideLabel(side: MatchSideT, nameOf: NameOf): string {
  return side.playerIds
    .map(nameOf)
    .sort((a, b) => a.localeCompare(b))
    .join(" & ");
}

export function matchTitle(match: MatchT, nameOf: NameOf): string {
  return `${sideLabel(match.sideA, nameOf)} vs ${sideLabel(match.sideB, nameOf)}`;
}

export function scoreLabel(match: MatchT): string {
  return `${match.sideA.points}–${match.sideB.points}`;
}

/** Everyone who played, in the order the title reads them. */
export function matchPeople(match: MatchT, nameOf: NameOf): { id: string; name: string }[] {
  const side = (half: MatchSideT): { id: string; name: string }[] =>
    half.playerIds
      .map((personId) => ({ id: personId, name: nameOf(personId) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  return [...side(match.sideA), ...side(match.sideB)];
}

export function matchesPerson(match: MatchT, personId: string): boolean {
  return matchPlayerIds(match).includes(personId);
}

/** The chips offered on the matches and rankings screens, in order. */
export const MATCH_RANGES: readonly { range: MatchRange; label: string }[] = [
  { range: MatchRange.AllTime, label: "All time" },
  { range: MatchRange.Today, label: "Today" },
];

/**
 * The instant a range starts at, or null for all of history. Comparing this
 * against `playedAt` as a string is safe because both are ISO-8601 UTC with the
 * same fixed precision, so lexical order is chronological order.
 */
export function rangeStart(range: MatchRange): string | null {
  return range === MatchRange.AllTime ? null : startOfTodayIso();
}

export function matchesInRange(matches: readonly MatchT[], range: MatchRange): MatchT[] {
  const since = rangeStart(range);
  return since === null ? [...matches] : matches.filter((match) => match.playedAt >= since);
}

/**
 * The pair this side is, or null when it is one player. Only pairs get a page:
 * a solo player already has their own, and the rankings do not count singles.
 */
export function sidePairKey(side: MatchSideT): string | null {
  return side.playerIds.length === 2 ? pairKey(side.playerIds) : null;
}

/** Every match this pair played, either side, newest first. */
export function matchesForPair(matches: readonly MatchT[], key: string): MatchT[] {
  return matches
    .filter((match) => sidePairKey(match.sideA) === key || sidePairKey(match.sideB) === key)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt) || a.id.localeCompare(b.id));
}

/** A pair's names, alphabetical, as the rest of the app writes them. */
export function pairLabel(playerIds: readonly string[], nameOf: NameOf): string {
  return playerIds
    .map(nameOf)
    .sort((a, b) => a.localeCompare(b))
    .join(" & ");
}
