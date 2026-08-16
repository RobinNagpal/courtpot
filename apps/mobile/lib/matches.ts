import { matchPlayerIds } from "@courtpot/schemas";
import type { MatchSideT, MatchT } from "@courtpot/schemas";

export type NameOf = (personId: string) => string;

/** "Ada & Bo" for a pair, "Ada" on her own. */
export function sideLabel(side: MatchSideT, nameOf: NameOf): string {
  return side.playerIds.map(nameOf).join(" & ");
}

export function matchTitle(match: MatchT, nameOf: NameOf): string {
  return `${sideLabel(match.sideA, nameOf)} vs ${sideLabel(match.sideB, nameOf)}`;
}

export function scoreLabel(match: MatchT): string {
  return `${match.sideA.points}–${match.sideB.points}`;
}

export function matchesPerson(match: MatchT, personId: string): boolean {
  return matchPlayerIds(match).includes(personId);
}

/**
 * A ranked pair's names, alphabetically. The ids are held sorted so the pair has
 * one identity, but that order is UUID order, which reads as random.
 */
export function pairLabel(playerIds: readonly string[], nameOf: NameOf): string {
  return playerIds
    .map(nameOf)
    .sort((a, b) => a.localeCompare(b))
    .join(" & ");
}
