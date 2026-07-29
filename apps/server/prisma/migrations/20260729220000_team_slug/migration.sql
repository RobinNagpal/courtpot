-- Optional URL handle for the public team page, so it can be shared as
-- /t/sher-e-smash instead of /t/<uuid>.
--
-- Nullable, so no backfill is needed and existing teams keep working by id.
-- Unique, so two teams cannot claim the same URL — Postgres treats NULLs as
-- distinct, so any number of teams may have no slug.

ALTER TABLE "teams" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");
