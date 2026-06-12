-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'VENMO', 'CASHAPP', 'PAYPAL', 'ZELLE', 'CONTACT_OWNER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'HOLD_CREATED';
ALTER TYPE "NotificationEvent" ADD VALUE 'FAMILY_BOOKING_CREATED';
ALTER TYPE "NotificationEvent" ADD VALUE 'GUEST_CHECKOUT_THANKS';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "checkoutEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentClaimedAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "reviewInviteAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewInviteLastAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_status_holdExpiresAt_idx" ON "Booking"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "Review_isPublished_createdAt_idx" ON "Review"("isPublished", "createdAt");

-- Widen the overlap constraint: live PENDING Holds now block double-booking
-- (docs/adr/0001-alt-payments-and-holds.md). Pre-cancel rows that would violate it.

-- (a) PENDING holds overlapping a confirmed/completed/no-show booking
UPDATE "Booking" p
SET "status" = 'CANCELLED',
    "notes" = COALESCE(p."notes" || E'\n', '') || 'Auto-cancelled: overlapped a confirmed booking when the hold constraint was widened'
WHERE p."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "Booking" b
    WHERE b."id" <> p."id"
      AND b."status" IN ('CONFIRMED', 'COMPLETED', 'NO_SHOW')
      AND b."checkIn" < p."checkOut"
      AND b."checkOut" > p."checkIn"
  );

-- (b) among mutually overlapping PENDING holds, keep only the earliest-created
UPDATE "Booking" p
SET "status" = 'CANCELLED',
    "notes" = COALESCE(p."notes" || E'\n', '') || 'Auto-cancelled: superseded by an earlier hold when the hold constraint was widened'
WHERE p."status" = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "Booking" b
    WHERE b."id" <> p."id"
      AND b."status" = 'PENDING'
      AND b."checkIn" < p."checkOut"
      AND b."checkOut" > p."checkIn"
      AND (b."createdAt" < p."createdAt" OR (b."createdAt" = p."createdAt" AND b."id" < p."id"))
  );

ALTER TABLE "Booking" DROP CONSTRAINT "booking_no_date_overlap";

ALTER TABLE "Booking" ADD CONSTRAINT "booking_no_date_overlap"
  EXCLUDE USING gist (
    numrange(
      EXTRACT(EPOCH FROM "checkIn"),
      EXTRACT(EPOCH FROM "checkOut"),
      '[)'
    ) WITH &&
  )
  WHERE ("status" != 'CANCELLED');
