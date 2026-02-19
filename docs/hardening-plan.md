# Hardening Audit Checklist

**Project**: Big Bear Cabin Rental (Next.js 16 + TypeScript + Prisma/PostgreSQL + Stripe)  
**Baseline Date**: 2026-02-18  
**Status**: All items pending — baseline scaffold  
**Total Phases**: 8 (Phase 0 through Phase 7 + Final)

---

## Pre-Migration SQL Queries

Run these queries BEFORE applying any database migrations to establish baseline state:

```sql
-- Check for duplicate paymentIntentIds (must be 0 before adding unique constraint)
SELECT "paymentIntentId", COUNT(*) FROM "Booking"
WHERE "paymentIntentId" IS NOT NULL
GROUP BY "paymentIntentId"
HAVING COUNT(*) > 1;

-- Check btree_gist availability (required for exclusion constraints)
SELECT * FROM pg_available_extensions WHERE name = 'btree_gist';

-- Verify no overlapping blocked dates (baseline for Phase 3 constraint)
SELECT bd1.id, bd2.id FROM "BlockedDate" bd1
JOIN "BlockedDate" bd2 ON bd1.id < bd2.id
WHERE NOT (bd1."endDate" <= bd2."startDate" OR bd2."endDate" <= bd1."startDate");

-- Count current StripeEvent records (should be 0 before Phase 2)
SELECT COUNT(*) FROM "StripeEvent";

-- Identify all direct process.env access (Phase 5 scope)
-- Run via grep: grep -r "process\.env\." src/ --include="*.ts" --include="*.tsx"
```

---

## Phase 0: Foundation & Audit

**Goal**: Establish baseline, logging infrastructure, and test scaffolding  
**Status**: Pending  
**Acceptance Criteria**: All items below marked complete

### Phase 0 Checklist

- [ ] **T1: Create hardening test directory**
  - **File Target**: `tests/hardening/`
  - **Scope**: Create directory structure for hardening-specific tests
  - **Acceptance**: Directory exists with `README.md` documenting test organization
  - **Test Coverage**: N/A (scaffolding)

- [ ] **T2: Add HARDENING-AUDIT logging**
  - **File Target**: `src/lib/logging.ts` (new)
  - **Scope**: Create audit logger for hardening phases
  - **Acceptance**: Logger exports `auditLog()` function; logs to `HARDENING-AUDIT` channel
  - **Test Coverage**: `tests/hardening/logging.test.ts`

- [ ] **T3: Create hardening audit checklist (this document)**
  - **File Target**: `docs/hardening-plan.md`
  - **Scope**: Document all 8 phases with file targets and acceptance criteria
  - **Acceptance**: Document complete with pre-migration SQL queries
  - **Test Coverage**: N/A (documentation)

---

## Phase 1: Auth Hardening

**Goal**: Normalize auth guards, fix worker data scope, ensure consistent auth patterns  
**Status**: Pending  
**Acceptance Criteria**: All worker actions scoped correctly; no auth bypass vectors

### Phase 1 Checklist

- [ ] **T4: Normalize auth guard usage**
  - **File Targets**:
    - `src/lib/auth/guards.ts` (review + standardize)
    - `src/actions/maintenance.ts` (18 functions)
    - `src/actions/bookings.ts` (review scope)
  - **Scope**: Ensure all guards follow pattern: `auth()` → role check → throw or return session
  - **Acceptance**: All guards consistent; no `assertOwner()` calls in worker-only actions
  - **Test Coverage**: `tests/hardening/auth-guards.test.ts`

- [ ] **T5: Fix worker data scope in maintenance.ts**
  - **File Targets**: `src/actions/maintenance.ts` (lines 20-62, 64-120)
  - **Scope**: Ensure workers can only access their own jobs/quotes/completions
  - **Acceptance**: All worker queries filtered by `workerProfile.id`; no cross-worker data leaks
  - **Test Coverage**: `tests/hardening/worker-scope.test.ts`

- [ ] **T6: Add authz matrix tests**
  - **File Targets**: `tests/hardening/authz-matrix.test.ts` (new)
  - **Scope**: Test all role combinations (OWNER, GUEST, WORKER, ACCOUNTANT) against protected actions
  - **Acceptance**: Matrix covers 4 roles × 15 maintenance actions = 60 test cases
  - **Test Coverage**: 100% of auth guard combinations

---

## Phase 2: Payment Idempotency

**Goal**: Prevent duplicate payment processing, add StripeEvent model, implement 3-state webhook machine  
**Status**: Pending  
**Acceptance Criteria**: Webhook is idempotent; duplicate events produce same result

### Phase 2 Checklist

- [ ] **T7: Add StripeEvent model to schema**
  - **File Target**: `prisma/schema.prisma` (new model)
  - **Scope**: Create StripeEvent model with natural PK (Stripe evt_xxx ID)
  - **Schema**:
    ```prisma
    model StripeEvent {
      id        String   @id  // evt_xxx from Stripe
      type      String        // checkout.session.completed, etc.
      status    String   @default("pending")  // pending, processed, failed
      payload   Json
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt

      @@index([type, status])
      @@index([createdAt])
    }
    ```
  - **Acceptance**: Model added; migration created
  - **Test Coverage**: N/A (schema)

- [ ] **T8: Implement webhook 3-state machine**
  - **File Target**: `src/app/api/stripe/webhook/route.ts` (lines 22-220)
  - **Scope**: Implement idempotent webhook: pending → processed → failed
  - **Logic**:
    1. Check if event already processed (StripeEvent.id exists)
    2. If yes, return 200 (idempotent)
    3. If no, create StripeEvent with status=pending
    4. Process event (booking creation, etc.)
    5. Update StripeEvent to status=processed
  - **Acceptance**: Duplicate webhook calls produce same result; no double-bookings
  - **Test Coverage**: `tests/hardening/webhook-idempotency.test.ts`

- [ ] **T9: Add unique constraint on Booking.paymentIntentId**
  - **File Target**: `prisma/schema.prisma` (Booking model, line 128)
  - **Scope**: Add `@unique` to paymentIntentId field
  - **Pre-Migration Check**: Run SQL query above to verify no duplicates
  - **Acceptance**: Migration applies cleanly; constraint prevents duplicate payments
  - **Test Coverage**: `tests/hardening/payment-uniqueness.test.ts`

- [ ] **T10: Fix webhook N+1 addon queries**
  - **File Target**: `src/app/api/stripe/webhook/route.ts` (lines 152-166)
  - **Scope**: Batch addon lookups instead of loop
  - **Current**: Loop with `tx.addon.findUnique()` for each addon
  - **Fixed**: Single `tx.addon.findMany({ where: { id: { in: addonIds } } })`
  - **Acceptance**: Single query instead of N queries
  - **Test Coverage**: `tests/hardening/webhook-performance.test.ts`

---

## Phase 3: Database Performance & Constraints

**Goal**: Add exclusion constraint for blocked dates, fix N+1 queries, add missing indexes  
**Status**: Pending  
**Acceptance Criteria**: No overlapping blocked dates; query performance baseline established

### Phase 3 Checklist

- [ ] **T11: Add btree_gist extension and exclusion constraint**
  - **File Target**: `prisma/schema.prisma` (BlockedDate model, line 167)
  - **Scope**: Add PostgreSQL exclusion constraint to prevent overlapping dates
  - **Pre-Migration Check**: Run SQL query above to verify btree_gist available
  - **Migration SQL**:
    ```sql
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    ALTER TABLE "BlockedDate" ADD CONSTRAINT no_overlapping_dates
      EXCLUDE USING gist (
        tsrange("startDate", "endDate") WITH &&
      );
    ```
  - **Acceptance**: Constraint prevents overlapping blocked dates at DB level
  - **Test Coverage**: `tests/hardening/blocked-date-constraint.test.ts`

- [ ] **T12: Add missing indexes**
  - **File Target**: `prisma/schema.prisma` (multiple models)
  - **Scope**: Add indexes for common query patterns
  - **Targets**:
    - `Booking`: index on `(guestId, status)` for guest booking queries
    - `Booking`: index on `(checkIn, checkOut)` for availability checks
    - `MaintenanceJob`: index on `(assignedWorkerId, status)` for worker job queries
    - `Quote`: index on `(workerId, submittedAt)` for worker quote queries
    - `WorkCompletion`: index on `(workerId, submittedAt)` for worker completion queries
  - **Acceptance**: All indexes created; query plans verified
  - **Test Coverage**: `tests/hardening/index-coverage.test.ts`

- [ ] **T13: Fix N+1 queries in maintenance.ts**
  - **File Target**: `src/actions/maintenance.ts` (lines 40-62, 57-62)
  - **Scope**: Batch queries instead of loops
  - **Examples**:
    - `getAssignedJobs`: Include quotes/completions in single query
    - `getWorkerQuotes`: Include job details in single query
  - **Acceptance**: No nested loops with DB queries
  - **Test Coverage**: `tests/hardening/maintenance-n1.test.ts`

- [ ] **T14: Fix N+1 queries in bookings.ts**
  - **File Target**: `src/actions/bookings.ts` (review for loops)
  - **Scope**: Batch addon/transaction queries
  - **Acceptance**: Single query per action, not per item
  - **Test Coverage**: `tests/hardening/bookings-n1.test.ts`

- [ ] **T15: Add query performance baseline**
  - **File Target**: `tests/hardening/performance-baseline.test.ts` (new)
  - **Scope**: Measure query counts and execution time for critical paths
  - **Acceptance**: Baseline established; no regressions in Phase 4+
  - **Test Coverage**: Performance assertions on key actions

---

## Phase 4: Transaction Safety

**Goal**: Wrap finance and maintenance operations in atomic transactions  
**Status**: Pending  
**Acceptance Criteria**: No partial state updates; all-or-nothing semantics

### Phase 4 Checklist

- [ ] **T16: Wrap finance operations in $transaction**
  - **File Target**: `src/actions/finance.ts` (all mutation actions)
  - **Scope**: Wrap expense/receipt CRUD in `prisma.$transaction()`
  - **Pattern**:
    ```typescript
    const result = await prisma.$transaction(async (tx) => {
      // All DB operations here
      // If any throw, entire transaction rolls back
    })
    ```
  - **Acceptance**: All finance mutations atomic; no orphaned receipts
  - **Test Coverage**: `tests/hardening/finance-transactions.test.ts`

- [ ] **T17: Wrap maintenance operations in $transaction**
  - **File Target**: `src/actions/maintenance.ts` (quote submission, job assignment, completion)
  - **Scope**: Wrap multi-step operations (e.g., quote + job status update)
  - **Acceptance**: No partial state; quote and job status always consistent
  - **Test Coverage**: `tests/hardening/maintenance-transactions.test.ts`

---

## Phase 5: Environment & Endpoint Security

**Goal**: Centralize env var access, harden iCal endpoint, prevent SSRF attacks  
**Status**: Pending  
**Acceptance Criteria**: All env vars accessed via `env()` function; no direct `process.env` access

### Phase 5 Checklist

- [ ] **T18: Centralize process.env access**
  - **File Target**: `src/lib/env.ts` (already exists, lines 1-114)
  - **Scope**: Audit all 10 production files using direct `process.env` access
  - **Files to Audit**:
    - `src/app/api/stripe/webhook/route.ts` (line 31)
    - `src/lib/stripe.ts` (if exists)
    - `src/lib/notifications.ts` (if exists)
    - `src/lib/auth.ts` (if exists)
    - Other files with direct access
  - **Acceptance**: All files use `env()` function; no direct `process.env` access
  - **Test Coverage**: `tests/hardening/env-centralization.test.ts`

- [ ] **T19: Harden iCal endpoint**
  - **File Target**: `src/app/api/calendar/ical/route.ts`
  - **Scope**: Validate ICAL_SECRET token; prevent SSRF via icalUrl
  - **Changes**:
    - Validate Bearer token matches `env().ICAL_SECRET`
    - Validate CalendarSync.icalUrl with `validateExternalUrl()`
    - Rate limit to 10 req/min per IP
  - **Acceptance**: Endpoint requires valid token; no SSRF vectors
  - **Test Coverage**: `tests/hardening/ical-security.test.ts`

- [ ] **T20: Prevent SSRF in calendar sync**
  - **File Target**: `src/app/api/cron/calendar-sync/route.ts`
  - **Scope**: Validate all external URLs before fetching
  - **Changes**:
    - Call `validateExternalUrl()` on CalendarSync.icalUrl
    - Whitelist allowed domains (optional)
    - Add timeout (30s max)
  - **Acceptance**: No SSRF attacks possible; external URLs validated
  - **Test Coverage**: `tests/hardening/ssrf-prevention.test.ts`

---

## Phase 6: Code Health & Zod Compliance

**Goal**: Fix deprecated Zod patterns, remove unsafe type casts, standardize error handling  
**Status**: Pending  
**Acceptance Criteria**: No deprecated Zod calls; no `as any` in production code

### Phase 6 Checklist

- [ ] **T21: Fix Zod v4 error handling**
  - **File Targets**:
    - `src/actions/maintenance.ts` (line 81: `z.treeifyError()`)
    - `src/actions/calendar.ts` (if uses deprecated pattern)
    - `src/actions/finance.ts` (if uses deprecated pattern)
  - **Scope**: Verify all use `z.treeifyError()` (NOT `error.flatten()`)
  - **Note**: Zod v4 uses `treeifyError()` — do NOT swap to `flatten()`
  - **Acceptance**: All error handling uses correct Zod v4 API
  - **Test Coverage**: `tests/hardening/zod-compliance.test.ts`

- [ ] **T22: Remove unsafe type casts**
  - **File Targets**:
    - `src/actions/gallery.ts` (if has `as any` or `as unknown`)
    - `src/app/api/stripe/webhook/route.ts` (line 100: `as string`)
  - **Scope**: Replace unsafe casts with proper type guards
  - **Example**: `session.payment_intent as string` → validate type first
  - **Acceptance**: No `as any`, `@ts-ignore`, or `@ts-expect-error` in production
  - **Test Coverage**: `tests/hardening/type-safety.test.ts`

---

## Phase 7: Test Expansion

**Goal**: Expand test coverage for concurrency, cron dedup, and edge cases  
**Status**: Pending  
**Acceptance Criteria**: 80%+ coverage on critical paths; concurrency tests pass

### Phase 7 Checklist

- [ ] **T23: Add concurrency tests**
  - **File Target**: `tests/hardening/concurrency.test.ts` (new)
  - **Scope**: Test race conditions (simultaneous bookings, quote submissions, etc.)
  - **Scenarios**:
    - Two guests booking same dates simultaneously
    - Two workers submitting quotes for same job
    - Concurrent payment webhook + manual booking creation
  - **Acceptance**: All race conditions handled correctly
  - **Test Coverage**: 100% of concurrent paths

- [ ] **T24: Add cron deduplication tests**
  - **File Target**: `tests/hardening/cron-dedup.test.ts` (new)
  - **Scope**: Test that cron jobs don't duplicate work if triggered multiple times
  - **Scenarios**:
    - Calendar sync called twice in 1 minute (should deduplicate)
    - Reminder cron called twice (should send once)
  - **Acceptance**: Cron jobs idempotent; no duplicate notifications
  - **Test Coverage**: 100% of cron paths

- [ ] **T25: Add edge case tests**
  - **File Target**: `tests/hardening/edge-cases.test.ts` (new)
  - **Scope**: Test boundary conditions and error paths
  - **Scenarios**:
    - Booking with 0 guests
    - Negative prices
    - Dates in past
    - Missing required fields
    - Concurrent deletions
  - **Acceptance**: All edge cases handled gracefully
  - **Test Coverage**: 100% of error paths

---

## Phase 8 (Final): Verification & Compliance

**Goal**: Verify all phases complete, code quality passes, QA smoke tests pass  
**Status**: Pending  
**Acceptance Criteria**: All 25 tasks complete; no regressions; scope fidelity verified

### Phase 8 Checklist

- [ ] **F1: Verify plan compliance**
  - **Scope**: Confirm all 25 tasks (T1-T25) marked complete
  - **Acceptance**: 100% task completion; no skipped items
  - **Verification**: `grep -c "^- \[x\]" docs/hardening-plan.md` >= 25

- [ ] **F2: Code quality verification**
  - **Scope**: Run linter, type checker, and test suite
  - **Commands**:
    ```bash
    pnpm lint          # ESLint (strict + stylistic TypeScript)
    pnpm typecheck      # tsc --noEmit
    pnpm test:run       # Vitest single run
    pnpm test:coverage  # Coverage report (target: 80%+)
    ```
  - **Acceptance**: All checks pass; no warnings; coverage >= 80%

- [ ] **F3: QA smoke tests**
  - **Scope**: Manual verification of critical user flows
  - **Flows**:
    - Guest booking flow (checkout → payment → confirmation)
    - Worker job assignment (quote → assignment → completion)
    - Owner finance dashboard (expense creation → report generation)
    - Calendar sync (iCal import → blocked dates)
  - **Acceptance**: All flows work end-to-end; no errors

- [ ] **F4: Scope fidelity check**
  - **Scope**: Verify hardening did not introduce unintended changes
  - **Checks**:
    - No new user-facing features added
    - No schema changes beyond hardening scope
    - No API contract changes
    - No breaking changes to existing actions
  - **Acceptance**: Hardening is pure security/performance; no feature creep

---

## Summary

| Phase | Name                    | Tasks   | Status  | File Targets                                                                                      |
| ----- | ----------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------- |
| 0     | Foundation              | T1-T3   | Pending | `tests/hardening/`, `src/lib/logging.ts`, `docs/hardening-plan.md`                                |
| 1     | Auth Hardening          | T4-T6   | Pending | `src/lib/auth/guards.ts`, `src/actions/maintenance.ts`                                            |
| 2     | Payment Idempotency     | T7-T10  | Pending | `prisma/schema.prisma`, `src/app/api/stripe/webhook/route.ts`                                     |
| 3     | DB Performance          | T11-T15 | Pending | `prisma/schema.prisma`, `src/actions/maintenance.ts`, `src/actions/bookings.ts`                   |
| 4     | Transaction Safety      | T16-T17 | Pending | `src/actions/finance.ts`, `src/actions/maintenance.ts`                                            |
| 5     | Env & Endpoint Security | T18-T20 | Pending | `src/lib/env.ts`, `src/app/api/calendar/ical/route.ts`, `src/app/api/cron/calendar-sync/route.ts` |
| 6     | Code Health             | T21-T22 | Pending | `src/actions/maintenance.ts`, `src/actions/gallery.ts`, `src/app/api/stripe/webhook/route.ts`     |
| 7     | Test Expansion          | T23-T25 | Pending | `tests/hardening/` (new test files)                                                               |
| Final | Verification            | F1-F4   | Pending | All files                                                                                         |

**Total Tasks**: 29 (25 implementation + 4 final verification)  
**Estimated Duration**: 4-6 weeks (parallel waves)  
**Risk Level**: Low (no breaking changes; pure hardening)

---

## Notes

- All tasks are **pending** at baseline
- Pre-migration SQL queries must run before Phase 2 and Phase 3 migrations
- Phases can run in parallel within waves (see learnings.md for dependency graph)
- Each task includes specific file targets and acceptance criteria
- Test coverage target: 80%+ on critical paths
- No semicolons (Prettier enforced); use `import type` for type-only imports
- All env vars accessed via `env()` function, not direct `process.env`
- Zod v4 uses `z.treeifyError()` (NOT `error.flatten()`)
