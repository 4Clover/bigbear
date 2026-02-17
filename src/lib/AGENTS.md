# INFRASTRUCTURE LAYER

14 modules providing core infrastructure. No barrel files — import each module directly.

## STRUCTURE

| Module              | Purpose                                                                         | Centrality                              |
| ------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `prisma.ts`         | DB client singleton + Decimal→number conversion                                 | **CRITICAL** (20 imports)               |
| `auth.ts`           | NextAuth v5 config, Resend provider, Prisma adapter                             | **CRITICAL** (10 imports)               |
| `auth/guards.ts`    | `assertOwner`, `assertWorker`, `assertOwnerOrAccountant`, `assertOwnerOrWorker` | **CRITICAL** (7 imports)                |
| `format.ts`         | `formatCurrency`, `formatDate`, `formatPercentage`                              | HIGH (8 imports)                        |
| `notifications.ts`  | Email (Resend) + SMS (Twilio) — 639 lines, 11 send functions                    | HIGH (4 imports)                        |
| `stripe.ts`         | Stripe client via lazy-load Proxy pattern                                       | HIGH (4 imports)                        |
| `env.ts`            | Zod-validated env vars; singleton `env()` getter                                | MEDIUM (3 imports)                      |
| `rate-limit.ts`     | Upstash Redis + in-memory fallback; predefined RATE_LIMITS                      | MEDIUM (3 imports)                      |
| `security.ts`       | `validateExternalUrl` (SSRF), `escapeHtml` (XSS)                                | MEDIUM (3 imports)                      |
| `errors.ts`         | AppError hierarchy (6 classes + isAppError guard)                               | **UNUSED** — defined but never imported |
| `blob.ts`           | Vercel Blob `deleteBlob` wrapper                                                | LOW (1 import)                          |
| `utils/calendar.ts` | `isDateRangeAvailable`, `getUnavailableDates`, `formatICalDate`                 | MEDIUM (3 imports)                      |
| `utils/refund.ts`   | `calculateRefund` with tiered refund policy                                     | LOW (1 import)                          |
| `ui/status.ts`      | Status→Badge variant Record maps (8 maps)                                       | LOW (2 imports)                         |

> **Underutilized modules**: `errors.ts` (never thrown), `ui/status.ts` (components duplicate color maps inline), `utils/calendar.ts` (availability logic embedded in API routes instead)

## WHERE TO LOOK

| Task             | Module             | Notes                                                            |
| ---------------- | ------------------ | ---------------------------------------------------------------- |
| Add auth guard   | `auth/guards.ts`   | Follow pattern: `auth()` → check role → throw or return session  |
| Add notification | `notifications.ts` | Add send function; always non-blocking with `.catch(() => {})`   |
| Add env var      | `env.ts`           | Add to Zod schema; validated at startup via `instrumentation.ts` |
| Add rate limit   | `rate-limit.ts`    | Add preset to `RATE_LIMITS`; use `checkRateLimit()` in API route |
| Add formatting   | `format.ts`        | Keep stateless, return strings                                   |
| Add error class  | `errors.ts`        | Extend `AppError`; NOTE: currently unused by actions             |

## CONVENTIONS

- **Singletons**: Prisma uses `globalThis` cache; Stripe uses Proxy; Twilio uses conditional init
- **Lazy loading**: Stripe and Twilio initialized only on first use (not at import time)
- **No circular deps**: Only `auth/guards.ts → auth.ts` internal dependency
- **Prisma extension**: Auto-converts Decimal→number on ALL query results (transparent to callers)
- **Rate limit fallback**: In-memory for dev, Upstash required in production (throws if missing)
- **Env validation**: Twilio vars are all-or-nothing (0 or 3 set); ICAL_SECRET ≠ CRON_SECRET

## ANTI-PATTERNS

- **NEVER** import Stripe directly — use the lazy proxy from `stripe.ts`
- **NEVER** construct Prisma client outside `prisma.ts` — use the singleton
- **NEVER** skip `validateExternalUrl()` when accepting user-provided URLs (SSRF risk)
- **NEVER** use in-memory rate limiting in production (unreliable across serverless instances)
