import { describe, expect, it } from "vitest";
import { Match, Side, matchPlayerIds, matchWinner } from "../src";
import type { MatchT } from "../src";

const TEAM = "00000000-0000-4000-8000-000000000001";
const ADA = "00000000-0000-4000-8000-0000000000a1";
const BO = "00000000-0000-4000-8000-0000000000b2";
const CY = "00000000-0000-4000-8000-0000000000c3";
const DEE = "00000000-0000-4000-8000-0000000000d4";

/** A valid doubles result, with the one field each case is about swapped out. */
const doubles = (overrides: Partial<MatchT> = {}): MatchT => ({
  id: "00000000-0000-4000-8000-00000000f001",
  teamId: TEAM,
  playedAt: "2026-08-16T14:30:00.000Z",
  sideA: { playerIds: [ADA, BO], points: 21 },
  sideB: { playerIds: [CY, DEE], points: 18 },
  ...overrides,
});

describe("Match", () => {
  it("accepts a four-player result", () => {
    const parsed = Match.parse(doubles());
    expect(matchWinner(parsed)).toBe(Side.A);
    expect(matchPlayerIds(parsed)).toEqual([ADA, BO, CY, DEE]);
  });

  it("accepts a singles result", () => {
    const parsed = Match.parse(
      doubles({ sideA: { playerIds: [ADA], points: 11 }, sideB: { playerIds: [BO], points: 15 } }),
    );
    expect(matchWinner(parsed)).toBe(Side.B);
  });

  it("rejects a draw", () => {
    const result = Match.safeParse(doubles({ sideB: { playerIds: [CY, DEE], points: 21 } }));
    expect(result.success).toBe(false);
  });

  it("rejects the same person on both sides", () => {
    const result = Match.safeParse(doubles({ sideB: { playerIds: [ADA, DEE], points: 18 } }));
    expect(result.success).toBe(false);
  });

  it("rejects sides of different sizes", () => {
    const result = Match.safeParse(doubles({ sideB: { playerIds: [CY], points: 18 } }));
    expect(result.success).toBe(false);
  });

  it("rejects more than two players a side", () => {
    const result = Match.safeParse(doubles({ sideA: { playerIds: [ADA, BO, CY], points: 21 } }));
    expect(result.success).toBe(false);
  });

  it("rejects a playedAt that is not an instant", () => {
    const result = Match.safeParse(doubles({ playedAt: "2026-08-16" }));
    expect(result.success).toBe(false);
  });

  it("rejects the same person written in a different case", () => {
    // Both spellings pass z.string().uuid(), so without normalising, one player
    // fills two slots and every id comparison in the app misses one of them.
    const result = Match.safeParse(doubles({ sideB: { playerIds: [ADA.toUpperCase(), DEE], points: 18 } }));
    expect(result.success).toBe(false);
  });

  it("lowercases every id, so one person is one string", () => {
    const parsed = Match.parse(
      doubles({ sideA: { playerIds: [ADA.toUpperCase(), BO], points: 21 } }),
    );
    expect(parsed.sideA.playerIds).toEqual([ADA, BO]);
  });

  it("pins playedAt to a precision that sorts chronologically", () => {
    // '…00Z' sorts after '…00.500Z' but is earlier in time, so ordering rows by
    // the raw string is only safe while every row has the same shape.
    for (const loose of ["2026-08-16T14:30:00Z", "2026-08-16T14:30:00.5Z", "2026-08-16T14:30:00.123456789Z"]) {
      expect(Match.safeParse(doubles({ playedAt: loose })).success).toBe(false);
    }
    expect(Match.safeParse(doubles({ playedAt: "2026-08-16T14:30:00.000Z" })).success).toBe(true);
  });

  it("rejects a score that would overflow the points column", () => {
    const huge = doubles({ sideA: { playerIds: [ADA, BO], points: 3_000_000_000 } });
    expect(Match.safeParse(huge).success).toBe(false);
  });
});
