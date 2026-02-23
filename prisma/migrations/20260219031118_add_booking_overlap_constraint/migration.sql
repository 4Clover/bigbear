CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD CONSTRAINT "booking_no_date_overlap"
  EXCLUDE USING gist (
    numrange(
      EXTRACT(EPOCH FROM "checkIn"),
      EXTRACT(EPOCH FROM "checkOut"),
      '[)'
    ) WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'PENDING'));
