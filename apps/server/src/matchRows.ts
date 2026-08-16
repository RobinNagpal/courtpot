import { Match } from "@courtpot/schemas";
import type { MatchSideT, MatchT } from "@courtpot/schemas";

/**
 * Matches are stored as columns, not JSON: a side is `player_1` plus a nullable
 * `player_2`, and singles is "both player_2 are null". That shape lets the
 * database check what Zod checks — equal sides, nobody twice, no draw — and
 * leaves the ids queryable without digging through JSON.
 *
 * There is deliberately no foreign key on a player. An id names a member or a
 * guest, and a Postgres reference points at exactly one table; deletes are
 * guarded in application code instead, exactly as they are for transfers.
 */
export interface MatchRow {
  id: string;
  teamId: string;
  playedAt: string;
  sideAPlayer1: string;
  sideAPlayer2: string | null;
  sideAPoints: number;
  sideBPlayer1: string;
  sideBPlayer2: string | null;
  sideBPoints: number;
}

/** A validated side always has a first player; the second exists only in doubles. */
function slotsOf(side: MatchSideT): { first: string; second: string | null } {
  const [first, second] = side.playerIds;
  if (first === undefined) {
    // Unreachable: MatchSide requires at least one player.
    throw new Error("A match side has no players");
  }
  return { first, second: second ?? null };
}

export function toMatchRow(match: MatchT): MatchRow {
  const sideA = slotsOf(match.sideA);
  const sideB = slotsOf(match.sideB);
  return {
    id: match.id,
    teamId: match.teamId,
    playedAt: match.playedAt,
    sideAPlayer1: sideA.first,
    sideAPlayer2: sideA.second,
    sideAPoints: match.sideA.points,
    sideBPlayer1: sideB.first,
    sideBPlayer2: sideB.second,
    sideBPoints: match.sideB.points,
  };
}

const playerIds = (first: string, second: string | null): string[] =>
  second === null ? [first] : [first, second];

export function toMatch(row: MatchRow): MatchT {
  return Match.parse({
    id: row.id,
    teamId: row.teamId,
    playedAt: row.playedAt,
    sideA: { playerIds: playerIds(row.sideAPlayer1, row.sideAPlayer2), points: row.sideAPoints },
    sideB: { playerIds: playerIds(row.sideBPlayer1, row.sideBPlayer2), points: row.sideBPoints },
  });
}
