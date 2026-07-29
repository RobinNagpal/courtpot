-- Scope the ledger to teams: guests, member bookings, guest bookings and
-- transfers all belong to exactly one team.
--
-- Hand-written, because the generated version is a bare
--   ALTER TABLE "guests" ADD COLUMN "team_id" TEXT NOT NULL;
-- which fails on any database that already holds rows. The pattern for adding a
-- required foreign key to a populated table is four steps per table:
--
--   1. add the column nullable
--   2. backfill it
--   3. tighten it to NOT NULL
--   4. add the foreign key and index
--
-- Everything that exists today predates teams, so it all lands in the default
-- team. That team is created here if it is missing, so this migration works on
-- an empty database too.

-- 1. Make sure the default team exists, so the backfill always has a target.
INSERT INTO "teams" ("id", "name", "pin")
SELECT gen_random_uuid(), 'Sher-e-Smash', lpad((floor(random() * 10000))::int::text, 4, '0')
 WHERE NOT EXISTS (SELECT 1 FROM "teams" WHERE "name" = 'Sher-e-Smash');

-- 2. Add the columns nullable.
ALTER TABLE "guests" ADD COLUMN "team_id" TEXT;
ALTER TABLE "member_bookings" ADD COLUMN "team_id" TEXT;
ALTER TABLE "guest_bookings" ADD COLUMN "team_id" TEXT;
ALTER TABLE "transfers" ADD COLUMN "team_id" TEXT;

-- 3. Backfill every existing row to the default team.
UPDATE "guests"          SET "team_id" = (SELECT "id" FROM "teams" WHERE "name" = 'Sher-e-Smash') WHERE "team_id" IS NULL;
UPDATE "member_bookings" SET "team_id" = (SELECT "id" FROM "teams" WHERE "name" = 'Sher-e-Smash') WHERE "team_id" IS NULL;
UPDATE "guest_bookings"  SET "team_id" = (SELECT "id" FROM "teams" WHERE "name" = 'Sher-e-Smash') WHERE "team_id" IS NULL;
UPDATE "transfers"       SET "team_id" = (SELECT "id" FROM "teams" WHERE "name" = 'Sher-e-Smash') WHERE "team_id" IS NULL;

-- 4. Tighten to NOT NULL now that nothing is null.
ALTER TABLE "guests"          ALTER COLUMN "team_id" SET NOT NULL;
ALTER TABLE "member_bookings" ALTER COLUMN "team_id" SET NOT NULL;
ALTER TABLE "guest_bookings"  ALTER COLUMN "team_id" SET NOT NULL;
ALTER TABLE "transfers"       ALTER COLUMN "team_id" SET NOT NULL;

-- 5. Indexes and foreign keys.
CREATE INDEX "guests_team_id_idx" ON "guests"("team_id");
CREATE INDEX "member_bookings_team_id_idx" ON "member_bookings"("team_id");
CREATE INDEX "guest_bookings_team_id_idx" ON "guest_bookings"("team_id");
CREATE INDEX "transfers_team_id_idx" ON "transfers"("team_id");

ALTER TABLE "guests" ADD CONSTRAINT "guests_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_bookings" ADD CONSTRAINT "member_bookings_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guest_bookings" ADD CONSTRAINT "guest_bookings_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
