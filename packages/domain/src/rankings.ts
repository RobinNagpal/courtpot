import { Side, matchWinner } from "@courtpot/schemas";
import type { MatchT } from "@courtpot/schemas";

const PAIR_SIZE = 2;

export interface PairRanking {
  /** The pair's identity: both ids sorted and joined. Stable across match order. */
  key: string;
  /** The two player ids, sorted to match the key. */
  playerIds: [string, string];
  played: number;
  won: number;
  lost: number;
  /** Share of matches won, 0–1. */
  winRate: number;
}

/** Two ids in a fixed order, so a pair is the same pair whichever way it was entered. */
export function pairKey(playerIds: readonly string[]): string {
  return [...playerIds].sort().join("|");
}

interface Tally {
  playerIds: [string, string];
  played: number;
  won: number;
}

/**
 * Win/loss records for every pair that has played, strongest first.
 *
 * Derived from the matches alone — a pair is never stored, so people can partner
 * up freely and the table follows. Singles sides are skipped: one player is not
 * a partnership, and counting them would mix individuals into a pairs table.
 */
export function computePairRankings(matches: readonly MatchT[]): PairRanking[] {
  const tallies = new Map<string, Tally>();

  const record = (playerIds: readonly string[], won: boolean): void => {
    const [first, second] = [...playerIds].sort();
    if (playerIds.length !== PAIR_SIZE || first === undefined || second === undefined) {
      return;
    }
    const key = `${first}|${second}`;
    const tally = tallies.get(key) ?? { playerIds: [first, second], played: 0, won: 0 };
    tally.played += 1;
    tally.won += won ? 1 : 0;
    tallies.set(key, tally);
  };

  for (const match of matches) {
    const winner = matchWinner(match);
    record(match.sideA.playerIds, winner === Side.A);
    record(match.sideB.playerIds, winner === Side.B);
  }

  return [...tallies]
    .map(([key, tally]): PairRanking => ({
      key,
      playerIds: tally.playerIds,
      played: tally.played,
      won: tally.won,
      lost: tally.played - tally.won,
      winRate: tally.won / tally.played,
    }))
    // Most wins first, then the better record, then the key so ties never shuffle
    // between renders.
    .sort((a, b) => b.won - a.won || b.winRate - a.winRate || a.key.localeCompare(b.key));
}
