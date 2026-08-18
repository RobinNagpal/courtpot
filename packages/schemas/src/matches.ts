import { z } from "zod";
import { Uuid } from "./ids";

/** Which half of a match. */
export enum Side {
  A = "A",
  B = "B",
}

export const SideSchema = z.nativeEnum(Side);

/** No racquet sport scores anywhere near this; the point is to stay inside INTEGER. */
const MAX_POINTS = 10_000;

/** A side is one player or two; nothing bigger is a match. */
export const MAX_PLAYERS_PER_SIDE = 2;

/** Doubles is what gets played, so it is what the form starts on. */
export const PLAYERS_PER_SIDE_DEFAULT = 2;

/**
 * One half of a match: a single player, or a pair. Order within a side means
 * nothing — "Ada & Bo" and "Bo & Ada" are the same pair.
 *
 * A player id is a member's or a guest's. Both are UUIDs drawn from disjoint
 * tables, so which kind it is can be looked up rather than stored.
 */
export const MatchSide = z.object({
  playerIds: z.array(Uuid).min(1, "Pick every player").max(MAX_PLAYERS_PER_SIDE),
  /**
   * Match points this side scored. Capped well above any real score but well
   * below `INTEGER`, so a fat-fingered number is a 400 and never an overflow.
   */
  points: z.number().int().nonnegative("Points cannot be negative").max(MAX_POINTS, "That score is too high"),
});

export const Match = z
  .object({
    id: Uuid,
    teamId: Uuid,
    /**
     * ISO-8601 UTC instant, e.g. 2026-08-16T14:30:00.000Z.
     *
     * A string rather than a timestamp so the row survives the JSON round-trip
     * unchanged, and pinned to exactly three fractional digits — which is what
     * makes `ORDER BY played_at` chronological. Bare `.datetime()` also accepts
     * `…:00Z` and `…:00.5Z`, and those sort against `…:00.500Z` in the wrong
     * order, so the precision is the whole guarantee.
     */
    playedAt: z.string().datetime({ precision: 3 }),
    sideA: MatchSide,
    sideB: MatchSide,
  })
  .superRefine((match, ctx) => {
    const issue = (message: string): void => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    };
    if (match.sideA.playerIds.length !== match.sideB.playerIds.length) {
      issue("Both sides need the same number of players");
    }
    const playerIds = [...match.sideA.playerIds, ...match.sideB.playerIds];
    if (new Set(playerIds).size !== playerIds.length) {
      issue("Nobody can play twice in the same match");
    }
    if (match.sideA.points === match.sideB.points) {
      issue("A match cannot end level — one side has to win");
    }
  });

export type MatchSideT = z.infer<typeof MatchSide>;
export type MatchT = z.infer<typeof Match>;

/** The side that scored more. Level scores never parse, so this is decisive. */
export function matchWinner(match: MatchT): Side {
  return match.sideA.points > match.sideB.points ? Side.A : Side.B;
}

export function matchSide(match: MatchT, side: Side): MatchSideT {
  return side === Side.A ? match.sideA : match.sideB;
}

/** Everyone who played, both sides together. */
export function matchPlayerIds(match: MatchT): string[] {
  return [...match.sideA.playerIds, ...match.sideB.playerIds];
}

/** How much history a matches or rankings view covers. */
export enum MatchRange {
  Today = "Today",
  AllTime = "AllTime",
}

export const MatchRangeSchema = z.nativeEnum(MatchRange);
