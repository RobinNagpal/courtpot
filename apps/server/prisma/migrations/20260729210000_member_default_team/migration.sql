-- The team a member lands on at login.
--
-- Nullable, so no backfill is needed: a member with no default falls back to
-- their only team, or to the picker when they are on several. ON DELETE SET NULL
-- means deleting a team clears the preference rather than blocking the delete.

ALTER TABLE "members" ADD COLUMN "default_team_id" TEXT;

CREATE INDEX "members_default_team_id_idx" ON "members"("default_team_id");

ALTER TABLE "members" ADD CONSTRAINT "members_default_team_id_fkey"
  FOREIGN KEY ("default_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
