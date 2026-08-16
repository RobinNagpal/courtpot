import { describe, expect, it } from "vitest";
import type { MatchT } from "@courtpot/schemas";
import { computePairRankings, pairKey } from "../src";

const TEAM = "team-1";

let sequence = 0;
/** sideA wins unless `winner` says otherwise, so each case reads as a result. */
const match = (sideA: string[], sideB: string[], winner: "A" | "B" = "A"): MatchT => {
  sequence += 1;
  return {
    id: `match-${sequence}`,
    teamId: TEAM,
    playedAt: `2026-08-${String(sequence).padStart(2, "0")}T10:00:00.000Z`,
    sideA: { playerIds: sideA, points: winner === "A" ? 21 : 15 },
    sideB: { playerIds: sideB, points: winner === "B" ? 21 : 15 },
  };
};

const ADA = "ada";
const BO = "bo";
const CY = "cy";
const DEE = "dee";

describe("pairKey", () => {
  it("is the same whichever order the pair was entered", () => {
    expect(pairKey([ADA, BO])).toBe(pairKey([BO, ADA]));
  });
});

describe("computePairRankings", () => {
  it("tallies wins and losses for both sides", () => {
    const rankings = computePairRankings([match([ADA, BO], [CY, DEE])]);
    expect(rankings).toHaveLength(2);
    expect(rankings[0]).toMatchObject({ playerIds: [ADA, BO], played: 1, won: 1, lost: 0, winRate: 1 });
    expect(rankings[1]).toMatchObject({ playerIds: [CY, DEE], played: 1, won: 0, lost: 1, winRate: 0 });
  });

  it("treats a pair as the same pair however the slots were filled", () => {
    const rankings = computePairRankings([
      match([ADA, BO], [CY, DEE]),
      // Same two people, entered the other way round and on the other side.
      match([CY, DEE], [BO, ADA], "B"),
    ]);
    const adaBo = rankings.find((pair) => pair.key === pairKey([ADA, BO]));
    expect(adaBo).toMatchObject({ played: 2, won: 2, lost: 0 });
  });

  it("skips singles, which are not partnerships", () => {
    expect(computePairRankings([match([ADA], [BO])])).toEqual([]);
  });

  it("ranks the pair with more wins first", () => {
    // Five meetings: Cy & Dee take two, Ada & Bo take three.
    const rankings = computePairRankings([
      match([CY, DEE], [ADA, BO]),
      match([CY, DEE], [ADA, BO]),
      match([ADA, BO], [CY, DEE]),
      match([ADA, BO], [CY, DEE]),
      match([ADA, BO], [CY, DEE]),
    ]);
    expect(rankings.map((pair) => pair.playerIds)).toEqual([
      [ADA, BO],
      [CY, DEE],
    ]);
    expect(rankings[0]).toMatchObject({ won: 3, lost: 2 });
    expect(rankings[1]).toMatchObject({ won: 2, lost: 3 });
  });

  it("breaks a tie on wins with the better win rate", () => {
    // Both pairs win once, but Ada & Bo lost on the way there.
    const rankings = computePairRankings([
      match([ADA, BO], [CY, DEE]),
      match([CY, DEE], [ADA, BO]),
      match([DEE, ADA], [BO, CY]),
    ]);
    expect(rankings[0]).toMatchObject({ playerIds: [ADA, DEE], won: 1, played: 1 });
    expect(rankings.find((pair) => pair.key === pairKey([ADA, BO]))).toMatchObject({ won: 1, played: 2 });
  });

  it("has nothing to rank without matches", () => {
    expect(computePairRankings([])).toEqual([]);
  });
});
