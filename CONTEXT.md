# Grizzly Getaway

Short-term rental management for a single cabin (Big Bear). Handles guest booking, owner administration, worker maintenance jobs, finance/tax tracking, and family/guest reviews.

## Language

### Booking & payment

**Booking**:
A reservation for the cabin covering a contiguous `[checkIn, checkOut)` date range, owned by exactly one guest **User**. Always in one **BookingStatus** (`PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW`).

**Hold**:
A `PENDING` **Booking** that temporarily reserves dates against other guests while the chosen payment method is settled. Distinct from a `CONFIRMED` **Booking** in that no payment is yet verified, and the **Hold** has a finite lifetime after which the cron sweep cancels it.
_Avoid_: Reservation, lock, intent.

**Payment method**:
The channel a guest chose to pay through. One of `STRIPE | VENMO | CASHAPP | PAYPAL | ZELLE | CONTACT_OWNER`. Stored on the **Booking**. `STRIPE` is currently disabled; the route still exists but no frontend path invokes it.
_Avoid_: Payment provider, payment type.

**Alt-payment Booking**:
Any **Booking** with a **Payment method** other than `STRIPE`. Verification is manual: the owner confirms funds arrived in the off-platform account, then transitions the **Booking** from `PENDING` → `CONFIRMED`.
_Avoid_: Off-platform booking, manual booking.

**Contact-owner inquiry**:
The "I have questions before I pay" path on the payment modal. Also a **Payment method** (`CONTACT_OWNER`) — selecting it creates a 24h **Hold**, persists the guest's message as a **Message** attached to the **Booking**, and emails the owner. If the conversation results in payment, the owner confirms; otherwise the **Hold** expires like any other.

**Payment claim**:
The guest's assertion that they sent funds, recorded as `Booking.paymentClaimedAt`. Triggered by the guest clicking the magic link in their confirmation email. Surfaces a badge in the owner's BookingTable. Does _not_ transition status; only **Owner verification** does. A claimed **Hold** is exempt from the expire-holds cron — the owner resolves it manually.

**Owner verification**:
The owner's confirmation that funds arrived in the off-platform account, performed via the existing `approveBookingRequest` action. Always means full `totalAmount` received — partial payments are not modelled.

### Roles & access

**Family member**:
A `User` with `isFamilyMember = true`. Granted by the owner. Family members book through `/api/booking/family`, which auto-confirms a `$0` **Booking** without going through the payment modal. **Family invite tokens** are valid as long as the user's `isFamilyMember` flag is `true`; revocation is by clearing that flag, not by token expiry.

**Family invite token**:
A long-lived JWT emailed to a family member containing their email + name. Stateless on creation but gated by current DB state on every use: the family booking route checks the live `User.isFamilyMember` value before honoring the token. Removing the family flag immediately invalidates all outstanding tokens for that user.

**Guest**:
A `User` with `role = GUEST`. Default for anyone who books or signs in via email link. Not a **Family member** unless explicitly invited.

### Reviews

**Review**:
A guest's rating + text + optional photos for a completed **Booking**. One **Review** per **Booking** (unique constraint). Created by the guest via a 14-day JWT (the **Review invite token**), updated by re-submitting through the same token. `isPublished = false` by default; the owner toggles publication.

**Review invite cadence**:
Initial email is part of the day-of-checkout email (**Checkout-day email**). If no **Review** has been submitted, the system retries at +1d, +2d, +4d. After three retries, the system stops. Tracked on `Booking.reviewInviteAttempts` and `Booking.reviewInviteLastAttemptAt`.

**Checkout-day email**:
A new email sent on the actual checkout date (distinct from the existing day-before `GUEST_CHECKOUT_REMINDER`). Bundles wrap-up info (lock code, lost-and-found contact, etc.) and the first **Review** invite link. Send is tracked via `Booking.checkoutEmailSentAt`.

**Owner moderation**:
The owner can publish/unpublish a **Review** and remove individual photos (which also deletes the underlying blob). The owner cannot edit the body or rating — published reviews are always the guest's original words.

## Relationships

- A **User** has many **Bookings**
- A **Booking** has exactly one **Payment method**
- A **Hold** is a **Booking** in `PENDING` status; it reserves dates against other holds via the PostgreSQL exclusion constraint on `Booking(checkIn, checkOut)`
- **Family member** **Bookings** are always `CONFIRMED` and `$0` — they are not **Holds**, but they DO obey the same availability check (they cannot be created over an active **Hold** or another **Booking**)
- A **Booking** has at most one **Review** (`Review.bookingId` unique)
- The **Review invite cadence** schedules up to 4 sends (day-of + 3 retries) per **Booking**

## Example dialogue

> **Dev:** "If a guest picks Venmo and never sends the money, what happens to the dates?"
> **Domain expert:** "The **Hold** lives for the configured window. The cron job cancels it after that, and the dates open back up. The guest can re-book if they want."
> **Dev:** "Can two guests put a **Hold** on the same week at the same time?"
> **Domain expert:** "No. First to pick a **Payment method** wins. The second guest sees the dates as unavailable until the first **Hold** expires or is cancelled."

## Flagged ambiguities

- **Stripe** status: the codebase comments call it "currently disabled" but keeps the route. Long-term policy (delete, re-enable as an option alongside alt payments, or keep as a future toggle) is unresolved.
