import { z } from "zod";

/** Which half of a match. */
export enum Side {
  A = "A",
  B = "B",
}

export const SideSchema = z.nativeEnum(Side);

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
  playerIds: z.array(z.string().uuid()).min(1, "Pick every player").max(PLAYERS_PER_SIDE_DEFAULT),
  /** Match points this side scored. */
  points: z.number().int().nonnegative("Points cannot be negative"),
});

export const Match = z
  .object({
    id: z.string().uuid(),
    teamId: z.string().uuid(),
    /**
     * ISO-8601 UTC instant, e.g. 2026-08-16T14:30:00.000Z. A string rather than a
     * timestamp so the row survives the JSON round-trip unchanged; the format
     * sorts lexically, so ordering by it is still ordering by time.
     */
    playedAt: z.string().datetime(),
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
