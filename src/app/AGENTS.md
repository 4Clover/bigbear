# APP ROUTER ROUTES

Next.js 16 App Router with 4 route groups + API routes.

## STRUCTURE

```
app/
├── layout.tsx                    # Root: Geist fonts, ThemeProvider, metadata
├── (auth)/                       # Login/verify (no auth required)
│   ├── layout.tsx               # Centered card + theme toggle
│   ├── login/page.tsx           # Passwordless email via signIn('resend')
│   └── verify/page.tsx          # Email verification
├── (public)/                     # Guest-facing (no auth required)
│   ├── layout.tsx               # Header + Footer
│   ├── page.tsx                 # Homepage (hero, features, CTA)
│   ├── book/                    # Booking flow + BookingContent client component
│   ├── booking/success/         # Post-payment confirmation
│   ├── gallery/                 # Property photos
│   └── contact/                 # Contact form
├── owner/                        # OWNER dashboard (protected)
│   ├── layout.tsx               # Auth check + OwnerNav sidebar
│   ├── dashboard/               # Stats overview
│   ├── bookings/                # Booking management (?status= filter)
│   ├── calendar/                # CalendarPageClient + block dates
│   ├── finance/                 # Hub → expenses/, reports/ sub-routes
│   ├── maintenance/             # Job management
│   └── settings/                # Prefs → notifications/ sub-route
├── worker/                       # WORKER portal (protected)
│   ├── layout.tsx               # Auth check + WorkerNav sidebar
│   ├── jobs/                    # Available + assigned jobs (client component)
│   ├── schedule/                # Work schedule
│   ├── quotes/                  # Quote management
│   └── complete/[jobId]/        # Dynamic: job completion form
└── api/                          # API routes
    ├── auth/[...nextauth]/      # NextAuth handler
    ├── stripe/checkout/         # Create Stripe checkout session
    ├── stripe/webhook/          # Payment event processing
    ├── cron/calendar-sync/      # iCal sync (6h, Bearer auth)
    ├── cron/reminders/          # Booking reminders (daily, Bearer auth)
    ├── upload/receipts/         # Expense receipt uploads
    ├── upload/maintenance/      # Job photo uploads
    ├── calendar/ical/           # iCal feed export
    ├── availability/            # Rate-limited availability check
    ├── pricing/                 # Dynamic pricing
    ├── reports/csv/             # CSV export (owner-only)
    ├── reports/pdf/             # PDF generation (.tsx, @react-pdf/renderer)
    ├── contact/                 # Contact form (rate-limited)
    └── addons/                  # Available add-ons
```

## WHERE TO LOOK

| Task            | Location                                   | Notes                                                        |
| --------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Add owner page  | `owner/{feature}/page.tsx`                 | Auto-protected by proxy.ts + layout guard                    |
| Add worker page | `worker/{feature}/page.tsx`                | Auto-protected by proxy.ts + layout guard                    |
| Add public page | `(public)/{feature}/page.tsx`              | No auth needed; gets Header+Footer from layout               |
| Add API route   | `api/{feature}/route.ts`                   | Rate limit public; Bearer for cron; auth guard for protected |
| Add cron job    | `api/cron/{name}/route.ts` + `vercel.json` | Use CRON_SECRET Bearer auth; `force-dynamic`                 |

## CONVENTIONS

- **3-layer auth**: proxy.ts (global redirect) → layout.tsx (role check) → server action (guard)
- **No error.tsx/loading.tsx/not-found.tsx**: Error handling is inline; loading via client state
- **Metadata template**: Root sets `title.template: '%s | Big Bear Cabin'`
- **Server vs Client pages**: Most pages are server components; `/worker/jobs` is client (modal state)
- **Dynamic routes**: Only `/worker/complete/[jobId]` uses dynamic segments
- **Cron routes**: `export const dynamic = 'force-dynamic'`; validate `Authorization: Bearer ${CRON_SECRET}`
- **PDF route**: Uses `.tsx` extension for `@react-pdf/renderer` component rendering
- **Hub-and-spoke**: `finance/` and `settings/` are hub pages linking to sub-routes (expenses/, reports/, notifications/)
- **Query param filtering**: Dashboard links to bookings with `?status=PENDING`; bookings page reads `searchParams`
- **force-dynamic pages**: `booking/success` (Stripe session) and `settings/notifications` (real-time logs)

## ANTI-PATTERNS

- **NEVER** create middleware.ts — proxy.ts handles route protection
- **NEVER** skip layout auth guard even though proxy.ts exists (defense-in-depth)
- **NEVER** return sensitive data from server component queries (filter to DTOs)
