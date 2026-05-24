<!-- Generated: 2026-03-28 | Files scanned: 14 | Token estimate: ~1100 -->

# Backend Codemap — Server Actions & API Routes

## Server Actions (src/actions/)

Primary data mutation layer. All are `'use server'` with guards.

| File               | Functions                                                 | Domain        | Auth             | Validation |
| ------------------ | --------------------------------------------------------- | ------------- | ---------------- | ---------- |
| `bookings.ts`      | cancelBooking, approveBookingRequest, createPaymentIntent | Bookings      | OWNER            | Custom     |
| `calendar.ts`      | syncGoogleCalendar, blockDates, unblockDates              | Calendar      | OWNER            | Zod        |
| `finance.ts`       | createTransaction, deleteTransaction, createCategory      | Finance       | OWNER/ACCOUNTANT | Zod        |
| `maintenance.ts`   | createJob, assignWorker, completeWork, submitQuote        | Maintenance   | OWNER/WORKER     | Zod        |
| `gallery.ts`       | uploadImages, deleteImage, reorderGallery                 | Gallery       | OWNER/GUEST      | Zod        |
| `reviews.ts`       | submitReview, publishReview, deleteReview                 | Reviews       | GUEST            | Zod        |
| `family.ts`        | inviteFamily, acceptInvite, removeFamilyMember            | Family        | OWNER            | Zod        |
| `notifications.ts` | updatePreferences, sendTestNotification                   | Notifications | OWNER            | Zod        |
| `reports.ts`       | generateTaxReport, generateBookingReport                  | Reports       | OWNER/ACCOUNTANT | Zod        |

**Pattern: Secure Action Wrapper**

```typescript
'use server'
export const deleteImage = secureAction(
  { roles: 'OWNER', schema: z.object({ id: z.string() }) },
  async ({ session, data }) => {
    // data is already validated
    // session contains user info
  }
)
```

## API Routes (src/app/api/)

RESTful endpoints using route wrappers (`src/lib/api/route-gates.ts`).

### Authentication Routes

| Path                 | Handler           | Purpose                   |
| -------------------- | ----------------- | ------------------------- |
| `auth/[...nextauth]` | NextAuth handlers | signIn, signOut, callback |

### Protected Routes (authenticatedRoute)

| Path               | Role(s)          | Verb     | Purpose                           |
| ------------------ | ---------------- | -------- | --------------------------------- |
| `availability`     | OWNER            | GET      | List blocked dates + availability |
| `pricing`          | OWNER            | GET/POST | Pricing configuration             |
| `addons`           | OWNER            | GET      | List active add-ons               |
| `reports/tax`      | OWNER/ACCOUNTANT | GET      | Tax report generation             |
| `reports/bookings` | OWNER            | GET      | Booking report export             |

### Public Routes (publicRoute)

| Path           | Rate Limit | Verb | Purpose                          |
| -------------- | ---------- | ---- | -------------------------------- |
| `contact`      | 5/min      | POST | Contact form submission          |
| `booking`      | 10/min     | POST | Create booking request           |
| `availability` | 20/min     | GET  | Check availability (public view) |

### Token-Validated Routes

| Path             | Verb | Token Type    | Purpose                     |
| ---------------- | ---- | ------------- | --------------------------- |
| `gallery/upload` | POST | Gallery Token | Guest photo upload          |
| `reviews`        | POST | Review Token  | Guest review submission     |
| `family/accept`  | POST | Family Token  | Family member invite accept |

### Webhook Routes

| Path             | Verification     | Verb | Purpose                  |
| ---------------- | ---------------- | ---- | ------------------------ |
| `stripe/webhook` | Stripe signature | POST | Payment event processing |

### Cron Routes (cronRoute)

Verified with `CRON_SECRET` Bearer token.

| Path                 | Verb | Purpose                           | Frequency |
| -------------------- | ---- | --------------------------------- | --------- |
| `cron/reminders`     | GET  | Send check-in/check-out reminders | Daily     |
| `cron/calendar-sync` | GET  | Sync external calendars (iCal)    | Hourly    |

## Route Gate Wrappers

**Location**: `src/lib/api/route-gates.ts`

```typescript
// Protected route with role check
export const GET = authenticatedRoute(['OWNER'], async (req, session) => {
  const data = await fetch(...)
  return NextResponse.json(data)
})

// Public route with rate limiting
export const POST = publicRoute('contact', { limit: 5, windowSeconds: 60 }, async (req) => {
  const body = await req.json()
  return NextResponse.json({ success: true })
})

// Cron job with secret validation
export const GET = cronRoute(async (req) => {
  await processReminders()
  return NextResponse.json({ processed: true })
})
```

## Request/Response Patterns

**Success Response**:

```json
{ "success": true, "data": { ... } }
```

**Error Response**:

```json
{ "success": false, "error": "Description" }
```

**List Response**:

```json
{ "success": true, "data": [...], "meta": { "total": 100, "page": 1, "limit": 50 } }
```

Helper functions in `src/lib/api-response.ts`:

- `apiSuccess(data)` — 200 with data
- `apiError(message)` — 400 with error
- `apiUnauthorized()` — 401
- `apiForbidden()` — 403

## External Service Integrations

**Stripe** (`src/lib/stripe.ts`):

- `stripe.checkout.sessions.create()` — booking payment
- `stripe.refunds.create()` — booking cancellation
- Webhook: `src/app/api/stripe/webhook` → ProcessPaymentIntent

**Resend** (`src/lib/notifications.ts`):

- `resend.emails.send()` → booking confirmation, reminders, cancellation

**Twilio** (`src/lib/notifications.ts`):

- `client.messages.create()` → SMS notifications (lazy-loaded)

**Vercel Blob** (`src/lib/blob.ts`):

- `put()` — upload images, receipts, maintenance photos
- `del()` — delete files

**Neon Serverless** (`src/lib/prisma.ts`):

- Prisma adapter for edge-compatible queries

---

**Last Updated**: 2026-03-28
