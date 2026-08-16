-- Recorded matches: who played on each side and how many points they scored.
--
-- A side is `player_1` plus a nullable `player_2`, so singles is "both player_2
-- are null". Columns rather than a JSON blob, which buys two things: the player
-- ids are indexable, so "every match this person played" is a plain query; and
-- the database can enforce the same three rules the Zod schema does, which a
-- JSONB column could never do.
--
-- There is deliberately no foreign key on a player. An id names either a member
-- or a guest, and a Postgres reference points at exactly one table, so a
-- polymorphic reference cannot be constrained without splitting every slot in
-- two or introducing a shared people table. Player deletes are refused in
-- application code instead (countMatchReferences), exactly as they already are
-- for transfers, whose from_id/to_id have the same problem.
--
-- played_at is TEXT holding an ISO-8601 UTC instant rather than a timestamp, so
-- the row round-trips through JSON unchanged. ORDER BY played_at is chronological
-- only because the Zod schema pins the format to exactly three fractional digits:
-- '…:00Z' and '…:00.5Z' would sort against '…:00.500Z' in the wrong order.

CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "played_at" TEXT NOT NULL,
    "side_a_player_1" TEXT NOT NULL,
    "side_a_player_2" TEXT,
    "side_a_points" INTEGER NOT NULL,
    "side_b_player_1" TEXT NOT NULL,
    "side_b_player_2" TEXT,
    "side_b_points" INTEGER NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "matches_team_id_idx" ON "matches"("team_id");
CREATE INDEX "matches_played_at_idx" ON "matches"("played_at");
CREATE INDEX "matches_side_a_player_1_idx" ON "matches"("side_a_player_1");
CREATE INDEX "matches_side_a_player_2_idx" ON "matches"("side_a_player_2");
CREATE INDEX "matches_side_b_player_1_idx" ON "matches"("side_b_player_1");
CREATE INDEX "matches_side_b_player_2_idx" ON "matches"("side_b_player_2");

ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The Zod rules, restated where the data actually lives. Prisma does not model
-- CHECK constraints, so these are invisible to the schema and never generated —
-- which is exactly why they are written out here.

-- Both sides carry the same number of players: singles against doubles is not a
-- match anyone played.
ALTER TABLE "matches" ADD CONSTRAINT "matches_sides_same_size"
  CHECK (("side_a_player_2" IS NULL) = ("side_b_player_2" IS NULL));

-- A match has a winner.
ALTER TABLE "matches" ADD CONSTRAINT "matches_no_draw"
  CHECK ("side_a_points" <> "side_b_points");

ALTER TABLE "matches" ADD CONSTRAINT "matches_points_not_negative"
  CHECK ("side_a_points" >= 0 AND "side_b_points" >= 0);

-- Nobody plays twice in one match. NULL-safe by CHECK semantics: comparing
-- against an absent player_2 yields NULL, and a CHECK only fails on FALSE, so
-- singles rows pass untouched.
ALTER TABLE "matches" ADD CONSTRAINT "matches_distinct_players"
  CHECK (
        "side_a_player_1" <> "side_a_player_2"
    AND "side_a_player_1" <> "side_b_player_1"
    AND "side_a_player_1" <> "side_b_player_2"
    AND "side_a_player_2" <> "side_b_player_1"
    AND "side_a_player_2" <> "side_b_player_2"
    AND "side_b_player_1" <> "side_b_player_2"
  );
