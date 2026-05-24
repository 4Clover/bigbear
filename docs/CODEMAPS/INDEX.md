<!-- Generated: 2026-03-28 | Files scanned: 12 | Token estimate: ~3500 -->

# Grizzly Codemaps — Architecture Overview

**Short-term rental property management** system for Big Bear cabin. Next.js 16, TypeScript, Prisma/PostgreSQL, Vercel.

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        Grizzly Platform                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐ │
│  │   PUBLIC     │  │    AUTH    │  │   OWNER    │  │ WORKER │ │
│  │   (Guests)   │  │  (Login)   │  │ Dashboard  │  │ Portal │ │
│  └──────────────┘  └────────────┘  └────────────┘  └────────┘ │
│                                                                │
│  Booking Flow   Email Auth       Finance & Maintenance Jobs   │
│  Gallery View   Role-Based       Calendar & Reviews           │
│  Reviews        Sessions                                      │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                    Server Actions + API Routes                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ✓ bookings       ✓ calendar     ✓ gallery     ✓ reviews      │
│  ✓ finance        ✓ maintenance  ✓ family      ✓ notifications│
│                                                                │
├────────────────────────────────────────────────────────────────┤
│              Core Libraries & Services                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Auth: Next-Auth 5 + Google/Resend                            │
│  DB: Prisma 7 + Neon PostgreSQL                               │
│  Payments: Stripe checkout + refund flows                     │
│  Storage: Vercel Blob (gallery, receipts, maintenance)        │
│  Rate Limit: Upstash Redis                                    │
│  Notifications: Resend (email) + Twilio (SMS)                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Related Codemaps

- **[architecture.md](./architecture.md)** — Route groups, auth flow, middleware chain
- **[backend.md](./backend.md)** — API routes, server actions, request/response patterns
- **[frontend.md](./frontend.md)** — Page tree, component hierarchy, React 19 patterns
- **[data.md](./data.md)** — Database schema, models, relationships, enums
- **[dependencies.md](./dependencies.md)** — External services, integrations, key libraries

## Key Statistics

| Area            | Files | Purpose                                                    |
| --------------- | ----- | ---------------------------------------------------------- |
| Server Actions  | 9     | Core business logic (bookings, finance, maintenance, etc.) |
| Route Groups    | 4     | Public, Auth, Owner Dashboard, Worker Portal               |
| API Routes      | 12    | REST endpoints (Stripe webhook, cron, availability, etc.)  |
| Components      | 50+   | UI (charts, forms, galleries, PDFs)                        |
| Lib Files       | 22    | Auth, cache, errors, notifications, tokens                 |
| Database Models | 28    | Users, bookings, finance, maintenance, messaging           |

## Entry Points

- **Frontend**: `src/app/page.tsx` (public home → booking flow)
- **Auth**: `src/app/(auth)/login/page.tsx` (passwordless email)
- **Owner**: `src/app/owner/dashboard/page.tsx` (protected: OWNER role)
- **Worker**: `src/app/worker/jobs/page.tsx` (protected: WORKER role)
- **API**: `src/app/api/*/route.ts` (rate-limited, authenticated where needed)

## Auth Model

```
Guests (GUEST)
  → Can book, upload gallery images, submit reviews, message owner

Owners (OWNER)
  → Full access: bookings, calendar, finance, maintenance, workers, settings

Workers (WORKER)
  → Maintenance jobs, quotes, work completions, schedule, dashboard

Accountants (ACCOUNTANT)
  → Read-only: finance reports, transactions, tax categories

Auth Flow: Email (Resend) + Google OAuth → Session storage (Prisma) → Role checks via middleware
```

## Deployment

- **Hosting**: Vercel (Next.js 16 optimized)
- **Database**: Neon PostgreSQL (serverless, auto-scalable)
- **Adapter**: Prisma + Neon serverless adapter
- **Build**: pnpm build → `next build` → Node.js runtime
- **Env**: .env.local (development), Vercel secrets (production)

---

**Last Updated**: 2026-03-28 | **Maintained by**: Codebase Snapshot
