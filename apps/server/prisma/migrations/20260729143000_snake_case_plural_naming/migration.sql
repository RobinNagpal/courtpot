-- Rename every table to plural snake_case and every column to snake_case, so
-- Postgres never needs quoted identifiers.
--
-- Written by hand with RENAME rather than generated. `prisma migrate dev`
-- cannot tell a rename from a drop-and-recreate, so the generated version of
-- this migration would DROP each table and CREATE the new one, destroying every
-- row. RENAME preserves the data.

-- Tables
ALTER TABLE "Member" RENAME TO "members";
ALTER TABLE "Guest" RENAME TO "guests";
ALTER TABLE "MemberBooking" RENAME TO "member_bookings";
ALTER TABLE "GuestBooking" RENAME TO "guest_bookings";
ALTER TABLE "Transfer" RENAME TO "transfers";
ALTER TABLE "AuthSession" RENAME TO "auth_sessions";

-- Columns (only the camelCase ones; id/name/date/title/amount/note/pin/active
-- /payers/token are already single lowercase words)
ALTER TABLE "member_bookings" RENAME COLUMN "memberIds" TO "member_ids";
ALTER TABLE "guest_bookings" RENAME COLUMN "guestId" TO "guest_id";
ALTER TABLE "guest_bookings" RENAME COLUMN "paidBy" TO "paid_by";
ALTER TABLE "transfers" RENAME COLUMN "fromId" TO "from_id";
ALTER TABLE "transfers" RENAME COLUMN "toId" TO "to_id";
ALTER TABLE "auth_sessions" RENAME COLUMN "memberId" TO "member_id";
ALTER TABLE "auth_sessions" RENAME COLUMN "createdAt" TO "created_at";

-- Primary key constraints. Renaming a table does not rename its constraints or
-- indexes, and Prisma derives the expected names from the mapped table name.
ALTER TABLE "members" RENAME CONSTRAINT "Member_pkey" TO "members_pkey";
ALTER TABLE "guests" RENAME CONSTRAINT "Guest_pkey" TO "guests_pkey";
ALTER TABLE "member_bookings" RENAME CONSTRAINT "MemberBooking_pkey" TO "member_bookings_pkey";
ALTER TABLE "guest_bookings" RENAME CONSTRAINT "GuestBooking_pkey" TO "guest_bookings_pkey";
ALTER TABLE "transfers" RENAME CONSTRAINT "Transfer_pkey" TO "transfers_pkey";
ALTER TABLE "auth_sessions" RENAME CONSTRAINT "AuthSession_pkey" TO "auth_sessions_pkey";

-- Foreign key constraint
ALTER TABLE "auth_sessions" RENAME CONSTRAINT "AuthSession_memberId_fkey" TO "auth_sessions_member_id_fkey";

-- Unique indexes
ALTER INDEX "Member_name_key" RENAME TO "members_name_key";
ALTER INDEX "Member_username_key" RENAME TO "members_username_key";
ALTER INDEX "Guest_name_key" RENAME TO "guests_name_key";
