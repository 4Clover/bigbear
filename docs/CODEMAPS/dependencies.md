<!-- Generated: 2026-03-28 | Files scanned: 1 | Token estimate: ~900 -->

# Dependencies Codemap — External Services & Libraries

## External Services

### Stripe (Payments)

**Lib**: `src/lib/stripe.ts`
**Key Uses**:

- `stripe.checkout.sessions.create()` — Create payment checkout for bookings
- `stripe.refunds.create()` — Issue refunds on cancellations
- Webhook: `src/app/api/stripe/webhook` validates `Stripe-Signature` header

**Data Flow**:

```
Booking form → /api/booking → stripe.checkout.sessions.create()
  → Guest pays on Stripe hosted checkout
  → Stripe webhook → /api/stripe/webhook
  → Verify signature → createTransaction() → confirm booking
```

### Resend (Email)

**Lib**: `src/lib/notifications.ts`
**Key Uses**:

- `resend.emails.send()` — All transactional email
- Booking confirmation, cancellation, reminders (check-in/out)
- Review invite, family invite, maintenance quotes

**Template Examples**:

```
RESEND_FROM_EMAIL: "noreply@property.com"
Templates: booking-confirm, booking-cancel, check-in-reminder, etc.
```

### Twilio (SMS)

**Lib**: `src/lib/notifications.ts` (lazy-loaded)
**Key Uses**:

- `client.messages.create()` — Optional SMS notifications
- Check-in/out reminders, maintenance alerts

**Configuration**:

```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

### Vercel Blob (File Storage)

**Lib**: `src/lib/blob.ts`
**Key Uses**:

- `put()` — Upload images (gallery, maintenance), receipts
- `del()` — Delete files

**Usage Locations**:

- Gallery image upload (`/gallery/upload`)
- Receipt uploads in finance
- Maintenance photo documentation

### Neon PostgreSQL (Database)

**Adapter**: `@prisma/adapter-neon`
**Lib**: `src/lib/prisma.ts`
**Key Features**:

- Serverless PostgreSQL
- Connection pooling via Neon proxy
- Automatic scaling
- Backup/restore capabilities

**Connection**:

```
DATABASE_URL="postgresql://[user]:[password]@[host]/[db]?sslmode=require"
Uses Neon serverless adapter for edge-compatible queries
```

### Upstash Redis (Rate Limiting)

**Lib**: `src/lib/rate-limit.ts`
**Key Uses**:

- Rate limit public endpoints (contact, booking)
- Window-based throttling (e.g., 5 requests/minute)

**Configuration**:

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

## Core Libraries

### Next.js 16

**Version**: 16.2.1
**Key Features Used**:

- App Router (route groups, layouts, pages)
- Server Actions ('use server')
- Proxy middleware (global route guards)
- Image optimization
- Font optimization

### React 19

**Version**: 19.2.4
**Key Hooks Used**:

- `useActionState()` — Form mutations with server actions
- `useOptimistic()` — Instant UI feedback
- RSC (React Server Components) for data fetching

### Next.js Auth (Auth.js 5)

**Version**: 5.0.0-beta.30
**Providers**:

- Google OAuth (requires email_verified)
- Resend (passwordless email)

**Adapter**: PrismaAdapter (session storage in database)

### Prisma 7

**Version**: 7.6.0
**Key Features**:

- Type-safe query builder
- PostgreSQL-specific features (JSON, arrays)
- Middleware for logging/auditing
- Auto-generated types for validation

### Zod 4

**Version**: 4.3.6
**Key Patterns**:

- Schema validation in server actions
- Type inference: `type Foo = z.infer<typeof fooSchema>`
- Lenient ID validation (coerce numeric strings)

### TypeScript 5

**Version**: 5.9.3
**Config**: Strict mode with extra checks

- `noUncheckedIndexedAccess`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`

### React Big Calendar

**Version**: 1.19.4
**Location**: `src/app/owner/calendar/page.tsx`
**Purpose**: Visual calendar for booking display + blocking dates

### Recharts

**Version**: 3.8.1
**Location**: `src/components/charts/`, `src/components/finance/`
**Charts Used**:

- LineChart — Revenue over time
- BarChart — Monthly income/expense
- PieChart — Expense breakdown by category
- AreaChart — Booking occupancy

### Date-fns

**Version**: 4.1.0
**Key Utilities**:

- Date formatting/parsing
- Date arithmetic (add days, subtract weeks)
- Calendar calculations for availability
- Timezone handling

### Radix UI + Tailwind

**Radix**: Base unstyled components (Button, Dialog, Dropdown, etc.)
**Tailwind**: 4.2.2 — Utility-first styling
**Custom UI**: `src/components/ui/` — Radix + Tailwind combinations

### Node-iCal

**Version**: 0.22.1
**Location**: `src/lib/utils/calendar.ts`
**Purpose**: Parse iCalendar format for calendar syncing

### Stripe SDK

**Version**: 20.4.1
**Endpoints Used**:

- checkout.sessions.\* (create, retrieve)
- refunds.create()
- events.retrieve() (webhook validation)

### Resend SDK

**Version**: 6.9.4
**Endpoints Used**:

- emails.send()
- No webhooks (status via API polling)

### Twilio SDK

**Version**: 5.13.1
**Clients Used**:

- rest.messages.create() for SMS

### Jose (JWT)

**Version**: 6.2.2
**Location**: Token libs (`gallery-token.ts`, `review-token.ts`, `family-token.ts`)
**Purpose**: Sign/verify JWTs for guest access tokens

### React PDF Renderer

**Version**: 4.3.2
**Location**: `src/components/pdf/`
**Purpose**: Generate PDF invoices, tax reports, quotes

### Upstash Rate Limit

**Version**: 2.0.8
**Location**: `src/lib/rate-limit.ts`
**Pattern**: Window-based rate limiting via Redis

## Testing Libraries

### Vitest

**Version**: 4.1.2
**Location**: `tests/`
**Test Categories**:

- `tests/unit/` — Function tests
- `tests/data-paths/` — Integration workflows
- `tests/patterns/` — Database patterns
- Coverage target: 80%+

### Vitest Mock Extended

**Version**: 3.1.0
**Purpose**: Mock Prisma client in tests
**Import**: `vitest-mock-extended`

### Testing Library React

**Version**: 16.3.2
**Purpose**: Component testing (React 19 support)

### Happy DOM

**Version**: 20.8.9
**Purpose**: Lightweight DOM implementation for tests

## Dev Dependencies

### ESLint + TypeScript ESLint

**Version**: 9.39.4
**Config**: Strict type-checked + stylistic rules
**Common Rules Enforced**:

- `no-floating-promises` — Must await or void promises
- `no-misused-promises` — No async event handlers
- `restrict-template-expressions` — No objects in template literals
- `consistent-type-imports` — Use import type for types
- `no-non-null-assertion` — No ! operator

### Prettier

**Version**: 3.8.1
**Purpose**: Code formatting (TS, JSX, JSON, Markdown)

### Husky + Lint Staged

**Purpose**: Pre-commit hooks

- Run ESLint on staged .ts/.tsx files
- Run Prettier on .json/.md/.css files

## Environment Variables

**Database**:

- `DATABASE_URL` — Neon PostgreSQL connection string

**Auth**:

- `AUTH_RESEND_KEY` — Resend API key
- `AUTH_SECRET` — NextAuth secret
- `AUTHORIZED_ADMIN_EMAILS` — Comma-separated list for OWNER role assignment
- Google OAuth: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

**Services**:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Notifications**:

- `RESEND_FROM_EMAIL` — Sender email for transactional mail

**Security**:

- `CRON_SECRET` — Verifies cron job requests from Vercel
- Token signing secrets (internally generated via Jose)

---

**Last Updated**: 2026-03-28
