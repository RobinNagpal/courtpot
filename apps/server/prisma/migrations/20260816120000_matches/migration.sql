-- Recorded matches: who played on each side and how many points they scored.
--
-- A new table with no backfill, so this is what `prisma migrate dev` would have
-- generated. It is written by hand only to keep the constraint and index names
-- Prisma expects ("matches_pkey", "matches_team_id_fkey", "matches_team_id_idx").
--
-- played_at is TEXT holding an ISO-8601 UTC instant rather than a timestamp: the
-- row round-trips through JSON unchanged, and the format sorts lexically, so
-- ORDER BY played_at is still chronological.

CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "played_at" TEXT NOT NULL,
    "side_a" JSONB NOT NULL,
    "side_b" JSONB NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "matches_team_id_idx" ON "matches"("team_id");

ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
