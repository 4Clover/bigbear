Full-Stack Audit Report — Grizzly (2026-03-29)

---

Domain A — Infrastructure

next.config.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ MED │ script-src 'unsafe-inline' permanently allowed in CSP │ Replace with nonce-based CSP via next/headers or │
│ │ │ **webpack_nonce** │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ MED │ style-src 'unsafe-inline' unconditional — may be unnecessary if Tailwind │ Verify runtime style injection; remove if not needed │
│ │ output is static CSS │ │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ LOW │ No turbopack: {} config block — dev/prod parity gaps are implicit │ Add explicit block as home for future Turbopack │
│ │ │ rules │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ LOW │ No experimental.optimizePackageImports for lucide-react, date-fns │ Add to reduce client bundle size │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ LOW │ Hard-coded LAN IP 192.168.4.103 in allowedDevOrigins committed to repo │ Move to .env.development.local │
└──────────┴─────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

---

prisma.config.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ LOW │ Migration datasource falls back to pooled DATABASE_URL when DIRECT_URL is absent. Neon │ Require DIRECT_URL explicitly; throw at │
│ │ pooled endpoints reject DDL — migrations would silently fail │ config load if missing │
└──────────┴─────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────┘

---

src/lib/prisma.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ HIGH │ createPrismaClient() called synchronously at module evaluation time — any import triggers │ Lazy-initialize on first query via │
│ │ full Zod env parse; crashes on edge/test runtimes │ getter pattern │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ │ Adapter selection via neon.tech/neon.database string match on connection URL — breaks with │ Select adapter via explicit env var │
│ MED │ proxy, PgBouncer, or custom domains; silently falls back to PrismaPg causing connection │ (`DATABASE_ADAPTER=neon │
│ │ exhaustion on Vercel │ │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ │ convertDecimals extension applies Object.entries traversal to every query result — │ Apply per-query or at DTO │
│ MED │ O(n×depth) on all reads; also silently loses precision for large Decimal values via Number │ serialization boundary only │
│ │ conversion │ │
└──────────┴─────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────┘

---

src/lib/env.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
│ MED │ OWNER_EMAIL is required but visually grouped under optional fields — causes confusing │ Move to required block or add section │
│ │ startup crash with no indication of which field is missing │ comment │
├──────────┼───────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
│ MED │ validatedEnv module-level singleton can't be reset between Vitest runs — tests │ Export resetEnvCache() or document │
│ │ mutating process.env see stale cached values │ vi.resetModules() requirement │
├──────────┼───────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
│ LOW │ AUTH_URL is .optional() — a misconfigured production URL is silently accepted │ Add .refine() requiring it in production │
├──────────┼───────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
│ LOW │ console.error in validateEnv() — prohibited by project style │ Replace with structured logger or annotate │
│ │ │ exception │
└──────────┴───────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────┘

---

src/proxy.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ │ proxy.ts is never imported — no middleware.ts exists at root or src/. Route │ Create src/middleware.ts re-exporting export { │
│ CRITICAL │ protection is entirely non-functional; /owner/_ and /worker/_ are accessible │ proxy as default, config } from './proxy' │
│ │ without auth │ immediately │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ ACCOUNTANT role has no branch in the proxy matcher — silently redirected to │ Add ACCOUNTANT branch or comment acknowledging │
│ │ homepage │ exclusion │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ Wrong-role redirect goes to / with no explanation │ Redirect to /unauthorized page │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ LOW │ callbackUrl includes raw req.nextUrl.search — sensitive tokens/IDs written to │ Strip or allowlist query params before appending │
│ │ session cookie and server logs │ │
└──────────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘

Domain A Summary

┌───────────────┬───────┬───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Severity │ Count │ Top Priority Fix │
├───────────────┼───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH/CRITICAL │ 4 │ src/proxy.ts never wired as middleware — all route protection is dead code. Create src/middleware.ts. │
├───────────────┼───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED │ 8 │ prisma.ts synchronous init at import time crashes edge/test runtimes │
├───────────────┼───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW │ 7 │ env.ts test cache not resettable; prisma.config.ts silent DDL fallback │
└───────────────┴───────┴───────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

Domain B — Auth & Security Layer

src/lib/auth.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ HIGH │ allowDangerousEmailAccountLinking: true — Google OAuth can silently take over an │ Remove unless explicitly required; implement │
│ │ existing email/password account; account takeover vector │ user-initiated linking if needed │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ MED │ AUTHORIZED_ADMIN_EMAILS missing silently produces no OWNER role with no error │ Log warning at startup or validate presence │
│ │ │ in env.ts │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ LOW │ 30-day session maxAge for a financial/access-control tool │ Reduce to 7 days │
└──────────┴─────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────┘

---

src/lib/auth/guards.ts

┌──────────┬──────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ MED │ Guards throw plain new Error('Unauthorized') — not discriminable from other errors; │ Throw AppError with 401 status from │
│ │ no structured error type │ src/lib/errors.ts │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ LOW │ Each guard calls auth() independently — duplicate DB lookups if multiple guards fire │ Accept pre-fetched session as optional │
│ │ per request │ parameter │
└──────────┴──────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────┘

---

src/lib/auth/secure-action.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ │ handler(...) call is not wrapped in try/catch — uncaught exceptions (Prisma │ Wrap in try/catch; return { success: false, │
│ MED │ constraint violations, network errors) bypass the ActionResult contract and may │ error: 'Unexpected error' }, log server-side │
│ │ leak raw messages to the client │ │
├──────────┼───────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ MED │ extractValidationError uses as cast on Zod treeified error — silently falls back │ Replace with error.issues[0]?.message ?? │
│ │ to 'Invalid input' if shape differs │ 'Invalid input' (typed) │
├──────────┼───────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ LOW │ secureFormAction documented in CLAUDE.md but not implemented anywhere in the │ Implement or remove from documentation │
│ │ codebase │ │
└──────────┴───────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘

---

src/lib/gallery-token.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ HIGH │ No token revocation or single-use enforcement — 30-day tokens cannot be │ Store token hash in DB with usedAt; check on │
│ │ invalidated after issue; valid after booking cancellation │ verify, or bind validity to booking status │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ payload as unknown as GalleryUploadTokenPayload — unchecked JWT payload shape │ Validate with Zod schema after jwtVerify │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ LOW │ AUTH_SECRET shared across all three token types — single compromise affects │ Consider separate secrets per token type │
│ │ all │ │
└──────────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘

---

src/lib/review-token.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ HIGH │ No single-use enforcement — 14-day token allows unlimited review │ Track use via jti in DB; reject reuse after first │
│ │ overwrites │ submission │
├──────────┼─────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ MED │ Same payload as unknown as ReviewTokenPayload cast │ Validate with Zod │
└──────────┴─────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┘

---

src/lib/family-token.ts

┌──────────┬──────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ │ No single-use enforcement — one emailed link creates unlimited $0 CONFIRMED bookings; no │ Implement single-use: store │
│ HIGH │ availability check in the route │ familyTokenHash on booking at creation; │
│ │ │ reject reuse │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ │ src/app/api/booking/family/route.ts: checkIn/checkOut defined as z.string() only — new │ Change to z.iso.datetime() with │
│ HIGH │ Date("arbitrary string") produces Invalid Date reaching Prisma; no checkOut > checkIn │ date-ordering refine │
│ │ guard │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ MED │ src/app/api/family/verify/route.ts — public unrated token verification endpoint usable │ Add checkRateLimit with tight window │
│ │ as enumeration oracle │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ MED │ payload as unknown as FamilyTokenPayload cast │ Validate with Zod │
└──────────┴──────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────┘

Domain B Summary

┌──────────┬───────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Severity │ Count │ Top Priority Fix │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH │ 5 │ Family token: single emailed link creates unlimited $0 confirmed bookings with no availability check │
│ │ │ (booking/family/route.ts + family-token.ts) │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED │ 9 │ secureAction propagates uncaught handler exceptions outside ActionResult contract │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW │ 5 │ secureFormAction documented but not implemented │
└──────────┴───────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

Domain C — Server Actions

src/actions/bookings.ts

┌──────────┬──────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ │ Stripe refund + DB update are two independent operations — DB failure │ Update DB status first in transaction, then call │
│ HIGH │ after Stripe charges leaves financial state split (money returned, │ Stripe; or record refund intent atomically before │
│ │ booking still CONFIRMED) │ calling Stripe │
├──────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ HIGH │ All three mutations use raw revalidatePath — bookings cache tag never │ Replace with invalidateBookings() │
│ │ invalidated │ │
├──────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ MED │ No input validation on bookingId, reason parameters │ Add z.string().min(1) schema before DB access │
├──────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ MED │ initiatedBy: 'owner' default param still user-supplied on public │ Hardcode 'owner' server-side; remove parameter │
│ │ endpoint — reaches booking notes │ │
├──────────┼──────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ LOW │ Raw new Error('Booking not found') — use NotFoundError from │ │
│ │ src/lib/errors.ts │ │
└──────────┴──────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘

---

src/actions/calendar.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ HIGH │ All 5 mutations use revalidatePath directly — calendar tag never revalidated │ Replace all with invalidateCalendar() │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ MED │ blockDates Zod schema constructed inside function body on every call │ Hoist to module scope │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ MED │ addCalendarSync accepts raw name/icalUrl with no Zod validation │ Add schema with min/max length and URL │
│ │ │ validation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ MED │ unblockDates, removeCalendarSync, toggleCalendarSync — missing existence checks; │ Add findUnique + NotFoundError or catch │
│ │ Prisma P2025 escapes as raw error │ P2025 explicitly │
└──────────┴─────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────┘

---

src/actions/finance.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ │ updateTransaction passes raw data object directly to │ │
│ HIGH │ prisma.transaction.update with zero validation — any Prisma field can │ Add Zod schema for accepted update fields │
│ │ be mutated by a caller │ │
├──────────┼─────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ HIGH │ importExpensesFromCsv: findFirst duplicate-check inside $transaction │ Batch: collect all keys, one findMany with OR, build a │
│ │ loop = N sequential queries holding a Neon connection │ Set, then createMany for non-duplicates │
├──────────┼─────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ MED │ deleteTransaction: blob deletes run serially in a for loop │ Use Promise.all(receipts.map(r => │
│ │ │ deleteBlob(r.fileUrl).catch(...))) │
├──────────┼─────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ MED │ getTransactions where object cast via as Record<string, unknown> / as │ Type as Prisma.TransactionWhereInput │
│ │ Record<string, Date> — bypasses Prisma type safety │ │
├──────────┼─────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ MED │ getFinanceSummary: full expenseCategory row fetched when only id/name │ Add select: { id: true, name: true } │
│ │ needed │ │
├──────────┼─────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ LOW │ finance cache tag defined in CacheTags but no invalidateFinance() │ Create invalidateFinance() in invalidation.ts; use in all │
│ │ helper exists — tag never revalidated │ finance mutations │
└──────────┴─────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────┘

---

src/actions/maintenance.ts

┌──────────┬──────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ │ console.log('[HARDENING-AUDIT]', ...) in getMaintenanceJobs (lines 355–361) and │ │
│ HIGH │ getMaintenanceJob (lines 497–502) logs userId, userRole, filters, pagination to │ Remove both blocks immediately │
│ │ stdout on every invocation — PII in production logs │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ │ getMaintenanceJob (worker path) fetches full job record before checking │ Check authorization with a lean select: { │
│ HIGH │ assignedWorkerId !== workerProfile.id — one DB round-trip window where a worker │ assignedWorkerId: true } query first; fetch │
│ │ can observe unauthorized data │ full record only if authorized │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ HIGH │ inviteWorker: no input validation on data — email, name, phone, services all │ Add Zod schema with z.email(), │
│ │ unchecked before DB │ z.string().max(...), etc. │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ MED │ createMaintenanceJob passes raw data.\* to Prisma with no validation │ Add Zod schema │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ MED │ All maintenance mutations use raw revalidatePath — maintenance tag never │ Create invalidateMaintenance() and use it │
│ │ revalidated; no invalidateMaintenance() helper exists │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ MED │ Multiple functions independently query prisma.workerProfile.findUnique — │ Parallelize with Promise.all where job + │
│ │ sequential where Promise.all would suffice │ profile are fetched independently │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ MED │ getAvailableJobs: full rows fetched with no select — exposes internal notes to │ Add select scoped to worker-visible fields │
│ │ workers │ │
└──────────┴──────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

---

src/actions/reports.ts

┌──────────┬──────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ │ generateAnnualReport calls getMonthlyBreakdown(year) which issues a second │ Pass pre-fetched transactions into │
│ HIGH │ full-year transaction.findMany — redundant full-table scan on │ getMonthlyBreakdown or merge via groupBy │
│ │ already-fetched data │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ MED │ generateScheduleEReport: include: { receipts: true } fetches receipts never │ Remove receipts: true from include │
│ │ used in report logic │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ │ exportReportToCsv, generateMonthlyReport, generateAnnualReport: no │ Add z.number().int().min(2000).max(2100) / │
│ MED │ validation on year/month — negative or out-of-range values produce garbage │ z.number().int().min(1).max(12) │
│ │ date ranges │ │
└──────────┴──────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘

---

src/actions/gallery.ts

┌──────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
│ MED │ updateGalleryImage, approveGalleryImage, rejectGalleryImage call local revalidateGalleryPaths() │ Replace with │
│ │ instead of invalidateGallery() — gallery cache tag not revalidated on updates/approvals │ invalidateGallery() │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
│ MED │ reorderGalleryImages: orderedIds array has no max() length bound — unbounded N writes in $transaction │ Add .max(100) to array │
│ │ │ schema │
└──────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────┘

---

src/actions/reviews.ts

┌──────────┬────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ MED │ sendReviewInvite: new Resend(...) at module scope — crashes on import if │ Use lazy getter pattern (consistent with │
│ │ AUTH_RESEND_KEY absent │ family.ts) │
├──────────┼────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ MED │ sendReviewInvite URL built with unguarded appUrl — trailing slash produces │ Normalize appUrl with .replace(/\/$/, '') │
│ │ malformed URL │ │
└──────────┴────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────┘

---

✓ src/actions/family.ts — no significant issues
✓ src/actions/notifications.ts — minor: add z.nativeEnum(NotificationEvent) runtime check

Domain C Summary

┌──────────┬───────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Severity │ Count │ Top Priority Fix │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH │ 12 │ bookings.ts: Stripe refund + DB update not atomic — financial state can split; maintenance.ts: PII console.log on every │
│ │ │ read call │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED │ 22 │ finance.ts/maintenance.ts: missing Zod validation passes raw untrusted data directly to Prisma │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW │ 8 │ finance cache tag defined but invalidateFinance() never created — tag never revalidated in any mutation │
└──────────┴───────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Cross-cutting (6 of 9 files): bookings, calendar, finance, maintenance cache tags never revalidated via revalidateTag; invalidateFinance() and
invalidateMaintenance() helpers are missing entirely.

---

Domain D — API Routes & Caching

src/lib/api/route-gates.ts

┌──────────┬──────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ MED │ publicRoute wrapper documented in CLAUDE.md does not exist — three public routes │ Implement publicRoute(prefix, rateLimit, │
│ │ hand-roll identical rate-limiting boilerplate │ handler) or remove from docs │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ LOW │ authenticatedRoute returns 401 for both unauthenticated and wrong-role — HTTP │ Return 403 for role-mismatch case │
│ │ semantics violated │ │
└──────────┴──────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

---

src/lib/cache/invalidation.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ MED │ revalidateTag(tag, { expire: 0 }) — second argument is not part of the revalidateTag API │ Call revalidateTag(tag) with no │
│ │ and is silently ignored; intended immediate-expiry has no effect │ second argument │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ LOW │ maintenance and finance tags defined in CacheTags but no invalidateMaintenance() / │ Add missing helpers │
│ │ invalidateFinance() helpers exported │ │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┤
│ LOW │ CacheTags not exported — external callers cannot compose per-record domain:id tags that the │ Export CacheTags or remove per-id │
│ │ comment implies │ convention comment │
└──────────┴─────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────┘

---

src/lib/notifications.ts

┌──────────┬────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ │ Every notification function issues a separate prisma.notificationPreference.findUnique │ Batch all preference lookups in one │
│ HIGH │ — in a cron run triggering 3+ notifications, N independent DB round-trips │ findMany at cron call site; pass resolved │
│ │ │ prefs in │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ MED │ new Resend(...) at module scope (inconsistent with lazy Twilio pattern) — fails on │ Wrap in lazy getter │
│ │ import if key missing │ │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────┤
│ LOW │ logNotification never catches prisma.notificationLog.create errors — DB failure would │ Wrap in try/catch; log error silently │
│ │ surface as unhandled rejection │ │
└──────────┴────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────┘

---

src/lib/stripe.ts

┌──────────┬────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ LOW │ Proxy with as unknown as Record<...> cast defeats TypeScript type-checking │ Expose typed resource namespaces or document the │
│ │ on all Stripe API calls │ tradeoff explicitly │
└──────────┴────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

---

src/app/api/stripe/webhook/route.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ HIGH │ sendPaymentReceived(booking, OWNER_EMAIL).catch(...) is a floating promise │ Add void prefix for intent clarity; ensure response │
│ │ — Vercel may return before it resolves; notification silently dropped │ isn't sent until critical sends complete │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ MED │ bookingAddon.create called in for...of loop inside transaction — N │ Use tx.bookingAddon.createMany │
│ │ sequential writes │ │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ MED │ console.log/console.error throughout log PII (guestEmail, paymentIntentId, │ Replace with structured logger that can redact PII │
│ │ amounts) │ │
└──────────┴─────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

---

src/app/api/stripe/checkout/route.ts

┌──────────┬────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤
│ MED │ console.log('[HARDENING-AUDIT]', ...) logging price breakdown in production │ Remove debug artifact │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤
│ MED │ Route is disabled in comments but still deployed as live POST endpoint with no auth — real │ Delete file or return 404 │
│ │ attack surface │ immediately │
└──────────┴────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────┘

---

src/app/api/cron/reminders/route.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ MED │ Dedup sets built from all historical notificationLog with no date filter — unbounded │ Add createdAt: { gte: subDays(new │
│ │ full-table scan on every cron run as log grows │ Date(), 2) } filter │
└──────────┴───────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────┘

---

src/app/api/cron/calendar-sync/route.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ Does not use cronRoute wrapper — auth hand-rolled, duplicating route-gates.ts │ Refactor to use cronRoute │
│ │ logic │ │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ External iCal fetch accepts any Content-Type — large adversarial HTML fed to │ Validate Content-Type: text/calendar and add │
│ │ node-ical parser │ byte-length cap │
└──────────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘

---

src/app/api/booking/inquiry/route.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ │ totalAmount accepted from client body and reflected into owner notification email — │ Remove from schema; compute │
│ MED │ malicious caller submits totalAmount: 0.01 for a legitimate-looking fraudulent inquiry │ server-side from dates + pricing │
│ │ │ config │
└──────────┴───────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────┘

---

src/app/api/booking/family/route.ts

┌──────────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ HIGH │ No availability check before creating family booking — valid token creates │ Add isDateRangeAvailable check in transaction │
│ │ bookings on already-occupied dates │ before booking.create │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ findUnique + conditional create for user are non-transactional — concurrent │ Use upsert or wrap in $transaction │
│ │ requests can create duplicate users │ │
└──────────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘

---

src/app/api/availability/route.ts

┌──────────┬─────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ MED │ Most-polled public endpoint — two DB queries on every request with no caching; data only │ Wrap with unstable_cache tagged │
│ │ changes when invalidateCalendar() is called │ 'calendar' │
└──────────┴─────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────┘

---

src/app/api/pricing/route.ts & src/app/api/addons/route.ts

┌──────────┬───────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ MED │ No force-dynamic, no cache tags on frequently-read GET routes — │ Wrap with unstable_cache + appropriate invalidation tag │
│ │ changes invisible until redeployment │ called from mutation actions │
└──────────┴───────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────┘

---

✓ src/lib/rate-limit.ts — no issues
✓ src/app/api/contact/route.ts — no issues
✓ src/app/api/reports/csv/route.ts — no issues
✓ src/app/api/auth/[...nextauth]/route.ts — no issues

Domain D Summary

┌──────────┬───────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Severity │ Count │ Top Priority Fix │
├──────────┼───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH │ 3 │ booking/family/route.ts: no availability check — valid token creates overlapping confirmed bookings │
├──────────┼───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED │ 17 │ notifications.ts: N+1 notificationPreference query per function — batch into one findMany per cron invocation │
├──────────┼───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW │ 13 │ Four upload route onUploadCompleted callbacks each contain console.log + await Promise.resolve() no-op │
└──────────┴───────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

Domain E — Frontend & Rendering

src/app/(public)/layout.tsx

┌──────────┬──────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ │ await auth() on every request in the public layout forces the entire public │ Move auth to a dedicated async Header server │
│ HIGH │ route group dynamic — three pages with export const revalidate = 86400 are │ component; let static pages actually be static │
│ │ silently never ISR'd │ │
└──────────┴──────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

---

Worker Pages — worker/schedule/page.tsx, worker/quotes/page.tsx, worker/complete/[jobId]/page.tsx

┌──────────┬────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ │ All three are 'use client' pages fetching data via │ Convert to server components (like worker/jobs/page.tsx); fetch data │
│ HIGH │ useEffect — renders empty shell → client fetch → populate; │ at render time; pass as initial props to client subcomponents │
│ │ zero SSR data │ │
└──────────┴────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘

---

src/app/(public)/gallery/page.tsx & src/app/owner/gallery/page.tsx

┌──────────┬─────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ HIGH │ Both use force-dynamic — gallery changes infrequently; invalidateGallery() │ Replace with on-demand revalidation via cache tags; │
│ │ is already called on mutations │ remove force-dynamic │
└──────────┴─────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

---

src/app/(public)/contact/page.tsx

┌──────────┬───────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
│ MED │ Entire page is 'use client' just for form state — static info │ Extract form into ContactForm client component; keep │
│ │ column is pure markup │ surrounding layout as RSC │
└──────────┴───────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────┘

---

src/app/owner/bookings/page.tsx

┌──────────┬─────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ MED │ Two independent DB queries run sequentially │ Wrap in Promise.all([getBookings(params), prisma.booking.groupBy(...)]) │
└──────────┴─────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘

---

src/app/(public)/booking/success/page.tsx

┌──────────┬─────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼─────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ MED │ stripe.checkout.sessions.retrieve(session_id) called on every page load/refresh │ Wrap in unstable_cache keyed on session_id with │
│ │ with no caching │ short TTL (300s) │
└──────────┴─────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────┘

---

src/components/owner/BookingTable.tsx

┌──────────┬────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ MED │ Uses prompt() and confirm() for user interaction — blocking native │ Replace with ConfirmDialog (already used in GalleryManager) │
│ │ dialogs, broken on mobile │ and inline form fields │
└──────────┴────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘

---

src/components/owner/CalendarView.tsx

┌──────────┬──────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ MED │ Inline <style> block injected into DOM on every render with hardcoded light-mode │ Move to CSS module or global stylesheet with │
│ │ hex colors — no dark mode support │ dark mode variants │
└──────────┴──────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

---

src/components/owner/BookingFilters.tsx

┌──────────┬────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ MED │ Hardcoded stone-_/emerald-_ Tailwind classes and bg-white/border-stone-200 │ Replace with semantic design tokens (bg-card, │
│ │ break dark mode │ border-border, etc.) │
└──────────┴────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

---

src/components/finance/TaxesTransactionSheet.tsx

┌──────────┬──────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ MED │ Two sequential useEffects for categories + transactions when │ Combine into Promise.all([getExpenseCategories(), │
│ │ both are independent │ getTransactions(...)]) in single effect │
├──────────┼──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ MED │ debounceTimerRef never cleared on unmount — │ Add cleanup in effect return: │
│ │ flushPendingChanges runs against stale component │ clearTimeout(debounceTimerRef.current) │
└──────────┴──────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘

---

src/components/finance/TransactionTable.tsx

┌──────────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ Client-side getExpenseCategories() fetch duplicates server-side fetch already │ Pass categories as prop from parent; eliminate │
│ │ done in parent FinancePage │ redundant round-trip │
└──────────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘

---

src/components/gallery/PhotoCarousel.tsx

┌──────────┬────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ MED │ sizes="100vw" on every carousel image — browser requests │ Set sizes to match actual container width (e.g., │
│ │ full-viewport-width for all slides including non-visible ones │ "(max-width: 1280px) 100vw, 1280px") │
└──────────┴────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

---

src/components/gallery/GalleryManager.tsx

┌──────────┬──────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ MED │ Per-image handleApprove/handleReject/handleDelete callbacks recreated on every parent │ Memoize with useCallback │
│ │ state change — cards can't bail out │ │
├──────────┼──────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┤
│ MED │ Image with width={640} height={360} + w-full class — dimension hints conflict with CSS │ Use fill with positioned container of │
│ │ override │ known aspect ratio │
└──────────┴──────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────┘

---

src/app/owner/finance/taxes/page.tsx

┌──────────┬───────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐
│ Severity │ Finding │ Recommendation │
├──────────┼───────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
│ MED │ SchedulESummarySheet and BankStatementUpload eagerly bundled — loaded on │ Lazy-load with dynamic(..., { ssr: false }) like │
│ │ initial mount even when other tab is active │ TaxesTransactionSheet │
└──────────┴───────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘

---

✓ src/app/owner/dashboard/page.tsx — Promise.all with 5 queries, correct
✓ src/app/owner/calendar/page.tsx — Promise.all with 3 queries, correct
✓ src/app/owner/finance/page.tsx — Promise.all with 3 queries, correct
✓ src/app/(auth)/login/page.tsx — Suspense boundary correct
✓ src/components/booking/Calendar.tsx — useCallback used correctly
✓ src/components/booking/PriceSummary.tsx — pure RSC-compatible
✓ src/lib/format.ts — clean utility module
✓ src/lib/ui/status.ts — clean typed constants

Domain E Summary

┌──────────┬───────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Severity │ Count │ Top Priority Fix │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HIGH │ 5 │ Three worker pages (schedule, quotes, complete/[jobId]) are 'use client' with useEffect data fetching — convert to server │
│ │ │ components to eliminate empty-shell waterfalls │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED │ 22 │ (public)/layout.tsx await auth() makes all static pages dynamic, defeating three ISR exports │
├──────────┼───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW │ 13 │ as unknown as X double casts in worker/quotes, gallery/upload, owner/maintenance pages masking type mismatches │
└──────────┴───────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

Cross-Domain Summary

┌───────────────┬───────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Severity │ Total │ Highest Priority │
├───────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CRITICAL/HIGH │ 22 │ src/proxy.ts never registered as middleware — all route protection is non-functional; family token creates unlimited │
│ │ │ $0 bookings; allowDangerousEmailAccountLinking enables account takeover │
├───────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED │ 78 │ secureAction doesn't catch handler exceptions; bookings.ts Stripe+DB non-atomic; maintenance.ts PII logs on every │
│ │ │ read; N+1 notificationPreference queries per cron run │
├───────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LOW │ 46 │ invalidateFinance()/invalidateMaintenance() helpers missing; revalidateTag called with invalid second argument across │
│ │ │ all domain helpers │
└───────────────┴───────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Top 5 fixes by risk/impact:

1. Create src/middleware.ts — route protection is entirely dead without it
2. Family token single-use enforcement + availability check — unlimited free bookings
3. Remove allowDangerousEmailAccountLinking — account takeover via OAuth email match
4. Remove PII console.log from maintenance.ts — userId/role logged on every read in production
5. Convert 3 worker pages to server components — eliminates client-side data fetching waterfalls entirely
