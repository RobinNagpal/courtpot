-- Give every team a 4-digit PIN that opens its team page.
--
-- Hand-written. The generated version is a bare
--   ALTER TABLE "teams" ADD COLUMN "pin" TEXT NOT NULL;
-- which fails on any database that already has a team row, because there is no
-- default to fill it with. Add the column nullable, backfill a random PIN per
-- team, then tighten to NOT NULL — ending in exactly the shape the Prisma
-- schema declares (NOT NULL, no default).

ALTER TABLE "teams" ADD COLUMN "pin" TEXT;

UPDATE "teams"
   SET "pin" = lpad((floor(random() * 10000))::int::text, 4, '0')
 WHERE "pin" IS NULL;

ALTER TABLE "teams" ALTER COLUMN "pin" SET NOT NULL;
