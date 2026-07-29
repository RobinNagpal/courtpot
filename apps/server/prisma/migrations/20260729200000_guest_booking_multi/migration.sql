-- A guest booking can now charge several guests, each their own amount, and be
-- fronted by several members.
--
--   guest_id TEXT + amount INT  ->  guests JSONB  [{ guestId, amount }]
--   paid_by  TEXT               ->  paid_by JSONB  ["<member id>", ...] | "ALL"
--
-- Hand-written. This is the only migration so far that drops a column, so the
-- backfill runs first and the drop happens last: every existing (guest_id,
-- amount) pair is folded into a one-element guests array, and a single paid_by
-- member becomes a one-element array. The "ALL" sentinel is preserved as a JSON
-- string rather than an array, exactly as the Zod union expects.

-- 1. New column, nullable while it is populated.
ALTER TABLE "guest_bookings" ADD COLUMN "guests" JSONB;

-- 2. Fold the existing single guest and amount into it.
UPDATE "guest_bookings"
   SET "guests" = jsonb_build_array(
         jsonb_build_object('guestId', "guest_id", 'amount', "amount")
       )
 WHERE "guests" IS NULL;

-- 3. Nothing may be left unpopulated.
ALTER TABLE "guest_bookings" ALTER COLUMN "guests" SET NOT NULL;

-- 4. Widen paid_by in place: 'ALL' becomes the JSON string "ALL", a member id
--    becomes a one-element array.
ALTER TABLE "guest_bookings"
  ALTER COLUMN "paid_by" TYPE JSONB
  USING (
    CASE WHEN "paid_by" = 'ALL' THEN '"ALL"'::jsonb ELSE jsonb_build_array("paid_by") END
  );

-- 5. Only now that everything is copied, drop the old columns.
ALTER TABLE "guest_bookings" DROP COLUMN "guest_id";
ALTER TABLE "guest_bookings" DROP COLUMN "amount";
