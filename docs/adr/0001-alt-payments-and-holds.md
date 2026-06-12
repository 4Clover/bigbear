---
status: accepted
---

# Off-platform payments with timed Holds

Stripe checkout was disabled because Stripe's processing fees were a meaningful chunk of margin for a single-cabin rental. Instead, guests pick a **Payment method** (Venmo, Cash App, PayPal, Zelle, or Contact-Owner) on the booking modal, which creates a 24-hour **Hold** (`Booking.status = PENDING`) reserving the dates. The owner manually verifies that funds arrived in the off-platform account, then flips the Hold to `CONFIRMED` via the existing approval action. Unverified Holds are cancelled by an hourly cron sweep (with belt-and-suspenders sweep-on-booking-attempt inside a `$transaction`).

## Consequences

- The PostgreSQL exclusion constraint must be widened from `status NOT IN (CANCELLED, PENDING)` to also block live PENDINGs — otherwise three guests could each Hold the same week. Stale PENDINGs are reaped by the sweep.
- Booking gains `paymentMethod`, `holdExpiresAt`, `paymentClaimedAt` fields. `paymentMethod` enum: `STRIPE | VENMO | CASHAPP | PAYPAL | ZELLE | CONTACT_OWNER`. Legacy rows have `paymentMethod = STRIPE` (only one that ever existed).
- No automatic reconciliation — owner watches their Venmo etc. and clicks "approve" when money lands. Acceptable for single-cabin volume; would not scale to multiple properties.
- Stripe code (`/api/stripe/checkout`, webhook, refunds in `cancelBooking`) is left in place but unreferenced from the frontend. Refund logic stays gated on `paymentIntentId !== null` so legacy bookings still work.
- Partial payments are not supported. Approve = full `totalAmount` received.
