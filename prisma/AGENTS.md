# DATA MODEL

20 Prisma models, 5 enums, 437 lines. Single-cabin rental with booking, finance, maintenance, and gallery domains.

## STRUCTURE

| Model Group    | Models                                   | Key Relationships                                |
| -------------- | ---------------------------------------- | ------------------------------------------------ |
| Auth (Auth.js) | Account, Session, VerificationToken      | Account/Session cascade on User delete           |
| Users          | User, WorkerProfile                      | WorkerProfile 1:1 optional (WORKER role only)    |
| Booking        | Booking, BookingAddon, Addon             | BookingAddon is M:N junction; cascades on delete |
| Calendar       | BlockedDate, CalendarSync, PricingConfig | PricingConfig is singleton (id="default")        |
| Finance        | Transaction, ExpenseCategory, Receipt    | Receipt cascades on Transaction delete           |
| Maintenance    | MaintenanceJob, Quote, WorkCompletion    | Quote/WorkCompletion cascade on Job delete       |
| Messaging      | Message                                  | Scoped to Booking (optional FK)                  |
| Notifications  | NotificationPreference, NotificationLog  | Preference unique per event; Log is audit trail  |
| Gallery        | GalleryImage                             | Standalone, sorted by category + sortOrder       |

## ENUMS

- **UserRole**: OWNER, GUEST, WORKER, ACCOUNTANT
- **BookingStatus**: PENDING → CONFIRMED → COMPLETED (or CANCELLED, NO_SHOW)
- **JobStatus**: OPEN → QUOTED → ASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED → APPROVED → PAID (or CANCELLED)
- **JobPriority**: LOW, MEDIUM, HIGH, URGENT
- **TransactionType**: INCOME, EXPENSE

## DECIMAL FIELDS

Prisma client extension in `src/lib/prisma.ts` auto-converts all Decimal→number transparently.

| Model                | Decimal Fields                                                   |
| -------------------- | ---------------------------------------------------------------- |
| Booking              | basePrice, addonsTotal, depositAmount, totalAmount               |
| Addon / BookingAddon | price                                                            |
| PricingConfig        | baseNightlyRate, weekendRate, cleaningFee, petFee, extraGuestFee |
| Transaction          | amount                                                           |
| Quote                | amount                                                           |
| WorkCompletion       | hoursWorked, finalAmount                                         |

## CASCADE RULES

| When Deleted   | Also Deleted                       | Notes                                  |
| -------------- | ---------------------------------- | -------------------------------------- |
| User           | Account, Session, WorkerProfile    | Auth cleanup + worker profile          |
| Booking        | BookingAddon, Transaction, Message | Full booking cleanup                   |
| MaintenanceJob | Quote, WorkCompletion              | Job cleanup                            |
| Transaction    | Receipt                            | Receipt files orphaned in Blob storage |

**Not cascaded**: Booking→User (guest preserved), Transaction→Booking (audit trail preserved).

## SEED DATA (`pnpm db:seed`)

- 19 ExpenseCategories with Schedule E line mappings (all tax-deductible except "Rental Income")
- PricingConfig: $150/night, $175 weekend, $75 cleaning, 20% deposit, 2-14 nights, max 8 guests
- 5 Addons: Early Check-In ($50), Late Checkout ($50), Pet Fee ($75), Hot Tub ($35), Firewood ($25)
- 10 NotificationPreferences: all email=true, SMS=false
- Admin users from `ADMIN_EMAILS` env var (role=OWNER)

## ANTI-PATTERNS

- **NEVER** send raw Prisma Decimal to client — extension handles it, but verify in raw `$queryRaw` calls
- **NEVER** assume JobStatus auto-transitions — each state change must be explicit in server actions
- **NEVER** trust client-submitted prices — always recompute from PricingConfig + Addons in server action

## NOTES

- `PricingConfig` is singleton (id="default") — query with `findFirst()` not `findUnique(id)`
- `BlockedDate.externalId` ensures idempotent calendar sync (unique constraint prevents duplicates)
- `WorkerProfile.services` is free-form `String[]` — no enum validation, standardize in application code
- `NotificationPreference.event` has unique constraint — one preference per event type (global, not per-user)
- Booking prices (basePrice, addonsTotal, totalAmount) are stored but NOT auto-calculated — compute in server action
- `Quote.isApproved` and `WorkCompletion.isApproved` are separate flags from `JobStatus` — don't confuse
- Seed script supports dual-database (Neon + local PG) — detects via connection string
