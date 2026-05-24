<!-- Generated: 2026-03-28 | Files scanned: 3 | Token estimate: ~900 -->

# Architecture Codemap

## System Layers

```
┌─────────────────────────────────────────┐
│        Next.js 16 App Router            │ src/app/
├─────────────────────────────────────────┤
│  Route Groups + Pages + Components      │
├─────────────────────────────────────────┤
│  src/proxy.ts (Global Auth Guard)       │ Defense-in-depth for /owner, /worker
├─────────────────────────────────────────┤
│  Server Actions (src/actions/*.ts)      │ Business logic with auth/validation
├─────────────────────────────────────────┤
│  API Routes (src/app/api/*/route.ts)    │ REST endpoints with route-gates
├─────────────────────────────────────────┤
│  Libraries (src/lib/)                   │ Auth, cache, errors, services
├─────────────────────────────────────────┤
│  Prisma Client + Neon Serverless        │ PostgreSQL database
├─────────────────────────────────────────┤
│  External Services                      │ Stripe, Resend, Twilio, Vercel Blob
└─────────────────────────────────────────┘
```

## Route Groups

| Group  | Path       | Purpose                                   | Auth       | Entry Point        |
| ------ | ---------- | ----------------------------------------- | ---------- | ------------------ |
| Public | `(public)` | Guests: home, booking, gallery, contact   | None       | `/`                |
| Auth   | `(auth)`   | Login form, email verification            | None       | `/login`           |
| Owner  | `owner`    | Dashboard, bookings, finance, maintenance | OWNER      | `/owner/dashboard` |
| Worker | `worker`   | Jobs, quotes, schedule, dashboard         | WORKER     | `/worker/jobs`     |
| API    | `api`      | REST endpoints, webhooks, cron jobs       | Role/Token | `/api/*`           |

## Auth & Authorization Flow

```
Request → src/proxy.ts (global guard)
           ↓
       Check session (req.auth)
           ↓
       /owner/* → OWNER? → proxy → layout.tsx → page.tsx
       /worker/* → WORKER? → proxy → layout.tsx → page.tsx
       /api/* → route-gates (authenticatedRoute, publicRoute, cronRoute)
           ↓
       ✓ Allowed → Next()
       ✗ Denied → Redirect to /login
```

**Key Guard Functions** (`src/lib/auth/guards.ts`):

- `assertOwner()` — throws if not OWNER
- `assertWorker()` — throws if not WORKER
- `assertAccountant()` — throws if not ACCOUNTANT
- `assertAuthenticated()` — throws if unauthenticated

**Auth Config** (`src/lib/auth.ts`):

- Providers: Google (email_verified required) + Resend (passwordless email)
- Adapter: PrismaAdapter for session storage
- Session: database strategy, 30-day maxAge
- Callbacks: role injection, Google email verification

## Middleware Chain

1. **proxy.ts** — Routes → /owner, /worker redirect to login if unauthenticated
2. **Route handler guards** — API routes use `authenticatedRoute()` wrapper
3. **Server actions** — `secureAction()` wrapper combines auth + Zod validation
4. **Layout-level checks** — Secondary guards in `src/app/owner/layout.tsx`, `src/app/worker/layout.tsx`

## Token-Based Guest Access

Three token systems for guest-only pages without full auth:

| Token         | Purpose               | Path              | Issued by                  | Verified by |
| ------------- | --------------------- | ----------------- | -------------------------- | ----------- |
| Gallery Token | Guest photo uploads   | `/gallery/upload` | `src/lib/gallery-token.ts` | API route   |
| Review Token  | Post-stay reviews     | `/review`         | `src/lib/review-token.ts`  | API route   |
| Family Token  | Family member invites | `/family/join`    | `src/lib/family-token.ts`  | API route   |

Tokens are signed JWT, sent via email, validated on each request.

## Cache & Invalidation

**Centralized tags** (`src/lib/cache/invalidation.ts`):

```
CacheTags: gallery, bookings, maintenance, finance, calendar, notifications, reviews
```

**Domain invalidation helpers**:

- `invalidateGallery()` → revalidate tag + /owner/gallery, /gallery paths
- `invalidateBookings()` → revalidate tag + /owner/bookings, /owner/dashboard paths
- `invalidateMaintenance()` → revalidate tag + /owner/maintenance, /worker/jobs paths
- Etc.

Used in server actions to bust caches on mutations.

## Key Dependencies

| Package            | Version       | Purpose                             |
| ------------------ | ------------- | ----------------------------------- |
| next-auth          | 5.0.0-beta.30 | Passwordless auth (Resend + Google) |
| @prisma/client     | 7.6.0         | Database ORM                        |
| stripe             | 20.4.1        | Payment processing                  |
| @upstash/ratelimit | 2.0.8         | Rate limiting (Redis)               |
| @vercel/blob       | 2.3.2         | Image storage                       |
| resend             | 6.9.4         | Email notifications                 |
| twilio             | 5.13.1        | SMS (lazy-loaded)                   |
| zod                | 4.3.6         | Schema validation                   |

---

**Last Updated**: 2026-03-28
